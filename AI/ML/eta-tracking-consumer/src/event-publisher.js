import { Kafka, logLevel } from "kafkajs";

export async function createTrafficPublisher(config, logger = console) {
  if (!config.kafkaBrokers.length) {
    return {
      connected: false,
      async publishTrafficUpdate() {
        return false;
      },
      async disconnect() {
        return true;
      }
    };
  }

  const kafka = new Kafka({
    clientId: "eta-tracking-publisher",
    brokers: config.kafkaBrokers,
    logLevel: logLevel.NOTHING
  });

  const producer = kafka.producer();

  try {
    await producer.connect();
  } catch (error) {
    logger.warn?.(`[eta-tracking] publisher disabled: ${error.message}`);
    return {
      connected: false,
      async publishTrafficUpdate() {
        return false;
      },
      async disconnect() {
        return true;
      }
    };
  }

  return {
    connected: true,
    async publishTrafficUpdate(payload) {
      await producer.send({
        topic: config.trafficUpdatesTopic,
        messages: [
          {
            key: payload.rideId || null,
            value: JSON.stringify(payload)
          }
        ]
      });
      return true;
    },
    async disconnect() {
      await producer.disconnect();
      return true;
    }
  };
}
