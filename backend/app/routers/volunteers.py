from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel

from app.database import log_event, transaction, utc_now_iso
from app.deps import db_session, make_token, require_token
from app.models import VolunteerStatus
from app.schemas import VolunteerJoin, VolunteerOut

router = APIRouter(prefix="/api/volunteers", tags=["volunteers"])


class DutyUpdate(BaseModel):
    on_duty: bool


@router.post("", response_model=VolunteerOut, status_code=201)
def join_as_volunteer(payload: VolunteerJoin, response: Response):
    with transaction() as conn:
        cursor = conn.execute(
            "INSERT INTO volunteers (name, joined_at) VALUES (?, ?)",
            (payload.name, utc_now_iso()),
        )
        volunteer_id = cursor.lastrowid
        log_event(conn, "VOLUNTEER_JOINED", "volunteer", volunteer_id, payload.name)
        row = conn.execute(
            "SELECT * FROM volunteers WHERE id = ?", (volunteer_id,)
        ).fetchone()
    response.headers["X-Volunteer-Token"] = make_token("volunteer", volunteer_id)
    return dict(row)


@router.get("", response_model=list[VolunteerOut])
def list_volunteers():
    with db_session() as conn:
        rows = conn.execute("SELECT * FROM volunteers ORDER BY id").fetchall()
    return [dict(row) for row in rows]


@router.get("/{volunteer_id}", response_model=VolunteerOut)
def read_volunteer(volunteer_id: int):
    with db_session() as conn:
        row = conn.execute(
            "SELECT * FROM volunteers WHERE id = ?", (volunteer_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return dict(row)


@router.post("/{volunteer_id}/duty", response_model=VolunteerOut)
def set_duty(
    volunteer_id: int,
    payload: DutyUpdate,
    x_volunteer_token: str = Header(default=""),
):
    require_token("volunteer", volunteer_id, x_volunteer_token)
    with transaction() as conn:
        row = conn.execute(
            "SELECT * FROM volunteers WHERE id = ?", (volunteer_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        if row["status"] == VolunteerStatus.BUSY.value:
            raise HTTPException(
                status_code=409,
                detail="Finish your current task before changing duty status",
            )
        new_status = VolunteerStatus.FREE if payload.on_duty else VolunteerStatus.OFF_DUTY
        if new_status.value != row["status"]:
            conn.execute(
                "UPDATE volunteers SET status = ? WHERE id = ?",
                (new_status.value, volunteer_id),
            )
            log_event(
                conn,
                "VOLUNTEER_ON_DUTY" if payload.on_duty else "VOLUNTEER_OFF_DUTY",
                "volunteer",
                volunteer_id,
                row["name"],
            )
        updated = conn.execute(
            "SELECT * FROM volunteers WHERE id = ?", (volunteer_id,)
        ).fetchone()
    return dict(updated)