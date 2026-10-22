from fastapi import APIRouter, Request

from app.config import PRIORITY_WEIGHTS, WAITING_MAX_POINTS, WAITING_MINUTES_PER_POINT
from app.deps import is_host_request
from app.models import ZONES, IncidentType

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta")
def get_meta():
    return {
        "zones": ZONES,
        "incident_types": [item.value for item in IncidentType],
        "urgency_levels": [1, 2, 3, 4, 5],
        "weights": PRIORITY_WEIGHTS,
        "waiting_minutes_per_point": WAITING_MINUTES_PER_POINT,
        "waiting_max_points": WAITING_MAX_POINTS,
    }


@router.get("/whoami")
def who_am_i(request: Request):
    return {"is_host": is_host_request(request)}