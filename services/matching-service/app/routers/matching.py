import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import settings
from app.database import get_redis
from app.models.matching import (
    BestDriverRequest,
    BestDriverResponse,
    MatchingHealthResponse,
    MatchingScoreRequest,
    MatchingScoreResponse,
)
from app.serve.matching_predictor import predict_best_driver, predict_matching_scores
from app.utils.matching_utils import build_assignment_event, filter_nearby_drivers, pick_best_candidate

router = APIRouter()
logger = logging.getLogger(__name__)


async def _publish_assignment_event(payload: dict) -> bool:
    try:
        from aiokafka import AIOKafkaProducer
    except ImportError:
        logger.error("Kafka dependency not installed. Cannot publish ride.assigned event.")
        return False

    producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
    await producer.start()
    try:
        await producer.send_and_wait(
            settings.ride_assigned_topic,
            json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        )
        await producer.flush()
        logger.info("Published ride.assigned event for ride=%s driver=%s", payload["rideId"], payload["driverId"])
        return True
    except Exception as exc:
        logger.error("Failed to publish ride.assigned event: %s", exc, exc_info=True)
        return False
    finally:
        await producer.stop()


@router.post(
    "/score",
    response_model=MatchingScoreResponse,
    summary="Predict matching confidence score cho danh sách tài xế",
)
async def score_matching(payload: MatchingScoreRequest):
    try:
        scores = predict_matching_scores([candidate.model_dump() for candidate in payload.candidates])
        return MatchingScoreResponse(rideId=payload.rideId, scores=scores)
    except Exception as exc:
        logger.error("score_matching failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post(
    "/best-driver",
    response_model=BestDriverResponse,
    summary="Chọn tài xế tốt nhất cho cuốc xe và publish sự kiện ride.assigned",
)
async def choose_best_driver(payload: BestDriverRequest, background_tasks: BackgroundTasks):
    """Nhận BestDriverRequest với geo filtering và force_fallback support"""
    ride_id = payload.rideId
    candidates = [c.model_dump() for c in payload.candidates]
    force_fallback = payload.force_fallback
    max_distance_km = payload.max_distance_km
    pickup_lat = payload.pickup_lat
    pickup_lng = payload.pickup_lng

    if not candidates:
        raise HTTPException(status_code=422, detail="Candidate list cannot be empty.")

    logger.info(
        "Received best-driver request for ride=%s, force_fallback=%s, max_distance_km=%.2f, pickup=(%s, %s)",
        ride_id, force_fallback, max_distance_km, pickup_lat, pickup_lng
    )

    try:
        # 1. Redis Geo Hard Constraint
        filtered_candidates = candidates
        if pickup_lat is not None and pickup_lng is not None:
            nearby_drivers = await filter_nearby_drivers(
                pickup_lat, pickup_lng, max_distance_km, [c["driver_id"] for c in candidates]
            )
            nearby_ids = {d["driver_id"] for d in nearby_drivers}
            filtered_candidates = [c for c in candidates if c["driver_id"] in nearby_ids]

            if not filtered_candidates:
                logger.warning("No drivers within %.1f km of pickup location", max_distance_km)

        # 2. Score candidates
        scored_candidates = predict_matching_scores(
            filtered_candidates or candidates,
            force_fallback=force_fallback
        )

        best_candidate = pick_best_candidate(scored_candidates)
        best_candidate["assigned_at"] = datetime.now(tz=timezone.utc).isoformat()

        # 3. Publish Kafka (optional - không block test local)
        published = False
        try:
            payload_data = build_assignment_event(ride_id, best_candidate)
            background_tasks.add_task(_publish_assignment_event, payload_data)
            published = True
        except Exception as e:
            logger.warning("Kafka publish failed (normal for local testing): %s", e)

        response = BestDriverResponse(
            rideId=ride_id,
            driver_id=best_candidate["driver_id"],
            confidence_score=best_candidate["confidence_score"],
            matching_reason=best_candidate["matching_reason"],
            selected_by="ai-driver-matching",
            assigned_at=best_candidate["assigned_at"],
            published=published,
        )

        return response

    except Exception as exc:
        logger.error("choose_best_driver failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

@router.get(
    "/health",
    response_model=MatchingHealthResponse,
    summary="Health check cho AI Matching service",
)
async def health_check():
    from app.serve.matching_predictor import _load_model

    model = _load_model(settings.model_store_path)
    return MatchingHealthResponse(
        status="ok",
        model_loaded=bool(model),
        source="ai-driver-matching",
        timestamp=datetime.now(tz=timezone.utc).isoformat(),
    )
