import uuid
import logging
from datetime import datetime, timezone

from app.database import get_mongo_db

logger = logging.getLogger(__name__)


async def ingest_matching_sample(data: dict) -> str:
    """Lưu một sample matching candidate vào MongoDB để dùng cho training."""
    db = get_mongo_db()
    sample_id = str(uuid.uuid4())
    doc = {
        "sampleId": sample_id,
        "rideId": data["rideId"],
        "driverId": data["driverId"],
        "source": data.get("source", "matching"),
        "features": data["features"],
        "label": data.get("label"),
        "capturedAt": datetime.now(tz=timezone.utc),
    }
    await db.ml_matching_samples.insert_one(doc)
    logger.debug(
        "Matching sample ingested: sampleId=%s rideId=%s driverId=%s",
        sample_id,
        data["rideId"],
        data["driverId"],
    )
    return sample_id


async def fetch_matching_samples(limit: int = 10_000) -> list[dict]:
    db = get_mongo_db()
    return await db.ml_matching_samples.find({"label": {"$ne": None}}, {"_id": 0}).to_list(length=limit)
