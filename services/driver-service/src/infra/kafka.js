/**
 * Kafka Event Publisher for Driver Service
 * Publishes driver location updates and status changes in real-time
 */

import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'driver-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  connectionTimeout: 10000,
  requestTimeout: 30000,
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
});

let isConnected = false;

/**
 * Ensure producer is connected
 */
async function ensureConnected() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('[Kafka] Producer connected for driver-service');
  }
}

/**
 * Publish driver location updated event
 * @param {Object} driverLocation - { driverId, lat, lng, address, timestamp }
 */
export async function publishDriverLocationUpdated(driverLocation) {
  try {
    await ensureConnected();

    await producer.send({
      topic: 'driver.location.updated',
      messages: [
        {
          key: driverLocation.driverId,
          value: JSON.stringify({
            driverId: driverLocation.driverId,
            location: {
              lat: driverLocation.lat,
              lng: driverLocation.lng,
              address: driverLocation.address,
            },
            timestamp: driverLocation.timestamp || new Date().toISOString(),
          }),
          headers: {
            'event-type': 'driver-location-update',
            'service': 'driver-service',
          },
        },
      ],
    });

    console.log(`[Kafka] Published DriverLocationUpdated for driver ${driverLocation.driverId}`);
  } catch (error) {
    console.error('[Kafka] Error publishing DriverLocationUpdated:', error.message);
    throw error;
  }
}

/**
 * Publish driver assigned event
 * @param {Object} assignment - { driverId, rideId }
 */
export async function publishDriverAssigned(assignment) {
  try {
    await ensureConnected();

    await producer.send({
      topic: 'driver.assigned',
      messages: [
        {
          key: assignment.driverId,
          value: JSON.stringify({
            driverId: assignment.driverId,
            rideId: assignment.rideId,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    console.log(`[Kafka] Published DriverAssigned: ${assignment.driverId} -> ride ${assignment.rideId}`);
  } catch (error) {
    console.error('[Kafka] Error publishing DriverAssigned:', error.message);
  }
}

/**
 * Publish driver status changed event
 * @param {Object} statusChange - { driverId, status, availability }
 */
export async function publishDriverStatusChanged(statusChange) {
  try {
    await ensureConnected();

    await producer.send({
      topic: 'driver.status.changed',
      messages: [
        {
          key: statusChange.driverId,
          value: JSON.stringify({
            driverId: statusChange.driverId,
            status: statusChange.status,
            availability: statusChange.availability,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    console.log(`[Kafka] Published DriverStatusChanged: ${statusChange.driverId} -> ${statusChange.status}`);
  } catch (error) {
    console.error('[Kafka] Error publishing DriverStatusChanged:', error.message);
  }
}

/**
 * Graceful shutdown
 */
export async function disconnectProducer() {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('[Kafka] Producer disconnected');
  }
}

export { producer };
