from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from app.database import connect_db, close_db
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.routers import health, features, training
from app.routers.matching import router as matching_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup → yield → shutdown."""
    logger.info("🚀 Matching Service starting up...")
    await connect_db()
    await start_scheduler()
    yield
    logger.info("🛑 Matching Service shutting down...")
    await stop_scheduler()
    await close_db()


app = FastAPI(
    title="Matching Service",
    version="1.0.0",
    description=(
        "AI Driver Matching service with embedded feature ingestion, "
        "model training, and matching inference APIs"
    ),
    lifespan=lifespan,
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(
    features.router,
    prefix="/api/v1/features",
    tags=["Feature Store"],
)
app.include_router(
    training.router,
    prefix="/api/v1/training",
    tags=["Model Training"],
)
app.include_router(
    matching_router,
    prefix="/api/v1/matching",
    tags=["AI Matching"],
)
