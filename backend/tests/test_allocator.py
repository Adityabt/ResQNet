import threading
from datetime import datetime, timedelta, timezone

import pytest

from app import allocator
from app.allocator import AllocationError
from app.database import get_connection, init_db, transaction, utc_now_iso
from app.models import IncidentStatus

BOAT = 1
KIT = 2
FOOD = 5


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "alloc.db"
    init_db(path)
    return path


def make_volunteer(conn, name="Jiya"):
    cursor = conn.execute(
        "INSERT INTO volunteers (name, joined_at) VALUES (?, ?)",
        (name, utc_now_iso()),
    )
    return cursor.lastrowid


def make_incident(conn, urgency=3, items=(), minutes_ago=0):
    created = (
        datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    ).isoformat(timespec="seconds")
    score = 1
    for resource_id, _ in items:
        row = conn.execute(
            "SELECT criticality FROM resources WHERE id = ?", (resource_id,)
        ).fetchone()
        score = max(score, row["criticality"])
    cursor = conn.execute(
        "INSERT INTO incidents (citizen_name, type, urgency, zone, resource_score, "
        "created_at, updated_at) VALUES ('Ravi', 'MEDICAL', ?, 'Main Gate', ?, ?, ?)",
        (urgency, score, created, created),
    )
    incident_id = cursor.lastrowid
    conn.executemany(
        "INSERT INTO incident_resources (incident_id, resource_id, quantity) VALUES (?, ?, ?)",
        [(incident_id, resource_id, quantity) for resource_id, quantity in items],
    )
    return incident_id


def run(db_path, action, *args):
    with transaction(db_path) as conn:
        return action(conn, *args)


def value(db_path, sql, params=()):
    conn = get_connection(db_path)
    result = conn.execute(sql, params).fetchone()[0]
    conn.close()
    return result


def incident_status(db_path, incident_id):
    return value(db_path, "SELECT status FROM incidents WHERE id = ?", (incident_id,))


def volunteer_status(db_path, volunteer_id):
    return value(db_path, "SELECT status FROM volunteers WHERE id = ?", (volunteer_id,))


def available(db_path, resource_id):
    return value(db_path, "SELECT available FROM resources WHERE id = ?", (resource_id,))


def test_claim_assigns_volunteer_and_consumes_stock(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn, items=[(KIT, 2)])
    volunteer = make_volunteer(conn)
    conn.close()
    run(db_path, allocator.claim, incident, volunteer)
    assert incident_status(db_path, incident) == "ASSIGNED"
    assert volunteer_status(db_path, volunteer) == "BUSY"
    assert available(db_path, KIT) == 8
    active = value(
        db_path, "SELECT COUNT(*) FROM assignments WHERE completed_at IS NULL"
    )
    assert active == 1


def test_busy_volunteer_cannot_claim_a_second_incident(db_path):
    conn = get_connection(db_path)
    first = make_incident(conn)
    second = make_incident(conn)
    volunteer = make_volunteer(conn)
    conn.close()
    run(db_path, allocator.claim, first, volunteer)
    with pytest.raises(AllocationError) as error:
        run(db_path, allocator.claim, second, volunteer)
    assert error.value.status_code == 409
    assert incident_status(db_path, second) == "PENDING"


def test_assigned_incident_cannot_be_claimed_again(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn)
    jiya = make_volunteer(conn, "Jiya")
    arun = make_volunteer(conn, "Arun")
    conn.close()
    run(db_path, allocator.claim, incident, jiya)
    with pytest.raises(AllocationError):
        run(db_path, allocator.claim, incident, arun)
    assert volunteer_status(db_path, arun) == "FREE"


def test_claim_with_insufficient_stock_changes_nothing(db_path):
    conn = get_connection(db_path)
    conn.execute("UPDATE resources SET available = 1 WHERE id = ?", (BOAT,))
    incident = make_incident(conn, items=[(BOAT, 2)])
    volunteer = make_volunteer(conn)
    conn.close()
    with pytest.raises(AllocationError) as error:
        run(db_path, allocator.claim, incident, volunteer)
    assert "Rescue Boat" in error.value.message
    assert incident_status(db_path, incident) == "PENDING"
    assert volunteer_status(db_path, volunteer) == "FREE"
    assert available(db_path, BOAT) == 1


def test_release_returns_incident_to_queue_and_restores_stock(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn, items=[(KIT, 2)])
    jiya = make_volunteer(conn, "Jiya")
    arun = make_volunteer(conn, "Arun")
    conn.close()
    run(db_path, allocator.claim, incident, jiya)
    run(db_path, allocator.release, incident, jiya)
    assert incident_status(db_path, incident) == "PENDING"
    assert volunteer_status(db_path, jiya) == "FREE"
    assert available(db_path, KIT) == 10
    run(db_path, allocator.claim, incident, arun)
    total_rows = value(db_path, "SELECT COUNT(*) FROM assignments")
    assert total_rows == 2


def test_full_lifecycle_frees_volunteer_and_stock(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn, items=[(KIT, 3)])
    volunteer = make_volunteer(conn)
    conn.close()
    run(db_path, allocator.claim, incident, volunteer)
    run(db_path, allocator.change_status, incident, IncidentStatus.EN_ROUTE, volunteer)
    assert incident_status(db_path, incident) == "EN_ROUTE"
    assert available(db_path, KIT) == 7
    run(db_path, allocator.change_status, incident, IncidentStatus.RESOLVED, volunteer)
    assert incident_status(db_path, incident) == "RESOLVED"
    assert volunteer_status(db_path, volunteer) == "FREE"
    assert available(db_path, KIT) == 10
    completed = value(
        db_path,
        "SELECT completed_at FROM assignments WHERE incident_id = ?",
        (incident,),
    )
    assert completed is not None


def test_steps_cannot_be_skipped(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn)
    volunteer = make_volunteer(conn)
    conn.close()
    run(db_path, allocator.claim, incident, volunteer)
    with pytest.raises(AllocationError) as error:
        run(db_path, allocator.change_status, incident, IncidentStatus.RESOLVED, volunteer)
    assert error.value.status_code == 409
    assert incident_status(db_path, incident) == "ASSIGNED"


def test_other_volunteer_cannot_update_the_incident(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn)
    jiya = make_volunteer(conn, "Jiya")
    arun = make_volunteer(conn, "Arun")
    conn.close()
    run(db_path, allocator.claim, incident, jiya)
    with pytest.raises(AllocationError) as error:
        run(db_path, allocator.change_status, incident, IncidentStatus.EN_ROUTE, arun)
    assert error.value.status_code == 403
    assert incident_status(db_path, incident) == "ASSIGNED"


def test_coordinator_can_override_ownership(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn)
    volunteer = make_volunteer(conn)
    conn.close()
    run(db_path, allocator.claim, incident, volunteer)
    run(db_path, allocator.change_status, incident, IncidentStatus.EN_ROUTE, None)
    assert incident_status(db_path, incident) == "EN_ROUTE"


def test_cancelling_an_assigned_incident_releases_everything(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn, items=[(BOAT, 2)])
    volunteer = make_volunteer(conn)
    conn.close()
    run(db_path, allocator.claim, incident, volunteer)
    assert available(db_path, BOAT) == 2
    run(db_path, allocator.cancel, incident)
    assert incident_status(db_path, incident) == "CANCELLED"
    assert volunteer_status(db_path, volunteer) == "FREE"
    assert available(db_path, BOAT) == 4


def test_finished_incident_cannot_be_cancelled(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn)
    volunteer = make_volunteer(conn)
    conn.close()
    run(db_path, allocator.claim, incident, volunteer)
    run(db_path, allocator.change_status, incident, IncidentStatus.EN_ROUTE, volunteer)
    run(db_path, allocator.change_status, incident, IncidentStatus.RESOLVED, volunteer)
    with pytest.raises(AllocationError) as error:
        run(db_path, allocator.cancel, incident)
    assert error.value.status_code == 409


def test_auto_allocate_gives_the_only_volunteer_to_the_highest_priority(db_path):
    conn = get_connection(db_path)
    low = make_incident(conn, urgency=2)
    high = make_incident(conn, urgency=5)
    make_volunteer(conn)
    conn.close()
    result = run(db_path, allocator.auto_allocate)
    assert [item["incident_id"] for item in result["assigned"]] == [high]
    assert [item["incident_id"] for item in result["skipped"]] == [low]
    assert result["skipped"][0]["reason"] == "No free volunteer"


def test_auto_allocate_skips_incidents_without_stock_and_continues(db_path):
    conn = get_connection(db_path)
    conn.execute("UPDATE resources SET available = 0 WHERE id = ?", (BOAT,))
    blocked = make_incident(conn, urgency=5, items=[(BOAT, 1)])
    fine = make_incident(conn, urgency=2, items=[(FOOD, 1)])
    make_volunteer(conn, "Jiya")
    make_volunteer(conn, "Arun")
    conn.close()
    result = run(db_path, allocator.auto_allocate)
    assert [item["incident_id"] for item in result["assigned"]] == [fine]
    assert [item["incident_id"] for item in result["skipped"]] == [blocked]
    assert "Rescue Boat" in result["skipped"][0]["reason"]
    assert incident_status(db_path, blocked) == "PENDING"


def test_auto_allocate_never_over_allocates_stock(db_path):
    conn = get_connection(db_path)
    oldest = make_incident(conn, urgency=3, items=[(BOAT, 2)], minutes_ago=12)
    middle = make_incident(conn, urgency=3, items=[(BOAT, 2)], minutes_ago=9)
    newest = make_incident(conn, urgency=3, items=[(BOAT, 2)], minutes_ago=6)
    for name in ("Jiya", "Arun", "Meena"):
        make_volunteer(conn, name)
    conn.close()
    result = run(db_path, allocator.auto_allocate)
    assert [item["incident_id"] for item in result["assigned"]] == [oldest, middle]
    assert [item["incident_id"] for item in result["skipped"]] == [newest]
    assert available(db_path, BOAT) == 0
    assert incident_status(db_path, newest) == "PENDING"


def test_auto_allocate_is_logged(db_path):
    conn = get_connection(db_path)
    make_incident(conn)
    make_volunteer(conn)
    conn.close()
    run(db_path, allocator.auto_allocate)
    summary = value(
        db_path, "SELECT COUNT(*) FROM event_log WHERE event_type = 'AUTO_ALLOCATE'"
    )
    assigned = value(
        db_path, "SELECT COUNT(*) FROM event_log WHERE event_type = 'INCIDENT_ASSIGNED'"
    )
    assert summary == 1
    assert assigned == 1


def test_concurrent_claims_assign_only_once(db_path):
    conn = get_connection(db_path)
    incident = make_incident(conn)
    first = make_volunteer(conn, "Jiya")
    second = make_volunteer(conn, "Arun")
    conn.close()
    barrier = threading.Barrier(2)
    outcomes = []

    def attempt(volunteer_id):
        barrier.wait()
        try:
            with transaction(db_path) as worker_conn:
                allocator.claim(worker_conn, incident, volunteer_id)
            outcomes.append("ok")
        except AllocationError:
            outcomes.append("rejected")

    threads = [threading.Thread(target=attempt, args=(vid,)) for vid in (first, second)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert sorted(outcomes) == ["ok", "rejected"]
    active = value(
        db_path, "SELECT COUNT(*) FROM assignments WHERE completed_at IS NULL"
    )
    assert active == 1