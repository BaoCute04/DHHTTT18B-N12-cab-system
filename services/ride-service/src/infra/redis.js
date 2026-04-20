/**
 * Redis Client Configuration
 * Handles caching for ETA calculations and ride data
 */

const redis = require('redis');
const logger = require('../utils/logger');

const redisClient = process.env.REDIS_URL
  ? redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 2000),
      },
    })
  : redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        reconnectStrategy: (retries) => Math.min(retries * 100, 2000),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

let connectPromise = null;

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (error) => {
  logger.error('Redis error:', error);
});

redisClient.on('ready', () => {
  logger.info('Redis ready');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

async function ensureConnected() {
  if (redisClient.isOpen) {
    return;
  }

  if (!connectPromise) {
    connectPromise = redisClient.connect().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
}

// Promisify Redis commands for async/await usage
const promisifiedClient = {
  get: async (key) => {
    await ensureConnected();
    return redisClient.get(key);
  },

  set: async (key, value) => {
    await ensureConnected();
    return redisClient.set(key, value);
  },

  setex: async (key, ttl, value) => {
    await ensureConnected();
    return redisClient.setEx(key, ttl, value);
  },

  del: async (key) => {
    await ensureConnected();
    return redisClient.del(key);
  },

  exists: async (key) => {
    await ensureConnected();
    return redisClient.exists(key);
  },

  incr: async (key) => {
    await ensureConnected();
    return redisClient.incr(key);
  },

  lpush: async (key, value) => {
    await ensureConnected();
    return redisClient.lPush(key, value);
  },

  lrange: async (key, start, stop) => {
    await ensureConnected();
    return redisClient.lRange(key, start, stop);
  },

  expire: async (key, ttl) => {
    await ensureConnected();
    return redisClient.expire(key, ttl);
  },

  flushdb: async () => {
    await ensureConnected();
    return redisClient.flushDb();
  },

  close: async () => {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  },
};

module.exports = promisifiedClient;
