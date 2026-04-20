"""Utility helpers for matching scoring and rule-based fallback."""
import logging
from typing import Any, List, Optional

from app.database import get_redis

logger = logging.getLogger(__name__)

MATCHING_FEATURE_ORDER = [
    "distance_km",
    "driver_rating",
    "driver_completed_trips",
    "driver_acceptance_rate",
    "historical_matching_score",
    "eta_seconds",
    "surge_multiplier",
    "driver_busy_time",
]


def build_feature_vector(candidate: dict) -> list[float]:
    return [
        float(candidate.get("distance_km", 5.0)),
        float(candidate.get("driver_rating", 4.0)),
        float(candidate.get("driver_completed_trips", 0)),
        float(candidate.get("driver_acceptance_rate", 0.8)),
        float(candidate.get("historical_matching_score", 0.5)),
        float(candidate.get("eta_seconds", 300)),
        float(candidate.get("surge_multiplier", 1.0)),
        float(candidate.get("driver_busy_time", 0)),
    ]


def compute_rule_based_score(candidate: dict) -> float:
    distance = max(0.1, float(candidate.get("distance_km", 5.0)))
    rating = min(max(float(candidate.get("driver_rating", 4.0)), 0.0), 5.0)
    acceptance = min(max(float(candidate.get("driver_acceptance_rate", 0.8)), 0.0), 1.0)
    busy = min(max(float(candidate.get("driver_busy_time", 0.0)), 0.0), 120.0)
    eta = min(max(float(candidate.get("eta_seconds", 300.0)), 0.0), 900.0)

    distance_score = 1.0 / (1.0 + distance)
    rating_score = rating / 5.0
    busy_score = 1.0 - (busy / 120.0)
    eta_score = 1.0 - (eta / 900.0)

    score = (
        0.40 * distance_score
        + 0.30 * rating_score
        + 0.15 * acceptance
        + 0.10 * busy_score
        + 0.05 * eta_score
    )
    return max(0.0, min(1.0, score))


def pick_best_candidate(candidates: list[dict]) -> dict:
    if not candidates:
        raise ValueError("No candidate drivers available.")
    best = max(
        candidates,
        key=lambda item: (
            item.get("confidence_score", 0.0),
            -float(item.get("features", {}).get("distance_km", 999.0)),
        ),
    )
    return best


def build_assignment_event(ride_id: str, best_driver: dict) -> dict:
    return {
        "rideId": ride_id,
        "driverId": best_driver["driver_id"],
        "confidenceScore": best_driver["confidence_score"],
        "matchingReason": best_driver["matching_reason"],
        "assignedAt": best_driver.get("assigned_at"),
        "source": "ai-driver-matching",
    }


async def filter_nearby_drivers(
    pickup_lat: float,
    pickup_lng: float,
    max_distance_km: float,
    candidate_driver_ids: Optional[List[str]] = None,
) -> List[dict]:
    """
    Filter drivers within max_distance_km using Redis Geo.
    Returns list of dict with driver_id and distance_km.
    If candidate_driver_ids provided, only check those drivers.
    """
    try:
        redis = get_redis()
        geo_key = "drivers:locations"

        nearby_raw = await redis.georadius(
            geo_key,
            longitude=pickup_lng,
            latitude=pickup_lat,
            radius=max_distance_km,
            unit="km",
            withdist=True,
        )

        if candidate_driver_ids:
            candidate_set = set(candidate_driver_ids)
            return [
                {"driver_id": item[0], "distance_km": float(item[1])}
                for item in nearby_raw
                if item[0] in candidate_set
            ]

        return [
            {"driver_id": item[0], "distance_km": float(item[1])}
            for item in nearby_raw
        ]

    except Exception as exc:
        logger.error("Failed to query Redis Geo for nearby drivers: %s", exc)
        return []
