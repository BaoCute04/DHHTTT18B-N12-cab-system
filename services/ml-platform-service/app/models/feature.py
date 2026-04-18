from typing import Optional
from pydantic import BaseModel, Field


class FeatureIngestRequest(BaseModel):
    source: str = Field(
        ...,
        description="Nguồn dữ liệu: 'gps' | 'trip_history' | 'ratings'",
        examples=["trip_history"],
    )
    zoneId: str = Field(..., description="Khu vực địa lý (VD: zone_quan1)", examples=["zone_quan1"])
    features: dict = Field(
        ...,
        description="Feature vector dạng key-value",
        examples=[{
            "hour_of_day": 17,
            "day_of_week": 4,
            "demand_count": 42,
            "supply_count": 15,
            "avg_speed_kmh": 8.5,
            "rain_indicator": 0,
        }],
    )
    label: Optional[float] = Field(
        None,
        description="Surge multiplier thực tế (ground truth) nếu có, dùng cho training",
        examples=[1.8],
    )


class FeatureIngestResponse(BaseModel):
    sampleId: str
    zoneId: str
    source: str
    capturedAt: str
    message: str


class ZoneMetricUpsertRequest(BaseModel):
    zoneId: str
    demand_count: int = Field(..., ge=0)
    supply_count: int = Field(..., ge=0)
    avg_speed_kmh: float = Field(30.0, ge=0)
    rain_indicator: int = Field(0, ge=0, le=1)
