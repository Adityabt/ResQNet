import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app

PIN = {"X-Coordinator-Pin": "2468"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "api.db")
    with TestClient(app) as test_client:
        yield test_client


def sos(**overrides):
    body = {
        "citizen_name": "Ravi",
        "phone": "98765 43210",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "people_count": 2,
        "description": "Elderly person needs help",
        "resources": [{"resource_id": 2, "quantity": 1}],
    }
    body.update(overrides)
    return body


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_access_endpoints_expose_url_and_qr(client, monkeypatch):
    monkeypatch.setattr("app.main.get_access_url", lambda: "http://resqnet.local:8000")

    info = client.get("/api/access")
    qr = client.get("/api/access/qr.png")

    assert info.status_code == 200
    assert info.json() == {"url": "http://resqnet.local:8000"}
    assert qr.status_code == 200
    assert qr.headers["content-type"] == "image/png"
    assert qr.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_meta_lists_zones_and_types(client):
    data = client.get("/api/meta").json()
    assert "Main Gate" in data["zones"]
    assert "MEDICAL" in data["incident_types"]
    assert data["weights"] == {"urgency": 5, "waiting": 2, "resource": 3}


def test_create_incident_scores_and_stores(client):
    response = client.post("/api/incidents", json=sos())
    assert response.status_code == 201
    created = response.json()
    assert created["status"] == "PENDING"
    assert created["phone"] == "9876543210"
    assert created["score"] == {"urgency": 4, "waiting": 0, "resource": 5, "total": 35}
    assert created["resources"][0]["name"] == "Medical Kit"
    fetched = client.get(f"/api/incidents/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == created["id"]


def test_blank_citizen_name_is_rejected(client):
    response = client.post("/api/incidents", json=sos(citizen_name="   "))
    assert response.status_code == 422


def test_invalid_phone_is_rejected(client):
    response = client.post("/api/incidents", json=sos(phone="12ab"))
    assert response.status_code == 422


def test_unknown_zone_is_rejected(client):
    response = client.post("/api/incidents", json=sos(zone="Moon Base"))
    assert response.status_code == 422


def test_unknown_resource_returns_404(client):
    response = client.post(
        "/api/incidents", json=sos(resources=[{"resource_id": 99, "quantity": 1}])
    )
    assert response.status_code == 404


def test_quantity_above_total_stock_is_rejected(client):
    response = client.post(
        "/api/incidents", json=sos(resources=[{"resource_id": 2, "quantity": 11}])
    )
    assert response.status_code == 422


def test_incidents_are_listed_by_priority(client):
    low = client.post(
        "/api/incidents", json=sos(urgency=2, resources=[])
    ).json()
    high = client.post(
        "/api/incidents",
        json=sos(urgency=5, resources=[{"resource_id": 1, "quantity": 1}]),
    ).json()
    listed = client.get("/api/incidents").json()
    assert [item["id"] for item in listed] == [high["id"], low["id"]]
    assert listed[0]["score"]["total"] == 40
    assert listed[1]["score"]["total"] == 13


def test_status_filter_works(client):
    first = client.post("/api/incidents", json=sos()).json()
    client.post("/api/incidents", json=sos(citizen_name="Meena"))
    client.post(f"/api/incidents/{first['id']}/cancel")
    cancelled = client.get("/api/incidents", params={"status": "CANCELLED"}).json()
    pending = client.get("/api/incidents", params={"status": "PENDING"}).json()
    assert [item["id"] for item in cancelled] == [first["id"]]
    assert len(pending) == 1


def test_cancel_pending_incident(client):
    created = client.post("/api/incidents", json=sos()).json()
    first = client.post(f"/api/incidents/{created['id']}/cancel")
    assert first.status_code == 200
    assert first.json()["status"] == "CANCELLED"
    second = client.post(f"/api/incidents/{created['id']}/cancel")
    assert second.status_code == 409


def test_missing_incident_returns_404(client):
    assert client.get("/api/incidents/999").status_code == 404
    assert client.post("/api/incidents/999/cancel").status_code == 404


def test_volunteer_can_join_and_be_listed(client):
    response = client.post("/api/volunteers", json={"name": "Jiya"})
    assert response.status_code == 201
    assert response.json()["status"] == "FREE"
    listed = client.get("/api/volunteers").json()
    assert [item["name"] for item in listed] == ["Jiya"]


def test_blank_volunteer_name_is_rejected(client):
    response = client.post("/api/volunteers", json={"name": "  "})
    assert response.status_code == 422


def test_stock_update_requires_pin(client):
    body = {"total": 15}
    assert client.patch("/api/resources/2", json=body).status_code == 401
    wrong = client.patch("/api/resources/2", json=body, headers={"X-Coordinator-Pin": "0000"})
    assert wrong.status_code == 401


def test_stock_increase_raises_available(client):
    response = client.patch("/api/resources/2", json={"total": 15}, headers=PIN)
    assert response.status_code == 200
    assert response.json()["total"] == 15
    assert response.json()["available"] == 15


def test_stock_cannot_drop_below_allocated(client):
    conn = database.get_connection()
    conn.execute("UPDATE resources SET available = 4 WHERE id = 2")
    conn.close()
    too_low = client.patch("/api/resources/2", json={"total": 5}, headers=PIN)
    assert too_low.status_code == 409
    exact = client.patch("/api/resources/2", json={"total": 6}, headers=PIN)
    assert exact.status_code == 200
    assert exact.json()["available"] == 0


def test_admin_login(client):
    assert client.post("/api/admin/login", json={"pin": "2468"}).status_code == 200
    assert client.post("/api/admin/login", json={"pin": "1111"}).status_code == 401


def test_event_log_records_incident_creation(client):
    client.post("/api/incidents", json=sos())
    events = client.get("/api/admin/events", headers=PIN).json()
    assert "INCIDENT_CREATED" in [event["event_type"] for event in events]


def test_event_log_requires_pin(client):
    assert client.get("/api/admin/events").status_code == 401
