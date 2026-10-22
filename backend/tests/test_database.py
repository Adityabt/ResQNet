import sqlite3

import pytest

from app.database import (
    DEFAULT_RESOURCES,
    get_connection,
    init_db,
    transaction,
    utc_now_iso,
)


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "test.db"
    init_db(path)
    return path


def add_incident(conn):
    now = utc_now_iso()
    cursor = conn.execute(
        "INSERT INTO incidents (citizen_name, type, urgency, zone, created_at, updated_at) "
        "VALUES ('Ravi', 'MEDICAL', 4, 'Main Gate', ?, ?)",
        (now, now),
    )
    return cursor.lastrowid


def add_volunteer(conn, name):
    cursor = conn.execute(
        "INSERT INTO volunteers (name, joined_at) VALUES (?, ?)",
        (name, utc_now_iso()),
    )
    return cursor.lastrowid


def assign(conn, incident_id, volunteer_id):
    conn.execute(
        "INSERT INTO assignments (incident_id, volunteer_id, assigned_at) VALUES (?, ?, ?)",
        (incident_id, volunteer_id, utc_now_iso()),
    )


def test_default_resources_are_seeded(db_path):
    conn = get_connection(db_path)
    rows = conn.execute("SELECT name FROM resources").fetchall()
    conn.close()
    assert {row["name"] for row in rows} == {item[0] for item in DEFAULT_RESOURCES}


def test_init_db_is_idempotent(db_path):
    init_db(db_path)
    conn = get_connection(db_path)
    count = conn.execute("SELECT COUNT(*) AS n FROM resources").fetchone()["n"]
    conn.close()
    assert count == len(DEFAULT_RESOURCES)


def test_inventory_cannot_go_negative(db_path):
    conn = get_connection(db_path)
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("UPDATE resources SET available = -1 WHERE id = 1")
    conn.close()


def test_volunteer_cannot_hold_two_active_assignments(db_path):
    conn = get_connection(db_path)
    jiya = add_volunteer(conn, "Jiya")
    first = add_incident(conn)
    second = add_incident(conn)
    assign(conn, first, jiya)
    with pytest.raises(sqlite3.IntegrityError):
        assign(conn, second, jiya)
    conn.close()


def test_incident_cannot_have_two_active_volunteers(db_path):
    conn = get_connection(db_path)
    jiya = add_volunteer(conn, "Jiya")
    arun = add_volunteer(conn, "Arun")
    incident = add_incident(conn)
    assign(conn, incident, jiya)
    with pytest.raises(sqlite3.IntegrityError):
        assign(conn, incident, arun)
    conn.close()


def test_completed_assignment_frees_the_volunteer(db_path):
    conn = get_connection(db_path)
    jiya = add_volunteer(conn, "Jiya")
    first = add_incident(conn)
    second = add_incident(conn)
    assign(conn, first, jiya)
    conn.execute("UPDATE assignments SET completed_at = ? WHERE incident_id = ?", (utc_now_iso(), first))
    assign(conn, second, jiya)
    count = conn.execute("SELECT COUNT(*) AS n FROM assignments").fetchone()["n"]
    conn.close()
    assert count == 2


def test_transaction_rolls_back_on_error(db_path):
    with pytest.raises(RuntimeError):
        with transaction(db_path) as conn:
            conn.execute("UPDATE resources SET available = available - 1 WHERE id = 1")
            raise RuntimeError("simulated failure")
    conn = get_connection(db_path)
    row = conn.execute("SELECT total, available FROM resources WHERE id = 1").fetchone()
    conn.close()
    assert row["available"] == row["total"]