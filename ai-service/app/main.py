from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db_pool
from app.utils.model_loader import load_model_on_startup
from app.routes import verify_student, headcount, enroll


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────
    print("[ICMS AI] Starting up...")
    init_db_pool()
    load_model_on_startup()
    print("[ICMS AI] Ready to serve requests")
    yield
    # ── Shutdown ─────────────────────────────────────
    print("[ICMS AI] Shutting down")


app = FastAPI(
    title="ICMS AI Service",
    description="Anti-proxy attendance — face recognition + GPS geofence",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(enroll.router,          prefix="/api/v1", tags=["Enrollment"])
app.include_router(verify_student.router,  prefix="/api/v1", tags=["Step 1 — Student Verify"])
app.include_router(headcount.router,       prefix="/api/v1", tags=["Step 3 — Faculty Headcount"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "ICMS AI Service", "version": "2.0.0"}
