import { Kafka, logLevel } from "kafkajs";
import { calculateEta, getActiveRide } from "./eta-calculator.js";

function parseMessage(buffer) {
  try {
    return JSON.parse(buffer?.toString("utf8") || "{}");
  } catch {
    return null;
  }
}

function normalizeLocationEvent(message) {
  const payload = message?.payload || message || {};
  const rideId = payload.rideId || payload.tripId || null;
  const driverId = payload.driverId || payload.driver?.id || null;

  const lat = payload.lat ?? payload.latitude ?? payload.location?.lat;
  const lng = payload.lng ?? payload.longitude ?? payload.location?.lng;
  const address = payload.address || payload.location?.address || "unknown";

  const target = payload.targetLocation || payload.pickup || payload.destination;
  const targetLat = target?.lat;
  const targetLng = target?.lng;
  const targetAddress = target?.address || "target";

  if (!rideId || !driverId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    rideId,
    driverId,
    mode: payload.mode || "to-pickup",
    driverLocation: {
      lat,
      lng,
      address
    },
    targetLocation: Number.isFinite(targetLat) && Number.isFinite(targetLng)
      ? {
          lat: targetLat,
          lng: targetLng,
          address: targetAddress
        }
      : null,
    historicalBias: payload.historicalBias
  };
}

function resolveTargetFromActiveRide(activeRide) {
  const target = activeRide?.lastTargetLocation || activeRide?.targetLocation || null;
  if (!target) {
    return null;
  }

  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) {
    return null;
  }

  return {
    lat: target.lat,
    lng: target.lng,
    address: target.address || "target"
  };
}

export async function startTrackingConsumer({ config, logger, eventPublisher }) {
  if (!config.kafkaBrokers.length) {
    logger.warn("Kafka brokers missing. Tracking consumer disabled");
    return { async disconnect() { return true; } };
  }

  const kafka = new Kafka({
    clientId: "eta-tracking-consumer",
    brokers: config.kafkaBrokers,
    logLevel: logLevel.NOTHING
  });

  const consumer = kafka.consumer({ groupId: config.consumerGroup });

  await consumer.connect();
  await consumer.subscribe({ topic: config.driverLocationTopic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = parseMessage(message.value);
      if (!payload) {
        logger.warn(`Ignored invalid JSON from ${topic}`);
        return;
      }

      const etaRequest = normalizeLocationEvent(payload);
      if (!etaRequest) {
        logger.warn("Ignored location event with missing ride/driver/location fields");
        return;
      }

      try {
        if (!etaRequest.targetLocation) {
          const activeRide = await getActiveRide(etaRequest.rideId, config);
          const fallbackTarget = resolveTargetFromActiveRide(activeRide);

          if (!fallbackTarget) {
            logger.warn(`Skipped ride ${etaRequest.rideId}: target location unavailable`);
            return;
          }

          etaRequest.targetLocation = fallbackTarget;
        }

        const estimate = await calculateEta(etaRequest, config);

        if (eventPublisher.connected) {
          await eventPublisher.publishTrafficUpdate({
            event: "traffic.updated",
            rideId: estimate.rideId,
            driverId: estimate.driverId,
            etaSeconds: estimate.etaSeconds,
            etaMinutes: estimate.etaMinutes,
            provider: estimate.provider,
            calculatedAt: estimate.calculatedAt
          });
        }

        logger.info(`ETA updated for ride ${estimate.rideId}: ${estimate.etaMinutes} min`);
      } catch (error) {
        logger.warn(`Failed processing ride ${etaRequest.rideId}: ${error.message}`);
      }
    }
  });

  return {
    async disconnect() {
      await consumer.disconnect();
      return true;
    }
  };
}
