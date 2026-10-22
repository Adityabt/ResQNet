import starlette.websockets as starlette_ws
from fastapi import APIRouter, Query, WebSocket

from app.deps import is_host_request
from app.realtime import broadcast_snapshot
from app.websocket_manager import manager

router = APIRouter()

DISCONNECT_ERRORS = tuple(
    getattr(starlette_ws, name)
    for name in ("WebSocketDisconnect", "WebSocketDisconnected")
    if hasattr(starlette_ws, name)
)


@router.websocket("/ws")
async def live_updates(websocket: WebSocket, token: str | None = Query(default=None)):
    await manager.connect(websocket, token if is_host_request(websocket) else None)
    try:
        await broadcast_snapshot()
        while True:
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_json({"type": "pong"})
    except DISCONNECT_ERRORS:
        pass
    finally:
        manager.disconnect(websocket)
        await broadcast_snapshot()