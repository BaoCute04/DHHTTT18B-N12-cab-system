/**
 * Kafka Event Publisher for ETA Service
 * Publishes ETA-related events for other services to consume
 */

export function createEtaEventPublisher({ kafkaProducer, config = {}, logger = console } = {}) {
  return {
    /**
     * Publish ETA estimate updated event
     */
    async publishEtaUpdated(event) {
      if (!kafkaProducer) {
        logger.debug("Kafka producer not available, skipping event publish");
        return null;
      }

      try {
        const {
          rideId,
          etaSeconds,
          etaMinutes,
          distanceMeters,
          provider,
          previousEta,
          trafficSeconds
        } = event;

        const topic = config.topicEtaUpdated || "eta.updated";

        const message = {
          rideId,
          etaSeconds,
          etaMinutes,
          distanceMeters,
          provider,
          trafficSeconds,
          previousEta,
          updatedAt: new Date().toISOString(),
          source: "eta-service"
        };

        await kafkaProducer.send({
          topic,
          messages: [
            {
              key: rideId,
              value: JSON.stringify(message),
              headers: {
                "content-type": "application/json",
                "source": "eta-service",
                "correlation-id": rideId
              }
            }
          ]
        });

        logger.debug("📤 ETA updated event published", {
          rideId,
          topic,
          etaSeconds
        });

        return message;

      } catch (error) {
        logger.error("Failed to publish ETA updated event:", error);
        return null;
      }
    },

    /**
     * Publish ride cached event
     */
    async publishRideCached(rideData) {
      if (!kafkaProducer) return null;

      try {
        const topic = config.topicRideCached || "ride.cached";

        const message = {
          rideId: rideData.rideId,
          driverId: rideData.driverId,
          status: rideData.status,
          cachedAt: new Date().toISOString(),
          ttlSeconds: config.activeRideTtlSeconds || 86400,
          source: "eta-service"
        };

        await kafkaProducer.send({
          topic,
          messages: [{
            key: rideData.rideId,
            value: JSON.stringify(message)
          }]
        });

        return message;

      } catch (error) {
        logger.warn("Failed to publish ride cached event:", error);
        return null;
      }
    }
  };
}
