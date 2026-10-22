import pytest
from fastapi.testclient import TestClient

from app import database, sessions
from app.main import app
from app.routers import admin

PIN = "2468"
PIN_HEADER = {"X-Coordinator-Pin": PIN}
REMOTE = ("192.168.29.50", 50000)


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "center.db")
    admin.reset_login_limits()
    sessions.clear_all()
    with TestClient(app) as test_client:
        yield test_client


def test_seed_creates_demo_incidents_and_volunteers(client):
    response = client.post("/api/demo/seed", headers=PIN_HEADER)
    assert response.status_code == 200
    assert response.json() == {"incidents": 8, "volunteers": 5}
    assert len(client.get("/api/incidents", headers=PIN_HEADER).json()) == 8
    assert len(client.get("/api/volunteers").json()) == 5


def test_seeding_twice_does_not_duplicate_volunteers(client):
    client.post("/api/demo/seed", headers=PIN_HEADER)
    second = client.post("/api/demo/seed", headers=PIN_HEADER).json()
    assert second["volunteers"] == 0


def test_demo_allocation_assigns_by_priority(client):
    client.post("/api/demo/seed", headers=PIN_HEADER)
    result = client.post("/api/allocate", headers=PIN_HEADER).json()
    assert len(result["assigned"]) == 5
    assert result["assigned"][0]["score"] >= result["assigned"][-1]["score"]


def test_reset_clears_everything_and_restores_stock(client):
    client.post("/api/demo/seed", headers=PIN_HEADER)
    client.post("/api/allocate", headers=PIN_HEADER)
    assert client.post("/api/demo/reset", headers=PIN_HEADER).status_code == 200
    assert client.get("/api/incidents", headers=PIN_HEADER).json() == []
    assert client.get("/api/volunteers").json() == []
    for resource in client.get("/api/resources").json():
        assert resource["available"] == resource["total"]


def test_demo_controls_need_the_coordinator(client):
    assert client.post("/api/demo/seed").status_code == 401
    assert client.post("/api/demo/reset").status_code == 401


def test_remote_device_cannot_use_demo_or_export(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "remote.db")
    with TestClient(app, client=REMOTE) as remote:
        assert remote.post("/api/demo/seed", headers=PIN_HEADER).status_code == 403
        assert remote.get("/api/admin/export.csv", headers=PIN_HEADER).status_code == 403


def test_export_needs_the_coordinator_and_returns_csv(client):
    client.post("/api/demo/seed", headers=PIN_HEADER)
    assert client.get("/api/admin/export.csv").status_code == 401
    response = client.get("/api/admin/export.csv", headers=PIN_HEADER)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    lines = response.text.strip().splitlines()
    assert lines[0].startswith("id,created_at")
    assert len(lines) == 9
    assert "Ravi Kumar" in response.text


def test_export_neutralises_spreadsheet_formulas(client):
    body = {
        "citizen_name": "=HYPERLINK(1)",
        "type": "OTHER",
        "urgency": 1,
        "zone": "Library",
        "resources": [],
    }
    client.post("/api/incidents", json=body)
    text = client.get("/api/admin/export.csv", headers=PIN_HEADER).text
    assert "'=HYPERLINK(1)" in text


def test_public_incident_endpoints_hide_contact_details(client):
    body = {
        "citizen_name": "Ravi",
        "phone": "9876543210",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "resources": [],
    }
    created = client.post("/api/incidents", json=body).json()["id"]
    listed = client.get("/api/incidents").json()[0]
    single = client.get(f"/api/incidents/{created}").json()
    for incident in (listed, single):
        assert incident["phone"] is None
        assert incident["citizen_name"] == "Citizen"
    full = client.get(f"/api/incidents/{created}", headers=PIN_HEADER).json()
    assert full["phone"] == "9876543210"
    assert full["citizen_name"] == "Ravi"

def test_public_actions_do_not_return_contact_details(client):
    body = {
        "citizen_name": "Ravi",
        "phone": "9876543210",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "resources": [],
    }
    created = client.post("/api/incidents", json=body).json()["id"]
    cancelled = client.post(f"/api/incidents/{created}/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["phone"] is None
    assert cancelled.json()["citizen_name"] == "Citizen"