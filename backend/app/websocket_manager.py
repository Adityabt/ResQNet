import asyncio

from fastapi import WebSocket

from app import sessions

SEND_TIMEOUT_SECONDS = 5


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._tokens: dict[WebSocket, str | None] = {}

    @property
    def count(self) -> int:
        return len(self._connections)

    async def connect(self, websocket: WebSocket, token: str | None = None) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        self._tokens[websocket] = token

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        self._tokens.pop(websocket, None)

    def is_coordinator(self, websocket: WebSocket) -> bool:
        return sessions.is_valid(self._tokens.get(websocket))

    async def _send(self, websocket: WebSocket, message: dict) -> bool:
        try:
            await asyncio.wait_for(websocket.send_json(message), SEND_TIMEOUT_SECONDS)
            return True
        except Exception:
            return False

    async def broadcast(self, message: dict, coordinator_message: dict | None = None) -> None:
        targets = list(self._connections)
        payloads = [
            coordinator_message
            if coordinator_message is not None and self.is_coordinator(websocket)
            else message
            for websocket in targets
        ]
        results = await asyncio.gather(
            *(self._send(websocket, payload) for websocket, payload in zip(targets, payloads))
        )
        for websocket, delivered in zip(targets, results):
            if not delivered:
                self.disconnect(websocket)


manager = ConnectionManager()