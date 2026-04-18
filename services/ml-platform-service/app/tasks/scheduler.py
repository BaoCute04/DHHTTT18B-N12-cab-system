"""
scheduler.py
────────────
Background task: mỗi SURGE_PUSH_INTERVAL_SECONDS giây,
fetch zone metrics từ MongoDB, predict surge multiplier,
và PUSH kết quả vào Redis với key `surge_zone:{zoneId}`.

Pricing Service (Node.js) chỉ cần GET từ Redis — không cần gọi HTTP sang ML Platform.
"""

import json
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import get_mongo_db, get_redis
from app.serve.surge_predictor import predict_surge

logger = logging.getLogger(__name__)

# ── Scheduler singleton ────────────────────────────────────────────────────────
_scheduler = AsyncIOScheduler(timezone="UTC")

# ── Mock zones dùng khi DB chưa có data (cold start) ─────────────────────────
_COLD_START_ZONES = [
    {
        "zoneId": "zone_quan1",
        "demand_count": 25,
        "supply_count": 10,
        "avg_speed_kmh": 8.5,
        "rain_indicator": 0,
    },
    {
        "zoneId": "zone_quan3",
        "demand_count": 15,
        "supply_count": 14,
        "avg_speed_kmh": 22.0,
        "rain_indicator": 0,
    },
    {
        "zoneId": "zone_binhthanh",
        "demand_count": 8,
        "supply_count": 20,
        "avg_speed_kmh": 35.0,
        "rain_indicator": 0,
    },
    {
        "zoneId": "zone_tanbinh",
        "demand_count": 30,
        "supply_count": 9,
        "avg_speed_kmh": 12.0,
        "rain_indicator": 1,
    },
]


async def _push_surge_for_all_zones() -> None:
    """
    Core scheduled task.

    Steps:
      1. Fetch tất cả zone metrics từ MongoDB `zone_metrics` collection
      2. Nếu DB trống → dùng mock zones (cold-start safety net)
      3. Với mỗi zone: predict surge (XGBoost hoặc fallback formula)
      4. PUSH payload JSON vào Redis key `surge_zone:{zoneId}` với TTL=90s
    """
    try:
        db = get_mongo_db()
        redis = get_redis()

        # ── 1. Fetch zone metrics ─────────────────────────────────────────────
        zones = await db.zone_metrics.find({}, {"_id": 0}).to_list(length=200)

        if not zones:
            zones = _COLD_START_ZONES
            logger.warning(
                "⚠️  zone_metrics collection is empty. Using %d cold-start mock zones.",
                len(zones),
            )

        # ── 2. Enrich với current hour/day ────────────────────────────────────
        now = datetime.now(tz=timezone.utc)
        for zone in zones:
            zone.setdefault("hour_of_day", now.hour)
            zone.setdefault("day_of_week", now.weekday())

        # ── 3. Predict & Push ──────────────────────────────────────────────────
        pushed: list[dict] = []
        for zone in zones:
            zone_id = zone.get("zoneId", "zone_unknown")

            surge = predict_surge(zone, settings.model_store_path)

            payload = json.dumps(
                {
                    "multiplier": surge,
                    "zoneId": zone_id,
                    "updatedAt": now.isoformat(),
                    "source": "ml-platform",
                },
                ensure_ascii=False,
            )

            redis_key = f"surge_zone:{zone_id}"
            # setex: SET + EXPIRE atomically
            await redis.setex(redis_key, settings.surge_redis_ttl, payload)
            pushed.append({"zone": zone_id, "surge": surge})

        logger.info(
            "✅ [Surge Push] %d zones pushed to Redis → %s",
            len(pushed),
            pushed,
        )

    except Exception as exc:
        # Bắt toàn bộ exception để scheduler KHÔNG bị dừng
        logger.error(
            "❌ [Surge Push] Task failed: %s", exc, exc_info=True
        )


# ── Public API ─────────────────────────────────────────────────────────────────
async def start_scheduler() -> None:
    _scheduler.add_job(
        _push_surge_for_all_zones,
        trigger="interval",
        seconds=settings.surge_push_interval_seconds,
        id="surge_push_job",
        replace_existing=True,
        # next_run_time=now() → chạy ngay sau khi service khởi động
        next_run_time=datetime.now(tz=timezone.utc),
    )
    _scheduler.start()
    logger.info(
        "✅ Surge scheduler started (interval=%ds, TTL=%ds).",
        settings.surge_push_interval_seconds,
        settings.surge_redis_ttl,
    )


async def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("🛑 Surge scheduler stopped.")
