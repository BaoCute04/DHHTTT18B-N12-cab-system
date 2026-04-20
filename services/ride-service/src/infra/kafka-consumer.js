const { Kafka } = require("kafkajs");

let kafkaConsumerInstance = null;

async function initializeKafkaConsumers(config = {}) {
  try {
    const brokers = (config.brokers || process.env.KAFKA_BROKERS || "kafka:9092")
      .split(",")
      .map((b) => b.trim());

    const kafka = new Kafka({
      clientId: config.clientId || "ride-service",
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    const consumer = kafka.consumer({
      groupId: process.env.KAFKA_CONSUMER_GROUP_ID || "ride-service-group",
      sessionTimeout: 30000,
      rebalanceTimeout: 60000
    });

    await consumer.connect();
    kafkaConsumerInstance = consumer;

    const topicsToSubscribe = [
      process.env.KAFKA_TOPIC_RIDE_CREATED || "ride.created",
      process.env.KAFKA_TOPIC_PAYMENT_SUCCESS || "payment.success",
      process.env.KAFKA_TOPIC_DRIVER_ASSIGNED || "driver.assigned",
      process.env.KAFKA_TOPIC_TRAFFIC_UPDATES || "traffic.updates"
    ];

    for (const topic of topicsToSubscribe) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    console.log("[ride-service] Kafka consumer connected", { topics: topicsToSubscribe });
    return consumer;
  } catch (error) {
    console.error("[ride-service] Kafka consumer initialization failed:", error);
    throw error;
  }
}

async function startConsumingEvents(handlers = {}) {
  if (!kafkaConsumerInstance) {
    console.warn("[ride-service] Kafka consumer not initialized");
    return;
  }

  await kafkaConsumerInstance.run({
    partitionsConsumedConcurrently: 3,
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());

        if (topic === (process.env.KAFKA_TOPIC_RIDE_CREATED || "ride.created")) {
          await handlers.onRideCreated?.(event);
        } else if (topic === (process.env.KAFKA_TOPIC_PAYMENT_SUCCESS || "payment.success")) {
          await handlers.onPaymentSuccess?.(event);
        } else if (topic === (process.env.KAFKA_TOPIC_DRIVER_ASSIGNED || "driver.assigned")) {
          await handlers.onDriverAssigned?.(event);
        } else if (topic === (process.env.KAFKA_TOPIC_TRAFFIC_UPDATES || "traffic.updates")) {
          await handlers.onTrafficUpdate?.(event);
        }
      } catch (error) {
        console.error(`[ride-service] Error processing message from ${topic}:`, error);
      }
    }
  });

  console.log("[ride-service] Event consumer running");
}

const defaultHandlers = {
  async onRideCreated(event) {
    console.log("[ride-service] Ride created event", { rideId: event.rideId });
  },
  async onPaymentSuccess(event) {
    console.log("[ride-service] Payment success event", { rideId: event.rideId });
  },
  async onDriverAssigned(event) {
    console.log("[ride-service] Driver assigned event", { rideId: event.rideId, driverId: event.driverId });
  },
  async onTrafficUpdate(event) {
    console.log("[ride-service] Traffic update event", {
      rideId: event.rideId,
      etaSeconds: event?.eta?.estimatedSeconds || null
    });
  }
};

async function disconnectKafkaConsumer() {
  if (!kafkaConsumerInstance) {
    return;
  }

  try {
    await kafkaConsumerInstance.disconnect();
    console.log("[ride-service] Kafka consumer disconnected");
  } catch (error) {
    console.error("[ride-service] Error disconnecting Kafka consumer:", error);
  }
}

module.exports = {
  initializeKafkaConsumers,
  startConsumingEvents,
  defaultHandlers,
  disconnectKafkaConsumer
};
