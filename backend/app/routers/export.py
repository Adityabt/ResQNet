import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.deps import db_session, require_coordinator
from app.queries import list_incidents

router = APIRouter(prefix="/api/admin", tags=["admin"])

COLUMNS = [
    "id",
    "created_at",
    "updated_at",
    "status",
    "urgency",
    "type",
    "zone",
    "people_count",
    "citizen_name",
    "phone",
    "volunteer",
    "resources",
    "description",
    "priority_score",
]


def safe_cell(value) -> str:
    text = "" if value is None else str(value)
    if text and text[0] in "=+-@\t\r":
        return "'" + text
    return text


@router.get("/export.csv", dependencies=[Depends(require_coordinator)])
def export_incidents():
    with db_session() as conn:
        incidents = list_incidents(conn)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(COLUMNS)
    for incident in incidents:
        resources = "; ".join(
            f"{item['quantity']} x {item['name']}" for item in incident["resources"]
        )
        row = [
            incident["id"],
            incident["created_at"],
            incident["updated_at"],
            incident["status"],
            incident["urgency"],
            incident["type"],
            incident["zone"],
            incident["people_count"],
            incident["citizen_name"],
            incident["phone"],
            incident["volunteer_name"],
            resources,
            incident["description"],
            incident["score"]["total"],
        ]
        writer.writerow([safe_cell(cell) for cell in row])
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="resqnet-incidents-{stamp}.csv"'},
    )