from fastapi import APIRouter, Header, HTTPException, Request, Response

from app.database import log_event, transaction, utc_now_iso
from app.deps import db_session, is_coordinator, make_token
from app.models import IncidentStatus
from app.priority import resource_score
from app.queries import get_incident, list_incidents
from app.schemas import IncidentCreate, IncidentOut
from app.snapshot import PUBLIC_NAME

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(payload: IncidentCreate, response: Response):
    with transaction() as conn:
        criticalities = []
        for item in payload.resources:
            resource = conn.execute(
                "SELECT total, criticality FROM resources WHERE id = ?",
                (item.resource_id,),
            ).fetchone()
            if resource is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Resource {item.resource_id} does not exist",
                )
            if item.quantity > resource["total"]:
                raise HTTPException(
                    status_code=422,
                    detail=f"Requested quantity for resource {item.resource_id} exceeds total stock",
                )
            criticalities.append(resource["criticality"])

        now = utc_now_iso()
        cursor = conn.execute(
            "INSERT INTO incidents (citizen_name, phone, type, urgency, zone, "
            "people_count, description, resource_score, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                payload.citizen_name,
                payload.phone,
                payload.type.value,
                payload.urgency,
                payload.zone,
                payload.people_count,
                payload.description,
                resource_score(criticalities),
                now,
                now,
            ),
        )
        incident_id = cursor.lastrowid
        conn.executemany(
            "INSERT INTO incident_resources (incident_id, resource_id, quantity) "
            "VALUES (?, ?, ?)",
            [(incident_id, item.resource_id, item.quantity) for item in payload.resources],
        )
        log_event(
            conn,
            "INCIDENT_CREATED",
            "incident",
            incident_id,
            f"{payload.type.value} urgency {payload.urgency} at {payload.zone}",
        )
        incident = get_incident(conn, incident_id)
    response.headers["X-Owner-Token"] = make_token("incident", incident_id)
    return incident


def hide_contact(incident: dict) -> dict:
    return {**incident, "phone": None, "citizen_name": PUBLIC_NAME}


@router.get("", response_model=list[IncidentOut])
def list_all_incidents(
    request: Request,
    status: IncidentStatus | None = None,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
):
    with db_session() as conn:
        incidents = list_incidents(conn, status)
    if is_coordinator(request, authorization, x_coordinator_pin):
        return incidents
    return [hide_contact(incident) for incident in incidents]


@router.get("/{incident_id}", response_model=IncidentOut)
def read_incident(
    request: Request,
    incident_id: int,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
):
    with db_session() as conn:
        incident = get_incident(conn, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    if is_coordinator(request, authorization, x_coordinator_pin):
        return incident
    return hide_contact(incident)