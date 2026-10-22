import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from app.config import DB_PATH
from app.models import IncidentStatus, VolunteerStatus


def _enum_values(enum_cls) -> str:
    return ", ".join(f"'{member.value}'" for member in enum_cls)


SCHEMA = f"""
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    total INTEGER NOT NULL CHECK (total >= 0),
    available INTEGER NOT NULL CHECK (available >= 0 AND available <= total),
    criticality INTEGER NOT NULL CHECK (criticality BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_name TEXT NOT NULL,
    phone TEXT,
    type TEXT NOT NULL,
    urgency INTEGER NOT NULL CHECK (urgency BETWEEN 1 AND 5),
    zone TEXT NOT NULL,
    people_count INTEGER NOT NULL DEFAULT 1 CHECK (people_count >= 1),
    description TEXT NOT NULL DEFAULT '',
    resource_score INTEGER NOT NULL DEFAULT 1 CHECK (resource_score BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ({_enum_values(IncidentStatus)})),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incident_resources (
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    PRIMARY KEY (incident_id, resource_id)
);

CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'FREE' CHECK (status IN ({_enum_values(VolunteerStatus)})),
    joined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL REFERENCES incidents(id),
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id),
    assigned_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_active_per_volunteer
    ON assignments(volunteer_id) WHERE completed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_active_per_incident
    ON assignments(incident_id) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);


CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARNING', 'CRITICAL')),
    created_at TEXT NOT NULL
);
"""


DEFAULT_RESOURCES = [
    ("Rescue Boat", 4, 5),
    ("Medical Kit", 10, 5),
    ("Life Jacket", 20, 4),
    ("Drinking Water", 100, 3),
    ("Food Pack", 60, 3),
    ("Blanket", 40, 2),
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path or DB_PATH, timeout=10, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def transaction(db_path: Path | str | None = None):
    conn = get_connection(db_path)
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    finally:
        conn.close()


def init_db(db_path: Path | str | None = None) -> None:
    conn = get_connection(db_path)
    try:
        conn.executescript(SCHEMA)
        conn.executemany(
            "INSERT OR IGNORE INTO resources (name, total, available, criticality) "
            "VALUES (?, ?, ?, ?)",
            [(name, total, total, crit) for name, total, crit in DEFAULT_RESOURCES],
        )
    finally:
        conn.close()


def log_event(
    conn: sqlite3.Connection,
    event_type: str,
    entity_type: str,
    entity_id: int | None = None,
    details: str = "",
) -> None:
    conn.execute(
        "INSERT INTO event_log (event_type, entity_type, entity_id, details, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (event_type, entity_type, entity_id, details, utc_now_iso()),
    )