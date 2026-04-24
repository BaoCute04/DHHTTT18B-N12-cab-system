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
            # Khởi tạo consumer bên trong vòng lặp để đảm bảo sạch sẽ mỗi lần thử lại
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
        except BaseException as be:
            logger.error(f"⚠️ [Matching Task] Critical connection error: {str(be)}")
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
                    ride_id = data.get("rideId") or data.get("ride_id")
                    pickup = data.get("pickup")
                    if not pickup:
                        logger.warning("⚠️ [Matching Task] Missing pickup payload for ride %s", ride_id)
                        continue

                    lat = pickup.get("lat")
                    lng = pickup.get("lng")

                    logger.info(f"🔍 [Matching Task] Processing RideCreated for ride_id: {ride_id}")

                    # 1. GEORADIUS to find drivers
                    redis = get_redis()
                    # member: driverId. Trả về list các driverId gần đó.
                    drivers = await redis.georadius("drivers:geo", lng, lat, 5, "km", count=1)

                    if drivers:
                        selected_driver_id = drivers[0]
                        logger.info(f"✅ [Matching Task] Found driver {selected_driver_id} for ride {ride_id}")

                        # 2. Update Booking MongoDB (Phải kết nối sang máy chủ booking-mongodb)
                        from motor.motor_asyncio import AsyncIOMotorClient
                        booking_client = AsyncIOMotorClient("mongodb://booking-mongodb:27017")
                        booking_db = booking_client["cab_booking_booking"]
                        
                        result = await booking_db["bookings"].update_one(
                            {"bookingId": ride_id},
                            {"$set": {"status": "ASSIGNED", "driverId": selected_driver_id}}
                        )
                        
                        if result.modified_count > 0:
                            logger.info(f"✨ [Matching Task] Ride {ride_id} status updated to ASSIGNED")
                            
                            # [BỔ SUNG] Cập nhật tài xế thành BUSY (Phải kết nối sang máy chủ driver-mongodb)
                            driver_client = AsyncIOMotorClient("mongodb://driver-mongodb:27017")
                            driver_db = driver_client["cab_booking_driver"]
                            await driver_db["drivers"].update_one(
                                {"driverId": selected_driver_id},
                                {"$set": {"availability": "BUSY"}}
                            )
                            logger.info(f"🔒 [Matching Task] Driver {selected_driver_id} set to BUSY")

                            await producer.send_and_wait(
                                settings.ride_assigned_topic,
                                {
                                    "eventId": data.get("eventId"),
                                    "type": "DriverAssigned",
                                    "rideId": ride_id,
                                    "bookingId": data.get("bookingId") or ride_id,
                                    "driverId": selected_driver_id,
                                    "userId": data.get("userId"),
                                    "timestamp": data.get("timestamp"),
                                },
                            )
                            logger.info(
                                "📤 [Matching Task] Published %s for ride %s",
                                settings.ride_assigned_topic,
                                ride_id,
                            )
                        else:
                            logger.warning(f"⚠️ [Matching Task] Ride {ride_id} found but not updated (maybe status already changed)")
                    else:
                        logger.warning(f"❌ [Matching Task] No drivers online within 5km for ride {ride_id}")
            except Exception as e:
                logger.error(f"❌ [Matching Task] Error processing message: {str(e)}")

    finally:
        await consumer.stop()
        await producer.stop()
