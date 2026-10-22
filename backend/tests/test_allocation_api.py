import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app

PIN = {"X-Coordinator-Pin": "2468"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "allocation.db")
    with TestClient(app) as test_client:
        yield test_client


def sos(**overrides):
    body = {
        "citizen_name": "Ravi",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "resources": [{"resource_id": 2, "quantity": 1}],
    }
    body.update(overrides)
    return body


def make_incident(client, **overrides):
    return client.post("/api/incidents", json=sos(**overrides)).json()["id"]


def join(client, name="Jiya"):
    return client.post("/api/volunteers", json={"name": name}).json()["id"]


def kit_available(client):
    resources = client.get("/api/resources").json()
    return next(item["available"] for item in resources if item["name"] == "Medical Kit")


def test_claim_assigns_volunteer_and_takes_stock(client):
    incident = make_incident(client)
    volunteer = join(client)
    response = client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ASSIGNED"
    assert body["volunteer_id"] == volunteer
    assert body["volunteer_name"] == "Jiya"
    assert kit_available(client) == 9
    assert client.get(f"/api/volunteers/{volunteer}").json()["status"] == "BUSY"


def test_second_claim_on_same_incident_is_rejected(client):
    incident = make_incident(client)
    jiya = join(client, "Jiya")
    arun = join(client, "Arun")
    assert client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": jiya}).status_code == 200
    second = client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": arun})
    assert second.status_code == 409


def test_busy_volunteer_cannot_claim_again(client):
    first = make_incident(client)
    second = make_incident(client)
    volunteer = join(client)
    client.post(f"/api/incidents/{first}/claim", json={"volunteer_id": volunteer})
    response = client.post(f"/api/incidents/{second}/claim", json={"volunteer_id": volunteer})
    assert response.status_code == 409


def test_claim_unknown_incident_or_volunteer_returns_404(client):
    incident = make_incident(client)
    volunteer = join(client)
    assert client.post("/api/incidents/999/claim", json={"volunteer_id": volunteer}).status_code == 404
    assert client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": 999}).status_code == 404


def test_volunteer_lifecycle_returns_stock_and_frees_volunteer(client):
    incident = make_incident(client)
    volunteer = join(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    en_route = client.post(
        f"/api/incidents/{incident}/status",
        json={"status": "EN_ROUTE", "volunteer_id": volunteer},
    )
    assert en_route.status_code == 200
    assert en_route.json()["status"] == "EN_ROUTE"
    resolved = client.post(
        f"/api/incidents/{incident}/status",
        json={"status": "RESOLVED", "volunteer_id": volunteer},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "RESOLVED"
    assert kit_available(client) == 10
    assert client.get(f"/api/volunteers/{volunteer}").json()["status"] == "FREE"


def test_other_volunteer_cannot_update_status(client):
    incident = make_incident(client)
    jiya = join(client, "Jiya")
    arun = join(client, "Arun")
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": jiya})
    response = client.post(
        f"/api/incidents/{incident}/status",
        json={"status": "EN_ROUTE", "volunteer_id": arun},
    )
    assert response.status_code == 403


def test_status_change_needs_an_identity(client):
    incident = make_incident(client)
    volunteer = join(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    response = client.post(f"/api/incidents/{incident}/status", json={"status": "EN_ROUTE"})
    assert response.status_code == 403


def test_coordinator_pin_can_update_any_incident(client):
    incident = make_incident(client)
    volunteer = join(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    response = client.post(
        f"/api/incidents/{incident}/status",
        json={"status": "EN_ROUTE"},
        headers=PIN,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "EN_ROUTE"


def test_unsupported_status_target_is_rejected(client):
    incident = make_incident(client)
    volunteer = join(client)
    response = client.post(
        f"/api/incidents/{incident}/status",
        json={"status": "PENDING", "volunteer_id": volunteer},
    )
    assert response.status_code == 422


def test_release_puts_incident_back_in_the_queue(client):
    incident = make_incident(client)
    volunteer = join(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    response = client.post(f"/api/incidents/{incident}/release", json={"volunteer_id": volunteer})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["volunteer_id"] is None
    assert kit_available(client) == 10


def test_cancelling_an_assigned_incident_frees_the_volunteer(client):
    incident = make_incident(client)
    volunteer = join(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    response = client.post(f"/api/incidents/{incident}/cancel")
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"
    assert kit_available(client) == 10
    assert client.get(f"/api/volunteers/{volunteer}").json()["status"] == "FREE"


def test_auto_allocate_requires_pin(client):
    assert client.post("/api/allocate").status_code == 401


def test_auto_allocate_assigns_by_priority(client):
    low = make_incident(client, urgency=2, resources=[])
    high = make_incident(client, urgency=5)
    join(client)
    response = client.post("/api/allocate", headers=PIN)
    assert response.status_code == 200
    result = response.json()
    assert [item["incident_id"] for item in result["assigned"]] == [high]
    assert [item["incident_id"] for item in result["skipped"]] == [low]


def test_assignment_is_recorded_in_the_event_log(client):
    incident = make_incident(client)
    volunteer = join(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    events = client.get("/api/admin/events", headers=PIN).json()
    assert "INCIDENT_ASSIGNED" in [event["event_type"] for event in events]