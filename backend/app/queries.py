import sqlite3
from datetime import datetime, timezone

from app.models import IncidentStatus
from app.priority import IncidentSnapshot, rank_incidents, score_breakdown

FINAL_STATUSES = {IncidentStatus.RESOLVED, IncidentStatus.CANCELLED}


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value)


def placeholders(count: int) -> str:
    return ",".join("?" * count)


def load_incident_resources(
    conn: sqlite3.Connection, incident_ids: list[int]
) -> dict[int, list[dict]]:
    if not incident_ids:
        return {}
    rows = conn.execute(
        "SELECT ir.incident_id, ir.resource_id, ir.quantity, r.name "
        "FROM incident_resources ir JOIN resources r ON r.id = ir.resource_id "
        f"WHERE ir.incident_id IN ({placeholders(len(incident_ids))}) "
        "ORDER BY r.criticality DESC, r.name",
        incident_ids,
    ).fetchall()
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["incident_id"], []).append(
            {
                "resource_id": row["resource_id"],
                "name": row["name"],
                "quantity": row["quantity"],
            }
        )
    return grouped


def load_active_volunteers(
    conn: sqlite3.Connection, incident_ids: list[int]
) -> dict[int, tuple[int, str]]:
    if not incident_ids:
        return {}
    rows = conn.execute(
        "SELECT a.incident_id, v.id AS volunteer_id, v.name "
        "FROM assignments a JOIN volunteers v ON v.id = a.volunteer_id "
        f"WHERE a.completed_at IS NULL AND a.incident_id IN ({placeholders(len(incident_ids))})",
        incident_ids,
    ).fetchall()
    return {row["incident_id"]: (row["volunteer_id"], row["name"]) for row in rows}


def snapshot_from_row(row: sqlite3.Row) -> IncidentSnapshot:
    return IncidentSnapshot(
        id=row["id"],
        urgency=row["urgency"],
        resource_score=row["resource_score"],
        created_at=parse_time(row["created_at"]),
    )


def to_incident_dict(row, breakdown, resources, assignment) -> dict:
    volunteer_id, volunteer_name = assignment if assignment else (None, None)
    return {
        "id": row["id"],
        "citizen_name": row["citizen_name"],
        "phone": row["phone"],
        "type": row["type"],
        "urgency": row["urgency"],
        "zone": row["zone"],
        "people_count": row["people_count"],
        "description": row["description"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "score": breakdown,
        "resources": resources,
        "volunteer_id": volunteer_id,
        "volunteer_name": volunteer_name,
    }


def build_incidents(
    conn: sqlite3.Connection, rows: list[sqlite3.Row], now: datetime | None = None
) -> list[dict]:
    now = now or datetime.now(timezone.utc)
    ids = [row["id"] for row in rows]
    resources = load_incident_resources(conn, ids)
    assigned = load_active_volunteers(conn, ids)
    rows_by_id = {row["id"]: row for row in rows}

    open_snapshots = []
    closed_rows = []
    for row in rows:
        if IncidentStatus(row["status"]) in FINAL_STATUSES:
            closed_rows.append(row)
        else:
            open_snapshots.append(snapshot_from_row(row))

    result = []
    for snapshot, _ in rank_incidents(open_snapshots, now):
        row = rows_by_id[snapshot.id]
        result.append(
            to_incident_dict(
                row,
                score_breakdown(snapshot, now),
                resources.get(row["id"], []),
                assigned.get(row["id"]),
            )
        )

    closed_rows.sort(key=lambda row: row["updated_at"], reverse=True)
    for row in closed_rows:
        frozen_at = parse_time(row["updated_at"])
        result.append(
            to_incident_dict(
                row,
                score_breakdown(snapshot_from_row(row), frozen_at),
                resources.get(row["id"], []),
                assigned.get(row["id"]),
            )
        )
    return result


def list_incidents(
    conn: sqlite3.Connection, status: IncidentStatus | None = None
) -> list[dict]:
    if status is None:
        rows = conn.execute("SELECT * FROM incidents").fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM incidents WHERE status = ?", (status.value,)
        ).fetchall()
    return build_incidents(conn, rows)


def get_incident(conn: sqlite3.Connection, incident_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM incidents WHERE id = ?", (incident_id,)
    ).fetchone()
    if row is None:
        return None
    return build_incidents(conn, [row])[0]