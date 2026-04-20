/**
 * Event Publisher - Publishes traffic and ETA updates back to Kafka
 * Enables real-time propagation of updated ETAs to other services
 */

export async function publishTrafficUpdate({
  rideId,
  driverId,
  etaData,
  location,
  timestamp,
  config,
  producer,
  logger
}) {
  try {
    const trafficUpdateEvent = {
      rideId,
      driverId,
      timestamp: timestamp || new Date().toISOString(),
      location,
      eta: {
        estimatedSeconds: etaData.etaSeconds,
        estimatedMinutes: etaData.etaMinutes,
        distanceMeters: etaData.distanceMeters,
        provider: etaData.provider,
        routeLabel: etaData.routeLabel
      },
      biasCorrection: etaData.biasCorrection || null,
      eventId: `traffic-${rideId}-${Date.now()}`
    };

    await producer.send({
      topic: config.kafka.topics.trafficUpdates,
      messages: [
        {
          key: rideId, // Partition by rideId for ordering
          value: JSON.stringify(trafficUpdateEvent),
          headers: {
            "content-type": "application/json",
            "source": "eta-tracking-consumer",
            "correlation-id": rideId
          },
          timestamp: Date.now().toString()
        }
      ]
    });

    logger.debug("📤 Traffic update published", {
      rideId,
      topic: config.kafka.topics.trafficUpdates,
      etaSeconds: etaData.etaSeconds
    });

    return trafficUpdateEvent;

  } catch (error) {
    logger.error("Failed to publish traffic update", {
      rideId,
      error: error.message
    });
    // Non-critical error - don't throw
  }
}

/**
 * Publish ETA recalculation event (audit trail)
 */
export async function publishEtaRecalculationEvent({
  rideId,
  driverId,
  previousEta,
  newEta,
  reason,
  config,
  producer,
  logger
}) {
  try {
    const event = {
      eventType: "eta.recalculated",
      rideId,
      driverId,
      previousEta,
      newEta,
      delta: newEta - previousEta,
      reason,
      timestamp: new Date().toISOString(),
      source: "eta-tracking-consumer"
    };

    // Could publish to different topic for audit
    await producer.send({
      topic: "eta.recalculation.events",
      messages: [
        {
          key: rideId,
          value: JSON.stringify(event)
        }
      ]
    });

    logger.debug("📊 ETA recalculation event published", {
      rideId,
      delta: event.delta,
      reason
    });

  } catch (error) {
    logger.warn("Failed to publish recalculation event", {
      error: error.message
    });
  }
}
