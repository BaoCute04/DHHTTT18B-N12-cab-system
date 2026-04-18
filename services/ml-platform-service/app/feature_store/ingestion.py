import uuid
import logging
from datetime import datetime, timezone

from app.database import get_mongo_db

logger = logging.getLogger(__name__)


async def ingest_feature(data: dict) -> str:
    """
    Lưu một feature sample vào MongoDB collection `ml_features`.

    Document schema:
    {
        sampleId:   str (UUID),
        source:     "gps" | "trip_history" | "ratings",
        zoneId:     str,
        features:   { hour_of_day, day_of_week, demand_count, supply_count, ... },
        label:      float | None  (surge multiplier ground truth),
        capturedAt: datetime (UTC)
    }
    """
    db = get_mongo_db()
    sample_id = str(uuid.uuid4())

    doc = {
        "sampleId": sample_id,
        "source": data["source"],
        "zoneId": data["zoneId"],
        "features": data["features"],
        "label": data.get("label"),
        "capturedAt": datetime.now(tz=timezone.utc),
    }

    await db.ml_features.insert_one(doc)
    logger.debug("Feature ingested: sampleId=%s zone=%s", sample_id, data["zoneId"])
    return sample_id


async def upsert_zone_metric(zone_data: dict) -> None:
    """
    Cập nhật real-time metrics của một zone vào collection `zone_metrics`.
    Được dùng bởi background scheduler để fetch dữ liệu mới nhất khi predict.
    """
    db = get_mongo_db()
    zone_id = zone_data["zoneId"]
    now = datetime.now(tz=timezone.utc)

    await db.zone_metrics.update_one(
        {"zoneId": zone_id},
        {
            "$set": {
                **zone_data,
                "updatedAt": now,
            }
        },
        upsert=True,
    )
    logger.debug("Zone metric upserted: zoneId=%s", zone_id)
