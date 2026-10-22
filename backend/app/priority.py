from dataclasses import dataclass
from datetime import datetime, timezone

from app.config import (
    PRIORITY_WEIGHTS,
    WAITING_MAX_POINTS,
    WAITING_MINUTES_PER_POINT,
)

URGENCY_RANGE = (1, 5)
RESOURCE_RANGE = (1, 5)


@dataclass(frozen=True)
class IncidentSnapshot:
    id: int
    urgency: int
    resource_score: int
    created_at: datetime


def _check_range(name: str, value: int, low: int, high: int) -> None:
    if not low <= value <= high:
        raise ValueError(f"{name} must be between {low} and {high}, got {value}")


def waiting_score(created_at: datetime, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    minutes = max(0.0, (now - created_at).total_seconds() / 60)
    return min(WAITING_MAX_POINTS, int(minutes // WAITING_MINUTES_PER_POINT))


def resource_score(criticalities: list[int]) -> int:
    return max(criticalities) if criticalities else 1


def priority_score(urgency: int, waiting: int, resource: int) -> int:
    _check_range("urgency", urgency, *URGENCY_RANGE)
    _check_range("waiting", waiting, 0, WAITING_MAX_POINTS)
    _check_range("resource", resource, *RESOURCE_RANGE)
    return (
        PRIORITY_WEIGHTS["urgency"] * urgency
        + PRIORITY_WEIGHTS["waiting"] * waiting
        + PRIORITY_WEIGHTS["resource"] * resource
    )


def score_breakdown(incident: IncidentSnapshot, now: datetime | None = None) -> dict[str, int]:
    waiting = waiting_score(incident.created_at, now)
    return {
        "urgency": incident.urgency,
        "waiting": waiting,
        "resource": incident.resource_score,
        "total": priority_score(incident.urgency, waiting, incident.resource_score),
    }


def rank_incidents(
    incidents: list[IncidentSnapshot], now: datetime | None = None
) -> list[tuple[IncidentSnapshot, int]]:
    now = now or datetime.now(timezone.utc)
    scored = [(inc, score_breakdown(inc, now)["total"]) for inc in incidents]
    scored.sort(key=lambda pair: (-pair[1], pair[0].created_at, pair[0].id))
    return scored