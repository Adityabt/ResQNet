import sqlite3
from datetime import datetime, timezone

from app.database import log_event, utc_now_iso
from app.models import IncidentStatus, VolunteerStatus, can_transition
from app.priority import rank_incidents
from app.queries import snapshot_from_row


class AllocationError(Exception):
    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _incident_row(conn: sqlite3.Connection, incident_id: int) -> sqlite3.Row:
    row = conn.execute(
        "SELECT * FROM incidents WHERE id = ?", (incident_id,)
    ).fetchone()
    if row is None:
        raise AllocationError("Incident not found", 404)
    return row


def _volunteer_row(conn: sqlite3.Connection, volunteer_id: int) -> sqlite3.Row:
    row = conn.execute(
        "SELECT * FROM volunteers WHERE id = ?", (volunteer_id,)
    ).fetchone()
    if row is None:
        raise AllocationError("Volunteer not found", 404)
    return row


def _requested(conn: sqlite3.Connection, incident_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT ir.resource_id, ir.quantity, r.name, r.available "
        "FROM incident_resources ir JOIN resources r ON r.id = ir.resource_id "
        "WHERE ir.incident_id = ? ORDER BY r.id",
        (incident_id,),
    ).fetchall()


def shortfalls(conn: sqlite3.Connection, incident_id: int) -> list[str]:
    return [
        f"{row['name']} (need {row['quantity']}, have {row['available']})"
        for row in _requested(conn, incident_id)
        if row["quantity"] > row["available"]
    ]


def _check_owner(
    conn: sqlite3.Connection, incident_id: int, as_volunteer: int | None
) -> None:
    if as_volunteer is None:
        return
    owner = conn.execute(
        "SELECT volunteer_id FROM assignments "
        "WHERE incident_id = ? AND completed_at IS NULL",
        (incident_id,),
    ).fetchone()
    if owner is None or owner["volunteer_id"] != as_volunteer:
        raise AllocationError("This incident is assigned to a different volunteer", 403)


def _assign(
    conn: sqlite3.Connection, incident_id: int, volunteer: sqlite3.Row, how: str
) -> None:
    now = utc_now_iso()
    for row in _requested(conn, incident_id):
        conn.execute(
            "UPDATE resources SET available = available - ? WHERE id = ?",
            (row["quantity"], row["resource_id"]),
        )
    conn.execute(
        "INSERT INTO assignments (incident_id, volunteer_id, assigned_at) VALUES (?, ?, ?)",
        (incident_id, volunteer["id"], now),
    )
    conn.execute(
        "UPDATE volunteers SET status = ? WHERE id = ?",
        (VolunteerStatus.BUSY.value, volunteer["id"]),
    )
    conn.execute(
        "UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?",
        (IncidentStatus.ASSIGNED.value, now, incident_id),
    )
    log_event(
        conn,
        "INCIDENT_ASSIGNED",
        "incident",
        incident_id,
        f"{volunteer['name']} ({how})",
    )


def _close_assignment(conn: sqlite3.Connection, incident_id: int, now: str) -> None:
    assignment = conn.execute(
        "SELECT id, volunteer_id FROM assignments "
        "WHERE incident_id = ? AND completed_at IS NULL",
        (incident_id,),
    ).fetchone()
    if assignment is None:
        return
    conn.execute(
        "UPDATE assignments SET completed_at = ? WHERE id = ?",
        (now, assignment["id"]),
    )
    conn.execute(
        "UPDATE volunteers SET status = ? WHERE id = ?",
        (VolunteerStatus.FREE.value, assignment["volunteer_id"]),
    )
    for row in _requested(conn, incident_id):
        conn.execute(
            "UPDATE resources SET available = available + ? WHERE id = ?",
            (row["quantity"], row["resource_id"]),
        )


def claim(conn: sqlite3.Connection, incident_id: int, volunteer_id: int) -> None:
    incident = _incident_row(conn, incident_id)
    volunteer = _volunteer_row(conn, volunteer_id)
    if incident["status"] != IncidentStatus.PENDING.value:
        raise AllocationError(f"Incident is already {incident['status']}")
    if volunteer["status"] != VolunteerStatus.FREE.value:
        raise AllocationError("Volunteer already has an active assignment")
    missing = shortfalls(conn, incident_id)
    if missing:
        raise AllocationError("Not enough stock: " + "; ".join(missing))
    _assign(conn, incident_id, volunteer, "claimed")


def release(
    conn: sqlite3.Connection, incident_id: int, as_volunteer: int | None
) -> None:
    incident = _incident_row(conn, incident_id)
    current = IncidentStatus(incident["status"])
    if not can_transition(current, IncidentStatus.PENDING):
        raise AllocationError(
            f"Only ASSIGNED incidents can be released, this one is {current.value}"
        )
    _check_owner(conn, incident_id, as_volunteer)
    now = utc_now_iso()
    _close_assignment(conn, incident_id, now)
    conn.execute(
        "UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?",
        (IncidentStatus.PENDING.value, now, incident_id),
    )
    log_event(conn, "INCIDENT_RELEASED", "incident", incident_id)


def change_status(
    conn: sqlite3.Connection,
    incident_id: int,
    new_status: IncidentStatus,
    as_volunteer: int | None,
) -> None:
    if new_status not in (IncidentStatus.EN_ROUTE, IncidentStatus.RESOLVED):
        raise AllocationError("Use claim, release or cancel for that change", 422)
    incident = _incident_row(conn, incident_id)
    current = IncidentStatus(incident["status"])
    if not can_transition(current, new_status):
        raise AllocationError(f"Cannot move from {current.value} to {new_status.value}")
    _check_owner(conn, incident_id, as_volunteer)
    now = utc_now_iso()
    if new_status == IncidentStatus.RESOLVED:
        _close_assignment(conn, incident_id, now)
    conn.execute(
        "UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?",
        (new_status.value, now, incident_id),
    )
    log_event(conn, f"INCIDENT_{new_status.value}", "incident", incident_id)


def cancel(conn: sqlite3.Connection, incident_id: int) -> None:
    incident = _incident_row(conn, incident_id)
    current = IncidentStatus(incident["status"])
    if not can_transition(current, IncidentStatus.CANCELLED):
        raise AllocationError(f"Cannot cancel an incident that is {current.value}")
    now = utc_now_iso()
    _close_assignment(conn, incident_id, now)
    conn.execute(
        "UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?",
        (IncidentStatus.CANCELLED.value, now, incident_id),
    )
    log_event(conn, "INCIDENT_CANCELLED", "incident", incident_id)


def auto_allocate(conn: sqlite3.Connection) -> dict:
    now = datetime.now(timezone.utc)
    pending = conn.execute(
        "SELECT * FROM incidents WHERE status = ?", (IncidentStatus.PENDING.value,)
    ).fetchall()
    ranked = rank_incidents([snapshot_from_row(row) for row in pending], now)
    free_volunteers = list(
        conn.execute(
            "SELECT * FROM volunteers WHERE status = ? ORDER BY id",
            (VolunteerStatus.FREE.value,),
        ).fetchall()
    )

    assigned = []
    skipped = []
    for snapshot, score in ranked:
        if not free_volunteers:
            skipped.append(
                {"incident_id": snapshot.id, "score": score, "reason": "No free volunteer"}
            )
            continue
        missing = shortfalls(conn, snapshot.id)
        if missing:
            skipped.append(
                {
                    "incident_id": snapshot.id,
                    "score": score,
                    "reason": "Needs resources: " + "; ".join(missing),
                }
            )
            continue
        volunteer = free_volunteers.pop(0)
        _assign(conn, snapshot.id, volunteer, "auto-allocate")
        assigned.append(
            {
                "incident_id": snapshot.id,
                "volunteer_id": volunteer["id"],
                "volunteer_name": volunteer["name"],
                "score": score,
            }
        )

    log_event(
        conn,
        "AUTO_ALLOCATE",
        "system",
        None,
        f"{len(assigned)} assigned, {len(skipped)} skipped",
    )
    return {"assigned": assigned, "skipped": skipped}