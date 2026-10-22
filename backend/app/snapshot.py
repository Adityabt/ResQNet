import sqlite3

from app.models import IncidentStatus
from app.queries import FINAL_STATUSES, list_incidents

MAX_CLOSED_INCIDENTS = 30
RECENT_EVENT_COUNT = 10
ANNOUNCEMENT_LIMIT = 20
PUBLIC_NAME = "Citizen"


def build_snapshot(conn: sqlite3.Connection) -> dict:
    open_incidents = []
    closed_incidents = []
    for incident in list_incidents(conn):
        if IncidentStatus(incident["status"]) in FINAL_STATUSES:
            closed_incidents.append(incident)
        else:
            open_incidents.append(incident)

    volunteers = conn.execute("SELECT * FROM volunteers ORDER BY id").fetchall()
    resources = conn.execute(
        "SELECT * FROM resources ORDER BY criticality DESC, name"
    ).fetchall()
    events = conn.execute(
        "SELECT * FROM event_log ORDER BY id DESC LIMIT ?", (RECENT_EVENT_COUNT,)
    ).fetchall()

    announcements = conn.execute(
        "SELECT * FROM announcements ORDER BY id DESC LIMIT ?", (ANNOUNCEMENT_LIMIT,)
    ).fetchall()

    return {
        "incidents": open_incidents + closed_incidents[:MAX_CLOSED_INCIDENTS],
        "volunteers": [dict(row) for row in volunteers],
        "resources": [dict(row) for row in resources],
        "events": [dict(row) for row in events],
        "announcements": [dict(row) for row in announcements],
    }


def redact_for_public(data: dict) -> dict:
    hidden = [
        {**incident, "phone": None, "citizen_name": PUBLIC_NAME}
        for incident in data["incidents"]
    ]
    return {**data, "incidents": hidden}