from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.database import log_event, transaction
from app.deps import require_coordinator
from app.priority import resource_score

router = APIRouter(
    prefix="/api/demo", tags=["demo"], dependencies=[Depends(require_coordinator)]
)

DEMO_VOLUNTEERS = ["Aarav", "Diya", "Kabir", "Meera", "Rohan"]

# (name, phone, type, urgency, zone, people, description, minutes_ago, {resource: qty})
DEMO_INCIDENTS = [
    ("Ravi Kumar", "9876500001", "MEDICAL", 5, "Hostel Block A", 1,
     "Student collapsed, not responding", 14, {"Medical Kit": 1}),
    ("Ananya Rao", "9876500002", "RESCUE", 4, "Sports Ground", 6,
     "Group stuck behind rising water", 11, {"Rescue Boat": 1, "Life Jacket": 6}),
    ("Imran Sheikh", "9876500003", "MEDICAL", 3, "Library", 2,
     "Deep cut on arm, bleeding controlled", 9, {"Medical Kit": 1}),
    ("Sneha Iyer", None, "FOOD_WATER", 2, "Mess Hall", 40,
     "Drinking water has run out", 7, {"Drinking Water": 40}),
    ("Vikram Singh", "9876500005", "SHELTER", 3, "Hostel Block B", 12,
     "Ground floor flooded, need dry space", 5, {"Blanket": 12}),
    ("Pooja Nair", "9876500006", "RESCUE", 5, "Main Gate", 3,
     "Vehicle swept against the gate", 3, {"Rescue Boat": 1, "Life Jacket": 3}),
    ("Arjun Das", "9876500007", "FOOD_WATER", 1, "Academic Block", 15,
     "Food packs needed for evening", 2, {"Food Pack": 15}),
    ("Lakshmi Menon", "9876500008", "OTHER", 2, "Medical Centre", 1,
     "Generator failed, needs power backup", 1, {}),
]


def _volunteer_names(conn) -> set[str]:
    return {row["name"] for row in conn.execute("SELECT name FROM volunteers").fetchall()}


@router.post("/seed")
def seed_demo():
    now = datetime.now(timezone.utc)
    with transaction() as conn:
        resources = {
            row["name"]: row
            for row in conn.execute("SELECT id, name, criticality FROM resources").fetchall()
        }
        existing = _volunteer_names(conn)
        added_volunteers = 0
        for name in DEMO_VOLUNTEERS:
            if name in existing:
                continue
            conn.execute(
                "INSERT INTO volunteers (name, joined_at) VALUES (?, ?)",
                (name, now.isoformat(timespec="seconds")),
            )
            added_volunteers += 1

        added_incidents = 0
        for name, phone, kind, urgency, zone, people, text, minutes_ago, needs in DEMO_INCIDENTS:
            requested = [(resources[item], qty) for item, qty in needs.items() if item in resources]
            stamp = (now - timedelta(minutes=minutes_ago)).isoformat(timespec="seconds")
            cursor = conn.execute(
                "INSERT INTO incidents (citizen_name, phone, type, urgency, zone, "
                "people_count, description, resource_score, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    name, phone, kind, urgency, zone, people, text,
                    resource_score([row["criticality"] for row, _ in requested]),
                    stamp, stamp,
                ),
            )
            conn.executemany(
                "INSERT INTO incident_resources (incident_id, resource_id, quantity) "
                "VALUES (?, ?, ?)",
                [(cursor.lastrowid, row["id"], qty) for row, qty in requested],
            )
            added_incidents += 1

        log_event(
            conn,
            "DEMO_SEEDED",
            "system",
            None,
            f"{added_incidents} incidents, {added_volunteers} volunteers",
        )
    return {"incidents": added_incidents, "volunteers": added_volunteers}


@router.post("/reset")
def reset_demo():
    with transaction() as conn:
        conn.execute("DELETE FROM assignments")
        conn.execute("DELETE FROM incident_resources")
        conn.execute("DELETE FROM incidents")
        conn.execute("DELETE FROM volunteers")
        conn.execute("DELETE FROM announcements")
        conn.execute("DELETE FROM event_log")
        conn.execute("UPDATE resources SET available = total")
        log_event(conn, "DEMO_RESET", "system", None, "All incidents and volunteers cleared")
    return {"ok": True}