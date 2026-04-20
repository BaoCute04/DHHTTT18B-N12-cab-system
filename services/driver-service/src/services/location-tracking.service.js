/**
 * Real-time Location Tracking Service
 * Consumes driver location updates from Kafka
 * Triggers ETA recalculation for active rides
 * Caches locations in Redis for matching
 */

import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'location-tracking-consumer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({
  groupId: 'location-tracking-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

/**
 * Start consuming driver location updates
 */
export async function startLocationTracking() {
  try {
    await consumer.connect();
    console.log('[LocationTracking] Connected to Kafka');

    // Subscribe to driver location updates
    await consumer.subscribe({
      topic: 'driver.location.updated',
      fromBeginning: false,
    });

    // Handle location updates
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const locationUpdate = JSON.parse(message.value.toString());
          
          console.log(`[LocationTracking] Received location update for driver ${locationUpdate.driverId}:`, {
            lat: locationUpdate.location.lat,
            lng: locationUpdate.location.lng,
            timestamp: locationUpdate.timestamp,
          });

          // Process location update
          await processLocationUpdate(locationUpdate);
        } catch (error) {
          console.error('[LocationTracking] Error processing message:', error.message);
        }
      },
    });
  } catch (error) {
    console.error('[LocationTracking] Failed to start:', error.message);
    throw error;
  }
}

/**
 * Process a driver location update
 * @param {Object} locationUpdate - { driverId, location, timestamp }
 */
async function processLocationUpdate(locationUpdate) {
  try {
    const { driverId, location, timestamp } = locationUpdate;

    // TODO: Integrate with ride-service to:
    // 1. Find active ride for this driver
    // 2. Get passenger location (pickup or current)
    // 3. Calculate updated ETA
    // 4. Publish ETA update event
    // 5. Push notification to passenger

    console.log(`[LocationTracking] Processing location update for ${driverId} at ${location.lat}, ${location.lng}`);

    // Example: Could call ride-service API or producer
    // await publishETAUpdate({
    //   rideId: activeRide.id,
    //   driverId,
    //   currentLocation: location,
    //   timestamp
    // });
  } catch (error) {
    console.error('[LocationTracking] Error processing location update:', error.message);
  }
}

/**
 * Stop location tracking
 */
export async function stopLocationTracking() {
  try {
    await consumer.disconnect();
    console.log('[LocationTracking] Disconnected from Kafka');
  } catch (error) {
    console.error('[LocationTracking] Error disconnecting:', error.message);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await stopLocationTracking();
  process.exit(0);
});

export default {
  startLocationTracking,
  stopLocationTracking,
};
