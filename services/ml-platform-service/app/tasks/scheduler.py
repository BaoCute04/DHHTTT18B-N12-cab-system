"""
scheduler.py
────────────
Background task: mỗi SURGE_PUSH_INTERVAL_SECONDS giây,
fetch zone metrics từ Redis (live) hoặc MongoDB (fallback),
predict surge multiplier bằng XGBoost, và PUSH kết quả
vào Redis với key `surge_zone:{zoneId}`.

Pricing Service (Node.js) chỉ cần GET từ Redis.
"""

import json
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import get_mongo_db, get_redis
from app.serve.surge_predictor import predict_surge
from app.trainers.matching_trainer import run_matching_training

logger = logging.getLogger(__name__)

# ── Scheduler singleton ────────────────────────────────────────────────────────
_scheduler = AsyncIOScheduler(timezone="UTC")

async def _build_live_zones(redis) -> list[dict]:
    """
    Scan Redis để tìm tất cả zone đang có tài xế active (supply:zone:*).
    Đây là các Geohash zone thực tế do driver-service ghi vào.
    Với mỗi zone: đọc supply count + demand count → làm input feature XGBoost.
    """
    if redis is None:
        return []

    live_zones = []
    try:
        supply_keys = await redis.keys("supply:zone:*")
        if not supply_keys:
            return []

        for key in supply_keys:
            # key dạng "supply:zone:w7epx" → lấy phần cuối
            geohash = key.split(":")[-1]
            supply_count = await redis.scard(f"supply:zone:{geohash}")
            demand_count = await redis.scard(f"demand:zone:{geohash}")

            live_zones.append({
                "zoneId": geohash,
                "supply_count": float(supply_count),
                "demand_count": float(demand_count),
                "avg_speed_kmh": 20.0,   # mặc định — chưa có nguồn dữ liệu tốc độ
                "rain_indicator": 0,
            })

        logger.info(
            "📍 [Surge Push] %d live zones từ Redis: %s",
            len(live_zones),
            [z["zoneId"] for z in live_zones],
        )
    except Exception as exc:
        logger.error("❌ [_build_live_zones] Lỗi scan Redis: %s", exc)

    return live_zones


async def _push_surge_for_all_zones() -> None:
    """
    Core scheduled task.
    Priority order:
      1. Live zones từ Redis (supply:zone:* keys của driver-service)
      2. Zones từ MongoDB zone_metrics collection
      3. Cold-start mock zones (cuối cùng)
    """
    try:
        db = get_mongo_db()
        try:
            redis = get_redis()
        except RuntimeError:
            logger.warning("Redis not available, skipping live zone scan.")
            redis = None

        # ── 1. Ưu tiên zones live từ Redis ───────────────────────────────────
        zones = []
        if redis:
            zones = await _build_live_zones(redis)

        # ── 2. Fallback: zones từ MongoDB ─────────────────────────────────────
        if not zones:
            zones = await db.zone_metrics.find({}, {"_id": 0}).to_list(length=200)

        # ── 3. Nếu vẫn không có zones nào, bỏ qua không làm gì cả ────────────
        if not zones:
            logger.info("ℹ️ Không có tài xế nào active. Tạm ngưng chạy AI...")
            return

        # ── 4. Enrich với current hour/day ────────────────────────────────────
        now = datetime.now(tz=timezone.utc)
        for zone in zones:
            zone.setdefault("hour_of_day", now.hour)
            zone.setdefault("day_of_week", now.weekday())

        # ── 5. Predict & Push ──────────────────────────────────────────────────
        pushed: list[dict] = []
        for zone in zones:
            zone_id = zone.get("zoneId", "zone_unknown")
            surge = predict_surge(zone, settings.model_store_path)

            if redis:
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
                await redis.setex(redis_key, settings.surge_redis_ttl, payload)
                pushed.append({"zone": zone_id, "surge": surge})
            else:
                logger.info("Redis not available, skipping surge push for zone=%s surge=%.2f", zone_id, surge)

        if pushed:
            logger.info(
                "✅ [Surge Push] %d zones pushed → %s",
                len(pushed),
                pushed,
            )

    except Exception as exc:
        logger.error("❌ [Surge Push] Task failed: %s", exc, exc_info=True)


async def _retrain_matching_model() -> None:
    try:
        result = await run_matching_training()
        logger.info("✅ Matching retrain completed: %s", result)
    except Exception as exc:
        logger.error("❌ Matching retrain failed: %s", exc, exc_info=True)


# ── Public API ─────────────────────────────────────────────────────────────────
async def start_scheduler() -> None:
    _scheduler.add_job(
        _push_surge_for_all_zones,
        trigger="interval",
        seconds=settings.surge_push_interval_seconds,
        id="surge_push_job",
        replace_existing=True,
        next_run_time=datetime.now(tz=timezone.utc),
    )
    _scheduler.start()
    logger.info(
        "✅ Surge scheduler started (interval=%ds, TTL=%ds).",
        settings.surge_push_interval_seconds,
        settings.surge_redis_ttl,
    )

    _scheduler.add_job(
        _retrain_matching_model,
        trigger="interval",
        seconds=settings.matching_retrain_interval_seconds,
        id="matching_retrain_job",
        replace_existing=True,
        next_run_time=datetime.now(tz=timezone.utc),
    )
    logger.info(
        "✅ Matching retrain scheduler started (interval=%ds).",
        settings.matching_retrain_interval_seconds,
    )


async def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("🛑 Surge scheduler stopped.")
