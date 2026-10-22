import secrets
import time

from app.config import SESSION_TTL_SECONDS

_sessions: dict[str, float] = {}


def purge_expired() -> None:
    now = time.monotonic()
    for token in [token for token, expires in _sessions.items() if expires < now]:
        _sessions.pop(token, None)


def create_session() -> str:
    purge_expired()
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.monotonic() + SESSION_TTL_SECONDS
    return token


def is_valid(token: str | None) -> bool:
    if not token:
        return False
    expires = _sessions.get(token)
    if expires is None:
        return False
    if expires < time.monotonic():
        _sessions.pop(token, None)
        return False
    return True


def revoke(token: str) -> None:
    _sessions.pop(token, None)


def clear_all() -> None:
    _sessions.clear()