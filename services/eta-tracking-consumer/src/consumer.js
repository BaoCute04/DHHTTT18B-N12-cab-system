import { Kafka } from "kafkajs";
import { calculateEta } from "./eta-calculator.js";
import { publishTrafficUpdate } from "./event-publisher.js";
import { applyBiasCorrection } from "./bias-correction.js";

export async function createEtaTrackingConsumer(config, logger) {
  const kafka = new Kafka({
    clientId: config.serviceName,
    brokers: config.kafka.brokers,
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  });

  const consumer = kafka.consumer({
    groupId: config.kafka.groupId,
    ...config.kafka.consumerConfig
  });

  const producer = kafka.producer({
    allowAutoTopicCreation: true
  });

  try {
    await consumer.connect();
    await producer.connect();
    logger.info(`✅ Kafka connected - brokers: ${config.kafka.brokers.join(",")}`);
    
    await consumer.subscribe({
      topics: [config.kafka.topics.driverLocationUpdated],
      fromBeginning: false
    });

    logger.info(`📡 Subscribed to: ${config.kafka.topics.driverLocationUpdated}`);

    // Start consuming messages
    await consumer.run({
      partitionsConsumedConcurrently: 3,
      eachMessage: async ({ topic, partition, message }) => {
        try {
          await handleLocationUpdate(message, config, logger, producer);
        } catch (error) {
          logger.error(`Error processing message from partition ${partition}:`, error);
          // Don't throw - continue processing other messages
        }
      }
    });

  } catch (error) {
    logger.error("Kafka setup error:", error);
    throw error;
  }

  return {
    disconnect: async () => {
      await consumer.disconnect();
      await producer.disconnect();
      logger.info("✅ Kafka disconnected");
    }
  };
}

async function handleLocationUpdate(message, config, logger, producer) {
  try {
    const locationEvent = JSON.parse(message.value.toString());
    
    const {
      rideId,
      driverId,
      location,
      timestamp,
      speed,
      heading
    } = locationEvent;

    if (!rideId || !driverId || !location) {
      logger.warn("Invalid location event - missing required fields", {
        rideId,
        driverId,
        hasLocation: !!location
      });
      return;
    }

    logger.debug("📍 Processing location update", {
      rideId,
      driverId,
      lat: location.lat,
      lng: location.lng
    });

    // Get active ride from ETA service
    let etaData = null;
    try {
      const etaResponse = await calculateEta({
        rideId,
        driverLocation: location,
        config,
        logger
      });

      if (etaResponse) {
        etaData = etaResponse;
        
        // Apply AI bias correction if enabled
        if (config.features.enableBiasCorrection && etaData.etaSeconds) {
          const correctedEta = await applyBiasCorrection({
            rideId,
            originalEta: etaData.etaSeconds,
            distance: etaData.distanceMeters,
            provider: etaData.provider,
            config,
            logger
          });

          if (correctedEta) {
            etaData.etaSeconds = correctedEta.etaSeconds;
            etaData.etaMinutes = Math.max(1, Math.round(correctedEta.etaSeconds / 60));
            etaData.biasCorrection = correctedEta.correction;
            logger.debug("🤖 Bias correction applied", {
              rideId,
              original: etaResponse.etaSeconds,
              corrected: correctedEta.etaSeconds,
              factor: correctedEta.factor.toFixed(2)
            });
          }
        }

        // Publish traffic update event
        if (config.features.publishTrafficUpdates) {
          await publishTrafficUpdate({
            rideId,
            driverId,
            etaData,
            location,
            timestamp,
            config,
            producer,
            logger
          });
        }

        logger.info("✅ ETA updated", {
          rideId,
          etaSeconds: etaData.etaSeconds,
          etaMinutes: etaData.etaMinutes,
          provider: etaData.provider
        });
      }
    } catch (etaError) {
      logger.error("Failed to calculate ETA", {
        rideId,
        error: etaError.message
      });
      // Continue - don't block on ETA failures
    }

  } catch (error) {
    logger.error("Failed to handle location update:", error);
  }
}
