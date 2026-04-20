import Redis from "ioredis";

export function createEtaRedisClient(config = {}) {
  if (config.url) {
    return new Redis(config.url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true
    });
  }

  return new Redis({
    host: config.host || "localhost",
    port: Number(config.port || 6379),
    password: config.password || undefined,
    db: Number(config.db || 0),
    maxRetriesPerRequest: 1,
    enableReadyCheck: true
  });
}

export async function checkEtaRedisHealth(client) {
  const response = await client.ping();
  if (response !== "PONG") {
    throw new Error("Unexpected Redis PING response");
  }

  return { status: "ok" };
}

export function buildEtaActiveRideKey(rideId) {
  return `eta:active-ride:${rideId}`;
}

export function buildEtaEstimateKey(rideId) {
  return `eta:estimate:${rideId}`;
}

export function buildEtaActiveRideIndexKey() {
  return "eta:active-rides";
}