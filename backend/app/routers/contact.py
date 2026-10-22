from fastapi import APIRouter, Header, HTTPException, Request

from app.deps import db_session, is_coordinator, token_ok

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("/{incident_id}/contact")
def read_contact(
    request: Request,
    incident_id: int,
    volunteer_id: int | None = None,
    authorization: str | None = Header(default=None),
    x_coordinator_pin: str = Header(default=""),
    x_volunteer_token: str = Header(default=""),
):
    privileged = is_coordinator(request, authorization, x_coordinator_pin)
    with db_session() as conn:
        row = conn.execute(
            "SELECT citizen_name, phone FROM incidents WHERE id = ?", (incident_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Incident not found")
        if not privileged:
            holder = None
            if volunteer_id is not None and token_ok("volunteer", volunteer_id, x_volunteer_token):
                holder = conn.execute(
                    "SELECT 1 FROM assignments "
                    "WHERE incident_id = ? AND volunteer_id = ? AND completed_at IS NULL",
                    (incident_id, volunteer_id),
                ).fetchone()
            if holder is None:
                raise HTTPException(
                    status_code=403,
                    detail="Only the assigned volunteer can see contact details",
                )
    return {"citizen_name": row["citizen_name"], "phone": row["phone"]}