import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models.feature import (
    FeatureIngestRequest,
    FeatureIngestResponse,
    ZoneMetricUpsertRequest,
)
from app.feature_store.ingestion import ingest_feature, upsert_zone_metric

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/ingest",
    response_model=FeatureIngestResponse,
    status_code=201,
    summary="Ingest feature sample vào Feature Store (MongoDB)",
)
async def ingest_features(payload: FeatureIngestRequest):
    """
    Nhận feature vector từ Data Sources (GPS, Trip History, Ratings)
    và lưu bất đồng bộ vào MongoDB collection `ml_features`.
    """
    try:
        sample_id = await ingest_feature(payload.model_dump())
        return FeatureIngestResponse(
            sampleId=sample_id,
            zoneId=payload.zoneId,
            source=payload.source,
            capturedAt=datetime.now(tz=timezone.utc).isoformat(),
            message="Feature ingested successfully",
        )
    except Exception as exc:
        logger.error("Failed to ingest feature: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post(
    "/zone-metrics",
    status_code=200,
    summary="Cập nhật real-time zone metrics (demand/supply) cho Surge prediction",
)
async def update_zone_metrics(payload: ZoneMetricUpsertRequest):
    """
    Upsert real-time demand/supply metrics cho một zone.
    Background scheduler sẽ đọc collection này để predict surge.
    """
    try:
        from datetime import datetime as dt
        now = dt.now(tz=timezone.utc)
        data = {
            "zoneId": payload.zoneId,
            "demand_count": payload.demand_count,
            "supply_count": payload.supply_count,
            "avg_speed_kmh": payload.avg_speed_kmh,
            "rain_indicator": payload.rain_indicator,
            "hour_of_day": now.hour,
            "day_of_week": now.weekday(),
        }
        await upsert_zone_metric(data)
        return {"success": True, "zoneId": payload.zoneId, "message": "Zone metric updated"}
    except Exception as exc:
        logger.error("Failed to update zone metric: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
