/**
 * Redis Hot-Store for Driver Locations
 * Caches driver location data for fast access during matching/routing
 */

import redis from 'redis';

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  legacyMode: true, // For compatibility
});

client.on('error', (error) => {
  console.error('[Redis] Error:', error.message);
});

client.on('connect', () => {
  console.log('[Redis] Connected for driver-service');
});

/**
 * Promisified Redis operations
 */
export const redis_promisified = {
  /**
   * Get driver location from cache
   * @param {string} driverId - Driver ID
   * @returns {Promise<Object|null>}
   */
  getDriverLocation: (driverId) =>
    new Promise((resolve, reject) => {
      client.get(`driver:location:${driverId}`, (error, data) => {
        if (error) reject(error);
        else resolve(data ? JSON.parse(data) : null);
      });
    }),

  /**
   * Set driver location in cache (5-minute TTL)
   * @param {string} driverId - Driver ID
   * @param {Object} location - { lat, lng, address }
   * @returns {Promise<void>}
   */
  setDriverLocation: (driverId, location) =>
    new Promise((resolve, reject) => {
      client.setex(
        `driver:location:${driverId}`,
        300, // 5-minute TTL for active driver tracking
        JSON.stringify({
          ...location,
          updatedAt: new Date().toISOString(),
        }),
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    }),

  /**
   * Get all driver locations (for zone-based matching)
   * @param {string} pattern - Key pattern (optional)
   * @returns {Promise<Array>}
   */
  getAllDriverLocations: () =>
    new Promise((resolve, reject) => {
      client.keys('driver:location:*', (error, keys) => {
        if (error) {
          reject(error);
          return;
        }

        if (!keys || keys.length === 0) {
          resolve([]);
          return;
        }

        client.mget(keys, (error, data) => {
          if (error) reject(error);
          else
            resolve(
              data
                .filter(Boolean)
                .map((item) => JSON.parse(item))
            );
        });
      });
    }),

  /**
   * Get nearby drivers within approximate radius
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Array>}
   */
  getNearbyDrivers: async (lat, lng, radiusKm = 5) => {
    const allLocations = await redis_promisified.getAllDriverLocations();

    // Simple distance filter (Haversine approximation)
    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    return allLocations.filter((driver) => {
      const dLat = toRad(driver.lat - lat);
      const dLng = toRad(driver.lng - lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat)) *
          Math.cos(toRad(driver.lat)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const distance = 2 * R * Math.asin(Math.sqrt(a));
      return distance <= radiusKm;
    });
  },

  /**
   * Delete driver location from cache
   * @param {string} driverId - Driver ID
   * @returns {Promise<void>}
   */
  deleteDriverLocation: (driverId) =>
    new Promise((resolve, reject) => {
      client.del(`driver:location:${driverId}`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    }),

  /**
   * Connect to Redis
   * @returns {Promise<void>}
   */
  connect: () =>
    new Promise((resolve, reject) => {
      client.connect((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  disconnect: () =>
    new Promise((resolve, reject) => {
      client.quit((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
};

// Auto-connect
redis_promisified.connect().catch((error) => {
  console.warn('[Redis] Failed to connect:', error.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await redis_promisified.disconnect();
  process.exit(0);
});

export default redis_promisified;
