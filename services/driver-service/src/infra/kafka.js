import { Kafka, logLevel } from "kafkajs";

let producer = null;

function parseBrokers(rawBrokers = process.env.KAFKA_BROKERS) {
  return String(rawBrokers || "")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);
}

export async function initializeDriverKafkaProducer(logger = console) {
  const brokers = parseBrokers();

  if (brokers.length === 0) {
    logger.warn?.("[driver-service] Kafka producer disabled: missing KAFKA_BROKERS");
    return false;
  }

  const kafka = new Kafka({
    clientId: "driver-service",
    brokers,
    logLevel: logLevel.NOTHING
  });

  producer = kafka.producer();

  try {
    await producer.connect();
    logger.info?.("[driver-service] Kafka producer connected");
    return true;
  } catch (error) {
    logger.warn?.(`[driver-service] Kafka producer disabled: ${error.message}`);
    producer = null;
    return false;
  }
}

export async function publishDriverLocationUpdate(payload, logger = console) {
  if (!producer) {
    return false;
  }

  try {
    await producer.send({
      topic: "driver.location.updated",
      messages: [
        {
          key: payload.driverId,
          value: JSON.stringify(payload)
        }
      ]
    });
    return true;
  } catch (error) {
    logger.warn?.(`[driver-service] failed to publish location event: ${error.message}`);
    return false;
  }
}

export async function disconnectDriverKafkaProducer() {
  if (!producer) {
    return true;
  }

  try {
    await producer.disconnect();
  } finally {
    producer = null;
  }

  return true;
}

export async function initializeKafkaProducer({ brokers } = {}, logger = console) {
  if (brokers) {
    process.env.KAFKA_BROKERS = brokers;
  }
  return initializeDriverKafkaProducer(logger);
}

export async function disconnectKafkaProducer() {
  return disconnectDriverKafkaProducer();
}

export async function publishDriverLocationUpdated(driverLocation, logger = console) {
  const payload = {
    event: "driver.location.updated",
    driverId: driverLocation.driverId,
    rideId: driverLocation.rideId,
    lat: driverLocation.lat ?? driverLocation.location?.lat,
    lng: driverLocation.lng ?? driverLocation.location?.lng,
    address: driverLocation.address ?? driverLocation.location?.address,
    speed: driverLocation.speed,
    heading: driverLocation.heading,
    recordedAt: driverLocation.timestamp || new Date().toISOString()
  };

  return publishDriverLocationUpdate(payload, logger);
}

export async function disconnectProducer() {
  return disconnectDriverKafkaProducer();
}
