from app.serve.matching_predictor import predict_matching_scores
from app.utils.matching_utils import pick_best_candidate


def test_predict_matching_scores_fallback_range():
    candidates = [
        {
            "driver_id": "driver_a",
            "distance_km": 1.2,
            "driver_rating": 4.9,
            "driver_completed_trips": 120,
            "driver_acceptance_rate": 0.92,
            "historical_matching_score": 0.8,
            "eta_seconds": 180,
            "surge_multiplier": 1.2,
            "driver_busy_time": 10,
        },
        {
            "driver_id": "driver_b",
            "distance_km": 6.5,
            "driver_rating": 4.4,
            "driver_completed_trips": 80,
            "driver_acceptance_rate": 0.75,
            "historical_matching_score": 0.5,
            "eta_seconds": 420,
            "surge_multiplier": 1.0,
            "driver_busy_time": 25,
        },
    ]

    scored = predict_matching_scores(candidates)
    assert len(scored) == 2
    assert all(0.0 <= item["confidence_score"] <= 1.0 for item in scored)
    assert any(item["matching_reason"] == "fallback rule-based" for item in scored)


def test_pick_best_candidate_prefers_higher_score():
    options = [
        {"driver_id": "d1", "confidence_score": 0.54, "features": {"distance_km": 1.0}},
        {"driver_id": "d2", "confidence_score": 0.54, "features": {"distance_km": 0.8}},
        {"driver_id": "d3", "confidence_score": 0.48, "features": {"distance_km": 0.5}},
    ]

    best = pick_best_candidate(options)
    assert best["driver_id"] == "d2"
