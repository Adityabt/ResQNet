import asyncio

import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app
from app.websocket_manager import ConnectionManager


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", tmp_path / "realtime.db")
    with TestClient(app) as test_client:
        yield test_client


def sos(**overrides):
    body = {
        "citizen_name": "Ravi",
        "type": "MEDICAL",
        "urgency": 4,
        "zone": "Main Gate",
        "resources": [],
    }
    body.update(overrides)
    return body


def receive_until(socket, condition, limit=10):
    for _ in range(limit):
        message = socket.receive_json()
        if message.get("type") == "snapshot" and condition(message):
            return message
    raise AssertionError("Expected snapshot never arrived")


class DeadSocket:
    async def send_json(self, message):
        raise RuntimeError("connection closed")


def test_connecting_sends_a_snapshot(client):
    with client.websocket_connect("/ws") as socket:
        message = socket.receive_json()
        assert message["type"] == "snapshot"
        assert message["clients"] == 1
        assert message["data"]["incidents"] == []
        assert len(message["data"]["resources"]) == 6


def test_new_incident_is_broadcast(client):
    with client.websocket_connect("/ws") as socket:
        socket.receive_json()
        created = client.post("/api/incidents", json=sos()).json()
        message = receive_until(socket, lambda m: len(m["data"]["incidents"]) == 1)
        assert [item["id"] for item in message["data"]["incidents"]] == [created["id"]]
        assert message["data"]["events"][0]["event_type"] == "INCIDENT_CREATED"


def test_every_client_receives_updates(client):
    with client.websocket_connect("/ws") as first, client.websocket_connect("/ws") as second:
        receive_until(first, lambda m: m["clients"] == 2)
        receive_until(second, lambda m: m["clients"] == 2)
        client.post("/api/volunteers", json={"name": "Jiya"})
        for socket in (first, second):
            message = receive_until(socket, lambda m: len(m["data"]["volunteers"]) == 1)
            assert message["data"]["volunteers"][0]["name"] == "Jiya"


def test_ping_gets_pong(client):
    with client.websocket_connect("/ws") as socket:
        socket.receive_json()
        socket.send_text("ping")
        assert socket.receive_json() == {"type": "pong"}


def test_failed_requests_do_not_broadcast(client):
    with client.websocket_connect("/ws") as socket:
        socket.receive_json()
        client.post("/api/incidents", json=sos(zone="Moon Base"))
        client.post("/api/volunteers", json={"name": "Jiya"})
        message = receive_until(socket, lambda m: len(m["data"]["volunteers"]) == 1)
        assert message["data"]["incidents"] == []


def test_manager_drops_dead_connections():
    manager = ConnectionManager()
    manager._connections.add(DeadSocket())
    assert manager.count == 1
    asyncio.run(manager.broadcast({"type": "snapshot"}))
    assert manager.count == 0