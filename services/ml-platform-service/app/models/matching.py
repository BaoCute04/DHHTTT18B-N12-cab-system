from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CandidateFeature(BaseModel):
    driver_id: str = Field(..., description="Driver unique id")
    distance_km: float = Field(..., ge=0.0, description="Distance from pickup location")
    driver_rating: float = Field(..., ge=0.0, le=5.0, description="Driver rating")
    driver_completed_trips: int = Field(
        0,
        ge=0,
        description="Số chuyến đã hoàn thành của tài xế",
    )
    driver_acceptance_rate: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Tỷ lệ chấp nhận cuốc của tài xế",
    )
    historical_matching_score: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Matching score lịch sử của tài xế",
    )
    eta_seconds: int = Field(..., ge=0, description="ETA dự kiến đến pickup")
    surge_multiplier: float = Field(
        1.0,
        ge=0.0,
        description="Surge multiplier hiện tại của khu vực",
    )
    driver_busy_time: float = Field(
        0.0,
        ge=0.0,
        description="Thời gian tài xế bận tính bằng phút",
    )


class MatchingScoreRequest(BaseModel):
    rideId: str = Field(..., description="Unique ride id")
    candidates: List[CandidateFeature]


class MatchingScoreItem(BaseModel):
    driver_id: str
    confidence_score: float
    matching_reason: str
    features: CandidateFeature


class MatchingScoreResponse(BaseModel):
    rideId: str
    scores: List[MatchingScoreItem]


class BestDriverRequest(BaseModel):
    rideId: str
    candidates: List[CandidateFeature]
    idempotency_key: Optional[str] = Field(
        None,
        description="Optional key for idempotent retry support",
    )
    force_fallback: bool = Field(
        False,
        description="Force use rule-based fallback instead of AI model",
    )
    max_distance_km: float = Field(
        5.0,
        ge=0.0,
        description="Maximum distance in km to filter nearby drivers using Redis Geo",
    )
    pickup_lat: Optional[float] = Field(
        None,
        description="Pickup latitude for geo-based filtering",
    )
    pickup_lng: Optional[float] = Field(
        None,
        description="Pickup longitude for geo-based filtering",
    )


class BestDriverResponse(BaseModel):
    rideId: str
    driver_id: str
    confidence_score: float
    matching_reason: str
    selected_by: str
    assigned_at: str
    published: bool


class MatchingHealthResponse(BaseModel):
    status: str
    model_loaded: bool
    source: str
    timestamp: str
