function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBrokers(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(env = process.env) {
  return {
    kafkaBrokers: parseBrokers(env.KAFKA_BROKERS || "kafka:9092"),
    consumerGroup: env.KAFKA_CONSUMER_GROUP || "eta-tracking-consumer",
    driverLocationTopic: env.DRIVER_LOCATION_TOPIC || "driver.location.updated",
    trafficUpdatesTopic: env.TRAFFIC_UPDATES_TOPIC || "traffic.updates",
    etaServiceUrl: env.ETA_SERVICE_URL || "http://localhost:3110",
    etaInternalToken: env.ETA_INTERNAL_TOKEN || "",
    requestTimeoutMs: parseNumber(env.ETA_POLL_TIMEOUT_MS, 2500)
  };
}
