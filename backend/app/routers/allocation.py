from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app import allocator
from app.database import transaction
from app.deps import is_coordinator, require_coordinator, require_token
from app.models import IncidentStatus
from app.queries import get_incident
from app.routers.incidents import hide_contact
from app.schemas import IncidentOut

router = APIRouter(prefix="/api", tags=["allocation"])


class ClaimRequest(BaseModel):
    volunteer_id: int = Field(ge=1)


class ActorRequest(BaseModel):
    volunteer_id: int | None = Field(default=None, ge=1)


class StatusChange(ActorRequest):
    status: IncidentStatus


def acting_volunteer(
    request: Request,
    authorization: str | None,
    pin: str,
    volunteer_id: int | None,
    volunteer_token: str,
) -> int | None:
    if is_coordinator(request, authorization, pin):
        return None
    if volunteer_id is None:
        raise HTTPException(status_code=403, detail="Volunteer id or coordinator login required")
    require_token("volunteer", volunteer_id, volunteer_token)
    return volunteer_id


def shaped(incident: dict, privileged: bool) -> dict:
    return incident if privileged else hide_contact(incident)


@router.post("/incidents/{incident_id}/claim", response_model=IncidentOut)
def claim_incident(
    request: Request,
    incident_id: int,
    payload: ClaimRequest,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
    x_volunteer_token: str = Header(default=""),
):
    privileged = is_coordinator(request, authorization, x_coordinator_pin)
    if not privileged:
        require_token("volunteer", payload.volunteer_id, x_volunteer_token)
    with transaction() as conn:
        allocator.claim(conn, incident_id, payload.volunteer_id)
        incident = get_incident(conn, incident_id)
    return shaped(incident, privileged)


@router.post("/incidents/{incident_id}/release", response_model=IncidentOut)
def release_incident(
    request: Request,
    incident_id: int,
    payload: ActorRequest | None = None,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
    x_volunteer_token: str = Header(default=""),
):
    privileged = is_coordinator(request, authorization, x_coordinator_pin)
    actor = acting_volunteer(
        request,
        authorization,
        x_coordinator_pin,
        payload.volunteer_id if payload else None,
        x_volunteer_token,
    )
    with transaction() as conn:
        allocator.release(conn, incident_id, actor)
        incident = get_incident(conn, incident_id)
    return shaped(incident, privileged)


@router.post("/incidents/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(
    request: Request,
    incident_id: int,
    payload: StatusChange,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
    x_volunteer_token: str = Header(default=""),
):
    privileged = is_coordinator(request, authorization, x_coordinator_pin)
    actor = acting_volunteer(
        request, authorization, x_coordinator_pin, payload.volunteer_id, x_volunteer_token
    )
    with transaction() as conn:
        allocator.change_status(conn, incident_id, payload.status, actor)
        incident = get_incident(conn, incident_id)
    return shaped(incident, privileged)


@router.post("/incidents/{incident_id}/cancel", response_model=IncidentOut)
def cancel_incident(
    request: Request,
    incident_id: int,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
    x_owner_token: str = Header(default=""),
):
    privileged = is_coordinator(request, authorization, x_coordinator_pin)
    if not privileged:
        require_token("incident", incident_id, x_owner_token)
    with transaction() as conn:
        allocator.cancel(conn, incident_id)
        incident = get_incident(conn, incident_id)
    return shaped(incident, privileged)


@router.post("/allocate", dependencies=[Depends(require_coordinator)])
def run_auto_allocate():
    with transaction() as conn:
        return allocator.auto_allocate(conn)