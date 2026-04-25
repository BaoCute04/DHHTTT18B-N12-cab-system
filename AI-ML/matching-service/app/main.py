from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI

from app.database import connect_db, close_db
from app.routers.features import router as feature_router
from app.routers import health
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
    
    # [NHIỆM VỤ 1] Start Kafka Consumer in background
    from app.tasks.consumer import start_matching_consumer
    asyncio.create_task(start_matching_consumer())
    
    yield
    logger.info("🛑 Matching Service shutting down...")
    await close_db()


app = FastAPI(
    title="Matching Service",
    version="1.0.0",
    description="AI Driver Matching service for candidate scoring and best-driver assignment",
    lifespan=lifespan,
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(matching_router, prefix="/api/v1/matching", tags=["Matching"])
app.include_router(feature_router, prefix="/api/v1/matching/features", tags=["Matching Feature Store"])

#phần thêm mới
@app.get("/api/v1/mcp/context/{ride_id}", tags=["MCP Gateway Mock"])
async def get_mcp_context(ride_id: str):
    import urllib.request
    import json
    
    pickup = {"lat": 21.028, "lng": 105.854}
    drop = {"lat": 21.028, "lng": 105.854}
    
    try:
        url = f"http://cab-booking-service:3103/api/v1/bookings/{ride_id}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            booking_data = json.loads(response.read().decode('utf-8'))
            if booking_data.get("success") and booking_data.get("data"):
                data = booking_data["data"]
                pickup = data.get("pickup", pickup)
                drop = data.get("drop", drop)
    except Exception as e:
        pass

    from app.database import get_redis
    redis = get_redis()
    available_drivers = []
    try:
        drivers = await redis.georadius("drivers:geo", pickup["lng"], pickup["lat"], 5, "km", withdist=True)
        for d in drivers:
            available_drivers.append({
                "id": d[0],
                "distance": round(d[1], 2),
                "rating": 4.9
            })
    except Exception:
        pass

    if not available_drivers:
        available_drivers = [
            {"id": "driver_123", "distance": 1.5, "rating": 4.9}
        ]

    return {
        "ride_id": ride_id,
        "pickup": pickup,
        "drop": drop,
        "available_drivers": available_drivers,
        "traffic_level": 0.7,
        "demand_index": 1.5,
        "supply_index": 0.8
    }
