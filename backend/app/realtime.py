import asyncio
import logging

from starlette.concurrency import run_in_threadpool

from app.config import SNAPSHOT_INTERVAL_SECONDS
from app.database import utc_now_iso
from app.deps import db_session
from app.snapshot import build_snapshot, redact_for_public
from app.websocket_manager import manager

logger = logging.getLogger("resqnet.realtime")

_broadcast_lock: asyncio.Lock | None = None


def reset_lock() -> None:
    global _broadcast_lock
    _broadcast_lock = asyncio.Lock()


def _get_lock() -> asyncio.Lock:
    if _broadcast_lock is None:
        reset_lock()
    return _broadcast_lock


def build_messages() -> tuple[dict, dict]:
    with db_session() as conn:
        full = build_snapshot(conn)
    stamp = utc_now_iso()
    clients = manager.count
    public = {
        "type": "snapshot",
        "role": "public",
        "server_time": stamp,
        "clients": clients,
        "data": redact_for_public(full),
    }
    coordinator = {**public, "role": "coordinator", "data": full}
    return public, coordinator


async def make_messages() -> tuple[dict, dict]:
    return await run_in_threadpool(build_messages)


async def broadcast_snapshot() -> None:
    if manager.count == 0:
        return
    try:
        async with _get_lock():
            public, coordinator = await make_messages()
            await manager.broadcast(public, coordinator)
    except Exception:
        logger.exception("Snapshot broadcast failed")


async def periodic_snapshots() -> None:
    while True:
        await asyncio.sleep(SNAPSHOT_INTERVAL_SECONDS)
        await broadcast_snapshot()