/**
 * ETA Tracking Consumer Service
 * Consumes driver location updates from Kafka
 * Automatically recalculates ETA for active rides
 * Publishes updated ETA back to clients via traffic-updates topic
 */

import { Kafka } from 'kafkajs';
import etaService from '../services/eta.service.js';

const kafka = new Kafka({
  clientId: 'eta-tracking-consumer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({
  groupId: 'eta-tracking-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
});

// Cache of active rides for quick lookup
const activeRides = new Map();

/**
 * Register an active ride for location tracking
 */
export function registerActiveRide(rideData) {
  activeRides.set(rideData.rideId, {
    rideId: rideData.rideId,
    driverId: rideData.driverId,
    pickup: rideData.pickup,
    destination: rideData.destination,
    status: rideData.status, // 'accepted', 'arrived-pickup', 'en-route', etc.
    registeredAt: Date.now(),
  });

  console.log(`[ETATracking] Registered active ride: ${rideData.rideId}`);
}

/**
 * Unregister a completed ride
 */
export function unregisterActiveRide(rideId) {
  activeRides.delete(rideId);
  console.log(`[ETATracking] Unregistered ride: ${rideId}`);
}

/**
 * Get active rides for a driver
 */
function getDriverActiveRides(driverId) {
  return Array.from(activeRides.values()).filter(
    (ride) => ride.driverId === driverId
  );
}

/**
 * Start consuming driver location updates and recalculating ETA
 */
export async function startETATracking() {
  try {
    await consumer.connect();
    await producer.connect();
    
    console.log('[ETATracking] Connected to Kafka');

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
          await processLocationUpdateForETA(locationUpdate);
        } catch (error) {
          console.error('[ETATracking] Error processing message:', error.message);
        }
      },
    });
  } catch (error) {
    console.error('[ETATracking] Failed to start:', error.message);
    throw error;
  }
}

/**
 * Process location update and recalculate ETA for active rides
 */
async function processLocationUpdateForETA(locationUpdate) {
  try {
    const { driverId, location, timestamp } = locationUpdate;

    // Get active rides for this driver
    const activeRidesForDriver = getDriverActiveRides(driverId);

    if (activeRidesForDriver.length === 0) {
      return; // No active rides, skip
    }

    // Recalculate ETA for each active ride
    for (const ride of activeRidesForDriver) {
      try {
        const currentLocation = {
          lat: location.lat,
          lng: location.lng,
        };

        let rideEstimates;

        if (
          ride.status === 'accepted' ||
          ride.status === 'driver-arrived' ||
          ride.status === 'in-progress'
        ) {
          // Get full estimates: driver location → pickup → destination
          rideEstimates = await etaService.calculateRideEstimates(
            currentLocation,
            ride.pickup,
            ride.destination,
            30,
            ride.rideId
          );

          // Store for client updates
          ride.currentEta = rideEstimates;
          ride.lastLocationUpdate = timestamp;

          console.log(
            `[ETATracking] Updated ETA for ride ${ride.rideId}: ${rideEstimates.totalEta} min`
          );
        }
      } catch (error) {
        console.error(
          `[ETATracking] Error recalculating ETA for ride ${ride.rideId}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error('[ETATracking] Error in processLocationUpdateForETA:', error.message);
  }
}

/**
 * Stop ETA tracking consumer
 */
export async function stopETATracking() {
  try {
    await consumer.disconnect();
    await producer.disconnect();
    console.log('[ETATracking] Disconnected from Kafka');
  } catch (error) {
    console.error('[ETATracking] Error disconnecting:', error.message);
  }
}

/**
 * Get current ETA for a ride
 */
export function getCurrentRideETA(rideId) {
  const ride = activeRides.get(rideId);
  if (!ride) {
    return null;
  }

  return {
    rideId,
    ...ride.currentEta,
    lastUpdate: ride.lastLocationUpdate,
  };
}

/**
 * Get all active rides
 */
export function getAllActiveRides() {
  return Array.from(activeRides.values());
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await stopETATracking();
  process.exit(0);
});

export default {
  startETATracking,
  stopETATracking,
  registerActiveRide,
  unregisterActiveRide,
  getCurrentRideETA,
  getAllActiveRides,
};
