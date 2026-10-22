from fastapi import APIRouter, Depends, HTTPException

from app.database import log_event, transaction
from app.deps import db_session, require_coordinator
from app.schemas import ResourceOut, ResourceStockUpdate

router = APIRouter(prefix="/api/resources", tags=["resources"])


@router.get("", response_model=list[ResourceOut])
def list_resources():
    with db_session() as conn:
        rows = conn.execute(
            "SELECT * FROM resources ORDER BY criticality DESC, name"
        ).fetchall()
    return [dict(row) for row in rows]


@router.patch(
    "/{resource_id}",
    response_model=ResourceOut,
    dependencies=[Depends(require_coordinator)],
)
def update_stock(resource_id: int, payload: ResourceStockUpdate):
    with transaction() as conn:
        row = conn.execute(
            "SELECT * FROM resources WHERE id = ?", (resource_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Resource not found")
        new_available = row["available"] + payload.total - row["total"]
        if new_available < 0:
            raise HTTPException(
                status_code=409,
                detail="Cannot reduce stock below the amount currently allocated",
            )
        conn.execute(
            "UPDATE resources SET total = ?, available = ? WHERE id = ?",
            (payload.total, new_available, resource_id),
        )
        log_event(
            conn,
            "STOCK_UPDATED",
            "resource",
            resource_id,
            f"{row['name']}: total {row['total']} -> {payload.total}",
        )
        updated = conn.execute(
            "SELECT * FROM resources WHERE id = ?", (resource_id,)
        ).fetchone()
    return dict(updated)