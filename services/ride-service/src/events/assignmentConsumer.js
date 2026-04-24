const { Kafka } = require('kafkajs');
const rideService = require('../services/ride.service');

let consumer;

async function startAssignmentConsumer(env) {
  const topics = Array.isArray(env.assignmentTopics) ? env.assignmentTopics.filter(Boolean) : [];
  if (!env.kafkaEnabled || env.kafkaBrokers.length === 0 || topics.length === 0) {
    console.log('[ride-service] Kafka disabled for assignment consumer');
    return;
  }

  const kafka = new Kafka({ clientId: `${env.kafkaClientId}-assignment`, brokers: env.kafkaBrokers });
  consumer = kafka.consumer({ groupId: `${env.kafkaGroupId}-assignment` });

  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ message, topic }) => {
      try {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());
        const rideId = payload.rideId || payload.bookingId;
        const driverId = payload.driverId;

        if (!rideId || !driverId) {
          return;
        }

        await rideService.assignDriver(rideId, driverId, {
          publishAssignmentEvent: false,
          assignmentMetadata: {
            eventId: payload.eventId || null,
            timestamp: payload.timestamp || payload.assignedAt || null,
            decisionSource: payload.decisionSource || null,
          },
        });

        console.log(`[ride-service] applied assignment event from ${topic} for ride ${rideId}`);
      } catch (error) {
        console.error('[ride-service] Error processing assignment event:', error.message);
      }
    },
  });
}

async function stopAssignmentConsumer() {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
}

module.exports = {
  startAssignmentConsumer,
  stopAssignmentConsumer,
};
