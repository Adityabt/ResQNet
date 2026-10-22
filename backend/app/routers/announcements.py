from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import log_event, transaction, utc_now_iso
from app.deps import db_session, require_coordinator

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


class AnnouncementCreate(BaseModel):
    message: str = Field(min_length=3, max_length=280)
    level: Literal["INFO", "WARNING", "CRITICAL"] = "INFO"


@router.get("")
def list_announcements():
    with db_session() as conn:
        rows = conn.execute(
            "SELECT * FROM announcements ORDER BY id DESC LIMIT 50"
        ).fetchall()
    return [dict(row) for row in rows]


@router.post("", status_code=201, dependencies=[Depends(require_coordinator)])
def create_announcement(payload: AnnouncementCreate):
    message = payload.message.strip()
    if len(message) < 3:
        raise HTTPException(status_code=422, detail="Message is too short")
    with transaction() as conn:
        cursor = conn.execute(
            "INSERT INTO announcements (message, level, created_at) VALUES (?, ?, ?)",
            (message, payload.level, utc_now_iso()),
        )
        announcement_id = cursor.lastrowid
        log_event(conn, "ANNOUNCEMENT_POSTED", "announcement", announcement_id, message[:80])
        row = conn.execute(
            "SELECT * FROM announcements WHERE id = ?", (announcement_id,)
        ).fetchone()
    return dict(row)


@router.delete("/{announcement_id}", dependencies=[Depends(require_coordinator)])
def delete_announcement(announcement_id: int):
    with transaction() as conn:
        cursor = conn.execute("DELETE FROM announcements WHERE id = ?", (announcement_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Announcement not found")
        log_event(conn, "ANNOUNCEMENT_REMOVED", "announcement", announcement_id)
    return {"ok": True}