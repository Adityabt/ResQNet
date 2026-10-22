import time

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app import sessions
from app.deps import (
    bearer_token,
    caller_address,
    db_session,
    is_host_request,
    pin_matches,
    require_coordinator,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60

_failures: dict[str, tuple[int, float]] = {}


class LoginRequest(BaseModel):
    pin: str = Field(max_length=64)


def reset_login_limits() -> None:
    _failures.clear()


def client_key(request: Request) -> str:
    return caller_address(request)


def check_lockout(key: str) -> None:
    entry = _failures.get(key)
    if entry is None:
        return
    count, started = entry
    if count >= MAX_ATTEMPTS and time.monotonic() - started < WINDOW_SECONDS:
        raise HTTPException(
            status_code=429, detail="Too many attempts. Try again in a minute."
        )


def record_failure(key: str) -> None:
    now = time.monotonic()
    count, started = _failures.get(key, (0, now))
    if now - started >= WINDOW_SECONDS:
        count, started = 0, now
    _failures[key] = (count + 1, started)


@router.post("/login")
def login(payload: LoginRequest, request: Request):
    key = client_key(request)
    if not is_host_request(request):
        raise HTTPException(
            status_code=403,
            detail="The command center is only available on the host device",
        )
    check_lockout(key)
    if not pin_matches(payload.pin):
        record_failure(key)
        raise HTTPException(status_code=401, detail="Invalid coordinator PIN")
    _failures.pop(key, None)
    return {"ok": True, "token": sessions.create_session()}


@router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    token = bearer_token(authorization)
    if token:
        sessions.revoke(token)
    return {"ok": True}


@router.get("/session", dependencies=[Depends(require_coordinator)])
def check_session():
    return {"ok": True}


@router.get("/events", dependencies=[Depends(require_coordinator)])
def list_events(limit: int = Query(default=100, ge=1, le=500)):
    with db_session() as conn:
        rows = conn.execute(
            "SELECT * FROM event_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(row) for row in rows]