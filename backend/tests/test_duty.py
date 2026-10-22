import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app

PIN = {"X-Coordinator-Pin": "2468"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "duty.db")
    with TestClient(app) as test_client:
        yield test_client


def join(client, name="Jiya"):
    return client.post("/api/volunteers", json={"name": name}).json()["id"]


def make_incident(client):
    body = {
        "citizen_name": "Ravi",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "resources": [],
    }
    return client.post("/api/incidents", json=body).json()["id"]


def set_duty(client, volunteer, on_duty):
    return client.post(f"/api/volunteers/{volunteer}/duty", json={"on_duty": on_duty})


def test_volunteer_can_go_off_duty_and_back(client):
    volunteer = join(client)
    off = set_duty(client, volunteer, False)
    assert off.status_code == 200
    assert off.json()["status"] == "OFF_DUTY"
    on = set_duty(client, volunteer, True)
    assert on.json()["status"] == "FREE"


def test_off_duty_volunteer_cannot_claim(client):
    volunteer = join(client)
    incident = make_incident(client)
    set_duty(client, volunteer, False)
    response = client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    assert response.status_code == 409
    assert client.get(f"/api/incidents/{incident}").json()["status"] == "PENDING"


def test_auto_allocate_skips_off_duty_volunteers(client):
    volunteer = join(client)
    make_incident(client)
    set_duty(client, volunteer, False)
    result = client.post("/api/allocate", headers=PIN).json()
    assert result["assigned"] == []
    assert result["skipped"][0]["reason"] == "No free volunteer"


def test_busy_volunteer_cannot_change_duty(client):
    volunteer = join(client)
    incident = make_incident(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    assert set_duty(client, volunteer, False).status_code == 409
    assert client.get(f"/api/volunteers/{volunteer}").json()["status"] == "BUSY"


def test_duty_change_for_unknown_volunteer_returns_404(client):
    assert set_duty(client, 999, False).status_code == 404


def test_duty_changes_are_logged(client):
    volunteer = join(client)
    set_duty(client, volunteer, False)
    set_duty(client, volunteer, False)
    events = client.get("/api/admin/events", headers=PIN).json()
    off_duty_events = [event for event in events if event["event_type"] == "VOLUNTEER_OFF_DUTY"]
    assert len(off_duty_events) == 1