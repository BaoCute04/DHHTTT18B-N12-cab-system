import Redis from "ioredis";

function createNoopStore() {
  return {
    connected: false,
    async getJson() {
      return null;
    },
    async setJson() {
      return false;
    },
    async close() {
      return true;
    }
  };
}

export async function createRedisStore({ redisUrl }, logger = console) {
  if (!redisUrl) {
    logger.warn?.("[eta-service] ETA_REDIS_URL is empty, cache disabled");
    return createNoopStore();
  }

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true
  });

  try {
    await client.connect();
    logger.info?.("[eta-service] Redis connected");
  } catch (error) {
    logger.warn?.(`[eta-service] Redis disabled: ${error.message}`);
    try {
      client.disconnect();
    } catch {
      // Ignore close failure after failed connect.
    }
    return createNoopStore();
  }

  return {
    connected: true,
    async getJson(key) {
      const value = await client.get(key);
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    async setJson(key, payload, ttlSeconds) {
      const serialized = JSON.stringify(payload);
      if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
        await client.set(key, serialized, "EX", Math.round(ttlSeconds));
      } else {
        await client.set(key, serialized);
      }
      return true;
    },
    async close() {
      await client.quit();
      return true;
    }
  };
}
