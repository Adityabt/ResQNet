import asyncio
from io import BytesIO
from contextlib import asynccontextmanager, suppress

import qrcode
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response

from app.allocator import AllocationError
from app.config import FRONTEND_DIST, HOST, PORT, get_access_url, get_lan_ip
from app.database import init_db
from app.realtime import broadcast_snapshot, periodic_snapshots, reset_lock
from app.routers import (
    admin,
    allocation,
    announcements,
    contact,
    demo,
    dev,
    export,
    incidents,
    meta,
    resources,
    volunteers,
    ws,
)

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SILENT_PATHS = {"/api/admin/login"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    reset_lock()
    ticker = asyncio.create_task(periodic_snapshots())
    try:
        yield
    finally:
        ticker.cancel()
        with suppress(asyncio.CancelledError):
            await ticker


app = FastAPI(title="ResQNet", lifespan=lifespan)


@app.exception_handler(AllocationError)
async def allocation_error_handler(_request: Request, error: AllocationError):
    return JSONResponse(status_code=error.status_code, content={"detail": error.message})


@app.middleware("http")
async def broadcast_after_changes(request: Request, call_next):
    response = await call_next(request)
    if (
        request.method in MUTATING_METHODS
        and 200 <= response.status_code < 300
        and request.url.path not in SILENT_PATHS
    ):
        await broadcast_snapshot()
    return response


app.include_router(meta.router)
app.include_router(incidents.router)
app.include_router(contact.router)
app.include_router(allocation.router)
app.include_router(volunteers.router)
app.include_router(resources.router)
app.include_router(announcements.router)
app.include_router(admin.router)
app.include_router(export.router)
app.include_router(demo.router)
app.include_router(ws.router)
app.include_router(dev.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "lan_ip": get_lan_ip()}


@app.get("/api/access")
def access_info():
    return {"url": get_access_url()}


@app.get("/api/access/qr.png")
def access_qr():
    image = qrcode.make(get_access_url())
    output = BytesIO()
    image.save(output, format="PNG")
    return Response(output.getvalue(), media_type="image/png", headers={"Cache-Control": "no-store"})


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    dist = FRONTEND_DIST.resolve()
    candidate = (dist / full_path).resolve()
    if full_path and candidate.is_file() and dist in candidate.parents:
        return FileResponse(candidate)
    index = dist / "index.html"
    if index.is_file():
        return FileResponse(index)
    return RedirectResponse("/docs")


if __name__ == "__main__":
    print(f"ResQNet access URL (share this with phones on the same local network): {get_access_url()}")
    print(f"Coordinator dashboard: http://localhost:{PORT}/dashboard (open on this host computer).")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
