import os
import secrets
import socket
import ipaddress
from urllib.parse import urlsplit, urlunsplit
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get("RESQNET_DB_PATH", BASE_DIR / "resqnet.db"))
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8000"))
LAN_IP = os.environ.get("RESQNET_LAN_IP", "").strip()
if LAN_IP:
    try:
        LAN_IP = str(ipaddress.IPv4Address(LAN_IP))
    except ipaddress.AddressValueError as exc:
        raise ValueError("RESQNET_LAN_IP must be a valid IPv4 address") from exc
PUBLIC_URL = (
    os.environ.get("RESQNET_PUBLIC_URL", "").strip()
    or os.environ.get("RENDER_EXTERNAL_URL", "").strip()
)
ALLOW_REMOTE_COORDINATOR = os.environ.get("RESQNET_ALLOW_REMOTE_COORDINATOR", "").lower() in {
    "1",
    "true",
    "yes",
}

COORDINATOR_PIN = os.environ.get("RESQNET_PIN", "2468")
if ALLOW_REMOTE_COORDINATOR:
    if len(COORDINATOR_PIN) < 12 or "RESQNET_PIN" not in os.environ:
        raise RuntimeError("Remote coordinator access requires RESQNET_PIN with at least 12 characters")
    if len(os.environ.get("RESQNET_SECRET", "")) < 32:
        raise RuntimeError("Remote coordinator access requires RESQNET_SECRET with at least 32 characters")
SESSION_TTL_SECONDS = 8 * 60 * 60

PRIORITY_WEIGHTS = {"urgency": 5, "waiting": 2, "resource": 3}
WAITING_MINUTES_PER_POINT = 5
WAITING_MAX_POINTS = 5

SNAPSHOT_INTERVAL_SECONDS = 15


def load_secret() -> str:
    from_env = os.environ.get("RESQNET_SECRET")
    if from_env:
        return from_env
    path = BASE_DIR / "resqnet.secret"
    if path.exists():
        return path.read_text().strip()
    value = secrets.token_hex(32)
    path.write_text(value)
    return value


SECRET = load_secret()


def get_lan_ip() -> str:
    if LAN_IP:
        return LAN_IP
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("10.255.255.255", 1))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def get_access_url() -> str:
    """Return the address phones should use to reach this server."""
    if PUBLIC_URL:
        parsed = urlsplit(PUBLIC_URL if "://" in PUBLIC_URL else f"http://{PUBLIC_URL}")
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("RESQNET_PUBLIC_URL must be an http(s) URL or hostname")
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", ""))
    return f"http://{get_lan_ip()}:{PORT}"
