import pytest
from fastapi.testclient import TestClient

from app import database, sessions
from app.main import app
from app.routers import admin

PIN = "2468"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "roles.db")
    admin.reset_login_limits()
    sessions.clear_all()
    with TestClient(app) as test_client:
        yield test_client


def sos(**overrides):
    body = {
        "citizen_name": "Ravi",
        "phone": "98765 43210",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "resources": [],
    }
    body.update(overrides)
    return body


def login(client):
    return client.post("/api/admin/login", json={"pin": PIN}).json()["token"]


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def join(client, name="Jiya"):
    return client.post("/api/volunteers", json={"name": name}).json()["id"]


def receive_until(socket, condition, limit=10):
    for _ in range(limit):
        message = socket.receive_json()
        if message.get("type") == "snapshot" and condition(message):
            return message
    raise AssertionError("Expected snapshot never arrived")


def test_login_returns_a_working_token(client):
    response = client.post("/api/admin/login", json={"pin": PIN})
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert len(response.json()["token"]) > 20


def test_session_check_needs_a_valid_token(client):
    assert client.get("/api/admin/session").status_code == 401
    assert client.get("/api/admin/session", headers=bearer("fake-token")).status_code == 401
    token = login(client)
    assert client.get("/api/admin/session", headers=bearer(token)).status_code == 200


def test_bearer_token_unlocks_coordinator_actions(client):
    token = login(client)
    response = client.patch("/api/resources/2", json={"total": 12}, headers=bearer(token))
    assert response.status_code == 200
    assert response.json()["total"] == 12


def test_pin_header_still_works(client):
    response = client.patch(
        "/api/resources/2", json={"total": 11}, headers={"X-Coordinator-Pin": PIN}
    )
    assert response.status_code == 200


def test_logout_revokes_the_token(client):
    token = login(client)
    assert client.post("/api/admin/logout", headers=bearer(token)).status_code == 200
    assert client.get("/api/admin/session", headers=bearer(token)).status_code == 401


def test_login_locks_out_after_repeated_failures(client):
    for _ in range(5):
        assert client.post("/api/admin/login", json={"pin": "0000"}).status_code == 401
    locked = client.post("/api/admin/login", json={"pin": PIN})
    assert locked.status_code == 429


REMOTE = ("192.168.29.50", 50000)


def test_remote_device_cannot_log_in(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "local.db")
    admin.reset_login_limits()
    with TestClient(app, client=REMOTE) as remote:
        assert remote.post("/api/admin/login", json={"pin": PIN}).status_code == 403
    with TestClient(app, client=("127.0.0.1", 50000)) as local:
        assert local.post("/api/admin/login", json={"pin": PIN}).status_code == 200


def test_whoami_reports_host_only_for_the_host(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "who.db")
    with TestClient(app, client=("127.0.0.1", 1)) as local:
        assert local.get("/api/whoami").json() == {"is_host": True}
    with TestClient(app, client=REMOTE) as remote:
        assert remote.get("/api/whoami").json() == {"is_host": False}


def test_remote_device_cannot_forge_a_host_address(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "forge.db")
    with TestClient(app, client=REMOTE) as remote:
        forged = remote.get("/api/whoami", headers={"X-Forwarded-For": "127.0.0.1"})
        assert forged.json() == {"is_host": False}


def test_proxy_forwarded_address_decides_host_status(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "proxy.db")
    with TestClient(app, client=("127.0.0.1", 1)) as via_proxy:
        phone = via_proxy.get("/api/whoami", headers={"X-Forwarded-For": "192.168.29.50"})
        assert phone.json() == {"is_host": False}
        spoof = via_proxy.get(
            "/api/whoami", headers={"X-Forwarded-For": "127.0.0.1, 192.168.29.50"}
        )
        assert spoof.json() == {"is_host": False}
        mac = via_proxy.get("/api/whoami", headers={"X-Forwarded-For": "::1"})
        assert mac.json() == {"is_host": True}


def test_remote_pin_header_is_refused_on_protected_routes(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "remote.db")
    with TestClient(app, client=REMOTE) as remote:
        response = remote.patch(
            "/api/resources/2", json={"total": 9}, headers={"X-Coordinator-Pin": PIN}
        )
        assert response.status_code == 403


def test_remote_device_never_gets_a_coordinator_socket(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "wsremote.db")
    admin.reset_login_limits()
    sessions.clear_all()
    with TestClient(app, client=("127.0.0.1", 1)) as local:
        token = local.post("/api/admin/login", json={"pin": PIN}).json()["token"]
        local.post("/api/incidents", json=sos())
    with TestClient(app, client=REMOTE) as remote:
        with remote.websocket_connect(f"/ws?token={token}") as socket:
            message = receive_until(socket, lambda m: True)
    assert message["role"] == "public"


def test_announcements_are_public_to_read_and_host_only_to_write(client):
    token = login(client)
    posted = client.post(
        "/api/announcements",
        json={"message": "Water arrives at 6 pm", "level": "WARNING"},
        headers=bearer(token),
    )
    assert posted.status_code == 201
    assert client.post("/api/announcements", json={"message": "x" * 5}).status_code == 401
    with client.websocket_connect("/ws") as socket:
        message = receive_until(socket, lambda m: len(m["data"]["announcements"]) == 1)
    assert message["data"]["announcements"][0]["level"] == "WARNING"
    removed = client.delete(f"/api/announcements/{posted.json()['id']}", headers=bearer(token))
    assert removed.status_code == 200
    assert client.get("/api/announcements").json() == []


def test_public_snapshot_hides_contact_details(client):
    client.post("/api/incidents", json=sos())
    with client.websocket_connect("/ws") as socket:
        message = receive_until(socket, lambda m: len(m["data"]["incidents"]) == 1)
    incident = message["data"]["incidents"][0]
    assert message["role"] == "public"
    assert incident["phone"] is None
    assert incident["citizen_name"] == "Citizen"


def test_coordinator_snapshot_has_full_details(client):
    client.post("/api/incidents", json=sos())
    token = login(client)
    with client.websocket_connect(f"/ws?token={token}") as socket:
        message = receive_until(socket, lambda m: len(m["data"]["incidents"]) == 1)
    incident = message["data"]["incidents"][0]
    assert message["role"] == "coordinator"
    assert incident["phone"] == "9876543210"
    assert incident["citizen_name"] == "Ravi"


def test_invalid_token_gets_the_public_snapshot(client):
    client.post("/api/incidents", json=sos())
    with client.websocket_connect("/ws?token=not-a-real-token") as socket:
        message = receive_until(socket, lambda m: len(m["data"]["incidents"]) == 1)
    assert message["role"] == "public"
    assert message["data"]["incidents"][0]["phone"] is None


def test_logout_downgrades_a_live_socket(client):
    token = login(client)
    with client.websocket_connect(f"/ws?token={token}") as socket:
        receive_until(socket, lambda m: m["role"] == "coordinator")
        client.post("/api/admin/logout", headers=bearer(token))
        message = receive_until(socket, lambda m: m["role"] == "public")
        assert message["role"] == "public"


def test_contact_requires_the_assigned_volunteer(client):
    incident = client.post("/api/incidents", json=sos()).json()["id"]
    jiya = join(client, "Jiya")
    arun = join(client, "Arun")
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": jiya})
    assert client.get(f"/api/incidents/{incident}/contact").status_code == 403
    other = client.get(f"/api/incidents/{incident}/contact", params={"volunteer_id": arun})
    assert other.status_code == 403
    allowed = client.get(f"/api/incidents/{incident}/contact", params={"volunteer_id": jiya})
    assert allowed.status_code == 200
    assert allowed.json() == {"citizen_name": "Ravi", "phone": "9876543210"}


def test_coordinator_can_read_contact_without_volunteer_id(client):
    incident = client.post("/api/incidents", json=sos()).json()["id"]
    token = login(client)
    response = client.get(f"/api/incidents/{incident}/contact", headers=bearer(token))
    assert response.status_code == 200
    assert response.json()["citizen_name"] == "Ravi"


def test_contact_for_unknown_incident_returns_404(client):
    token = login(client)
    assert client.get("/api/incidents/999/contact", headers=bearer(token)).status_code == 404


def test_coordinator_token_can_release_any_task(client):
    incident = client.post("/api/incidents", json=sos()).json()["id"]
    volunteer = join(client)
    client.post(f"/api/incidents/{incident}/claim", json={"volunteer_id": volunteer})
    token = login(client)
    response = client.post(f"/api/incidents/{incident}/release", headers=bearer(token))
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"