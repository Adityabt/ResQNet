import functools
import hashlib
import hmac
import secrets
import socket
from contextlib import contextmanager

from fastapi import Header, HTTPException, Request
from starlette.requests import HTTPConnection

from app import sessions
from app.config import ALLOW_REMOTE_COORDINATOR, COORDINATOR_PIN, SECRET, get_lan_ip
from app.database import get_connection

LOOPBACK = {"127.0.0.1", "::1", "localhost"}
ENFORCE_TOKENS = True


@contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


@functools.lru_cache(maxsize=1)
def own_addresses() -> frozenset[str]:
    found = {get_lan_ip()}
    try:
        found.update(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        pass
    return frozenset(found)


def normalize(address: str | None) -> str:
    if not address:
        return "unknown"
    return address.removeprefix("::ffff:")


def caller_address(conn: HTTPConnection) -> str:
    peer = normalize(conn.client.host if conn.client else None)
    forwarded = conn.headers.get("x-forwarded-for")
    if peer in LOOPBACK and forwarded:
        last = normalize(forwarded.split(",")[-1].strip())
        if last != "unknown":
            return last
    return peer


def is_host_request(conn: HTTPConnection) -> bool:
    if ALLOW_REMOTE_COORDINATOR:
        return True
    address = caller_address(conn)
    return address in LOOPBACK or address in own_addresses()


def pin_matches(pin: str) -> bool:
    return secrets.compare_digest(pin.encode(), COORDINATOR_PIN.encode())


def bearer_token(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


def is_coordinator(conn: HTTPConnection, authorization: str | None, pin: str | None) -> bool:
    if not is_host_request(conn):
        return False
    if pin and pin_matches(pin):
        return True
    return sessions.is_valid(bearer_token(authorization))


def require_host(request: Request) -> None:
    if not is_host_request(request):
        raise HTTPException(
            status_code=403, detail="The command center is only available on the host device"
        )


def require_coordinator(
    request: Request,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
) -> None:
    require_host(request)
    if not is_coordinator(request, authorization, x_coordinator_pin):
        raise HTTPException(status_code=401, detail="Coordinator login required")


def make_token(kind: str, entity_id: int) -> str:
    message = f"{kind}:{entity_id}".encode()
    return hmac.new(SECRET.encode(), message, hashlib.sha256).hexdigest()


def token_ok(kind: str, entity_id: int, token: str | None) -> bool:
    if not ENFORCE_TOKENS:
        return True
    if not token:
        return False
    return hmac.compare_digest(make_token(kind, entity_id), token)


def require_token(kind: str, entity_id: int, token: str | None) -> None:
    if not token_ok(kind, entity_id, token):
        raise HTTPException(status_code=403, detail="Invalid or missing access token")
