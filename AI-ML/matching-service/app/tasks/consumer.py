import json
import logging
import asyncio
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from app.config import settings
from app.database import get_mongo_db, get_redis

logger = logging.getLogger(__name__)

async def start_matching_consumer():
    while True:
        try:
            consumer = AIOKafkaConsumer(
                "ride.created",
                bootstrap_servers=settings.kafka_bootstrap_servers,
                group_id="matching-service-group",
                auto_offset_reset="earliest"
            )
            await consumer.start()
            logger.info("🚀 [Matching Task] Consumer started and listening to 'ride.created'...")
            break
        except Exception as e:
            logger.error(f"⏳ [Matching Task] Kafka not ready, retrying in 5s... Error: {str(e)}")
            await asyncio.sleep(5)

    producer = AIOKafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        value_serializer=lambda value: json.dumps(value).encode("utf-8"),
    )
    await producer.start()

    try:
        async for msg in consumer:
            try:
                data = json.loads(msg.value.decode("utf-8"))
                event_type = data.get("type") or data.get("event_type")

                if event_type == "RideCreated":
                    # Use bookingId as primary reference during matching phase
                    booking_id = data.get("bookingId") or data.get("rideId")
                    pickup = data.get("pickup")
                    
                    if not pickup:
                        logger.warning("⚠️ [Matching Task] Missing pickup payload for booking %s", booking_id)
                        continue

                    lat = pickup.get("lat")
                    lng = pickup.get("lng")

                    logger.info(f"🔍 [Matching Task] Processing RideCreated for bookingId: {booking_id}")

                    # 1. GEORADIUS to find drivers
                    redis = get_redis()
                    drivers = await redis.georadius("drivers:geo", lng, lat, 5, "km", count=1)

                    if drivers:
                        selected_driver_id = drivers[0]
                        logger.info(f"✅ [Matching Task] Found driver {selected_driver_id} for booking {booking_id}")

                        # Following Sequence Diagram 9.1: Only notify, don't update DB directly
                        # The Booking Service will act as Orchestrator and update its own DB
                        assignment_event = {
                            "eventId": data.get("eventId") or "evt-" + booking_id[:8],
                            "eventType": "RideAssigned",
                            "type": "RideAssigned",
                            "bookingId": booking_id,
                            "rideId": data.get("rideId") or booking_id,
                            "driverId": selected_driver_id,
                            "userId": data.get("userId"),
                            "pickup": data.get("pickup"),
                            "destination": data.get("drop") or data.get("destination"),
                            "priceSnapshot": data.get("priceSnapshot"),
                            "vehicleType": data.get("vehicleType"),
                            "paymentMethod": data.get("paymentMethod"),
                            "status": "WAITING_FOR_ACCEPTANCE",
                            "timestamp": data.get("timestamp"),
                            "source": "matching-service",
                        }
                        await producer.send_and_wait(settings.ride_assigned_topic, assignment_event)
                        legacy_topic = getattr(settings, "legacy_driver_assigned_topic", "")
                        if legacy_topic and legacy_topic != settings.ride_assigned_topic:
                            await producer.send_and_wait(
                                legacy_topic,
                                {
                                    **assignment_event,
                                    "eventType": "DriverAssigned",
                                    "type": "DriverAssigned",
                                },
                            )
                        logger.info(
                            "📤 [Matching Task] Published %s (RideAssigned) for booking %s",
                            settings.ride_assigned_topic,
                            booking_id,
                        )
                    else:
                        logger.warning(f"❌ [Matching Task] No drivers online within 5km for booking {booking_id}")
            except Exception as e:
                logger.error(f"❌ [Matching Task] Error processing message: {str(e)}")

    finally:
        await consumer.stop()
        await producer.stop()
