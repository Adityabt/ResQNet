import pytest
from fastapi.testclient import TestClient

from app import database, deps, sessions
from app.main import app
from app.routers import admin

PIN_HEADER = {"X-Coordinator-Pin": "2468"}


@pytest.fixture
def strict(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "tokens.db")
    monkeypatch.setattr(deps, "ENFORCE_TOKENS", True)
    admin.reset_login_limits()
    sessions.clear_all()
    with TestClient(app) as test_client:
        yield test_client


def sos():
    return {
        "citizen_name": "Jiya",
        "phone": "9876543210",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "resources": [],
    }


def test_cancel_needs_owner_token_or_coordinator(strict):
    first = strict.post("/api/incidents", json=sos())
    owner = {"X-Owner-Token": first.headers["X-Owner-Token"]}
    first_id = first.json()["id"]
    assert strict.post(f"/api/incidents/{first_id}/cancel").status_code == 403
    assert strict.post(f"/api/incidents/{first_id}/cancel", headers=owner).status_code == 200
    second_id = strict.post("/api/incidents", json=sos()).json()["id"]
    assert strict.post(f"/api/incidents/{second_id}/cancel", headers=PIN_HEADER).status_code == 200


def test_duty_needs_volunteer_token(strict):
    joined = strict.post("/api/volunteers", json={"name": "Aarav"})
    volunteer_id = joined.json()["id"]
    token = {"X-Volunteer-Token": joined.headers["X-Volunteer-Token"]}
    url = f"/api/volunteers/{volunteer_id}/duty"
    assert strict.post(url, json={"on_duty": False}).status_code == 403
    assert strict.post(url, json={"on_duty": False}, headers=token).status_code == 200


def test_claim_and_contact_need_the_right_volunteer_token(strict):
    incident_id = strict.post("/api/incidents", json=sos()).json()["id"]
    first = strict.post("/api/volunteers", json={"name": "Aarav"})
    second = strict.post("/api/volunteers", json={"name": "Diya"})
    first_id = first.json()["id"]
    first_token = {"X-Volunteer-Token": first.headers["X-Volunteer-Token"]}
    second_token = {"X-Volunteer-Token": second.headers["X-Volunteer-Token"]}
    claim_url = f"/api/incidents/{incident_id}/claim"
    assert strict.post(claim_url, json={"volunteer_id": first_id}).status_code == 403
    assert strict.post(claim_url, json={"volunteer_id": first_id}, headers=first_token).status_code == 200
    contact_url = f"/api/incidents/{incident_id}/contact?volunteer_id={first_id}"
    assert strict.get(contact_url).status_code == 403
    assert strict.get(contact_url, headers=second_token).status_code == 403
    allowed = strict.get(contact_url, headers=first_token)
    assert allowed.status_code == 200
    assert allowed.json()["phone"] == "9876543210"