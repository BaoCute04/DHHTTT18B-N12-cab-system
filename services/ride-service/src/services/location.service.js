/**
 * Location Service
 * Manages driver location updates and tracking.
 */

const Redis = require('ioredis');
const { calculateETA } = require('./eta.service');

const GEO_KEY = process.env.RIDE_REDIS_GEO_KEY || 'cab:ride:drivers:geo';
const META_KEY = process.env.RIDE_REDIS_META_KEY || 'cab:ride:drivers:meta';
const HISTORY_KEY_PREFIX = process.env.RIDE_REDIS_HISTORY_PREFIX || 'cab:ride:drivers:history:';
const HISTORY_LIMIT = Math.max(Number(process.env.RIDE_REDIS_HISTORY_LIMIT || 20), 1);

const driverLocations = new Map();
const driverLocationHistory = new Map();

let redisClient = null;
let redisConnectPromise = null;
let redisUnavailable = false;

function createRedisClient() {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  return new Redis({
    host: process.env.RIDE_REDIS_HOST || process.env.REDIS_HOST || 'ride-redis',
    port: Number(process.env.RIDE_REDIS_PORT || process.env.REDIS_PORT || 6379),
    password: process.env.RIDE_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.RIDE_REDIS_DB || process.env.REDIS_DB || 0),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

async function getRedisClient() {
  if (redisUnavailable) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (!redisConnectPromise) {
    redisClient = createRedisClient();
    redisConnectPromise = redisClient
      .connect()
      .then(() => redisClient)
      .catch((error) => {
        redisUnavailable = true;
        console.warn(`[location.service] Redis unavailable, falling back to memory: ${error.message}`);
        redisClient = null;
        return null;
      });
  }

  return redisConnectPromise;
}

/**
 * Update driver's location
 * @param {string} driverId - Driver ID
 * @param {Object} location - Location {lat, lng, address}
 * @returns {Object} Updated location object
 */
async function updateDriverLocation(driverId, location) {
  if (!location || location.lat === undefined || location.lng === undefined) {
    throw new Error('Invalid location: must include lat and lng');
  }

  if (location.lat < -90 || location.lat > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90');
  }

  if (location.lng < -180 || location.lng > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180');
  }

  const updatedLocation = {
    driverId,
    lat: location.lat,
    lng: location.lng,
    address: location.address || '',
    updatedAt: new Date().toISOString(),
  };

  const client = await getRedisClient();

  if (client) {
    await client.geoadd(GEO_KEY, updatedLocation.lng, updatedLocation.lat, driverId);
    await client.hset(META_KEY, driverId, JSON.stringify(updatedLocation));
    await appendLocationHistory(client, driverId, updatedLocation);
  } else {
    driverLocations.set(driverId, updatedLocation);
    appendMemoryHistory(driverId, updatedLocation);
  }

  return updatedLocation;
}

/**
 * Get driver's current location
 * @param {string} driverId - Driver ID
 * @returns {Object|null} Driver's location or null if not found
 */
async function getDriverLocation(driverId) {
  const client = await getRedisClient();

  if (client) {
    const rawLocation = await client.hget(META_KEY, driverId);

    if (!rawLocation) {
      return null;
    }

    try {
      return JSON.parse(rawLocation);
    } catch {
      return null;
    }
  }

  return driverLocations.get(driverId) || null;
}

/**
 * Check if driver has active location
 * @param {string} driverId - Driver ID
 * @returns {boolean} True if driver has location
 */
async function hasActiveLocation(driverId) {
  const client = await getRedisClient();

  if (client) {
    const position = await client.geopos(GEO_KEY, driverId);
    return Boolean(position?.[0]);
  }

  return driverLocations.has(driverId);
}

/**
 * Clear driver location (when ride ends or driver goes offline)
 * @param {string} driverId - Driver ID
 * @returns {boolean} True if location was cleared
 */
async function clearDriverLocation(driverId) {
  const client = await getRedisClient();

  if (client) {
    const removedFromGeo = await client.zrem(GEO_KEY, driverId);
    await client.hdel(META_KEY, driverId);
    await client.del(`${HISTORY_KEY_PREFIX}${driverId}`);
    return removedFromGeo > 0;
  }

  driverLocationHistory.delete(driverId);
  return driverLocations.delete(driverId);
}

/**
 * Get all active driver locations
 * @returns {Object} Map of driver locations
 */
async function getAllActiveLocations() {
  const client = await getRedisClient();

  if (client) {
    const driverIds = await client.zrange(GEO_KEY, 0, -1);
    const entries = await Promise.all(driverIds.map((driverId) => getDriverLocation(driverId)));

    return new Map(
      entries
        .filter(Boolean)
        .map((entry) => [entry.driverId, entry])
    );
  }

  return new Map(driverLocations);
}

/**
 * Update location and calculate ETA
 * @param {string} driverId - Driver ID
 * @param {Object} location - New location
 * @param {Object} destination - Destination for ETA calculation
 * @returns {Object} Updated location with calculated ETA
 */
async function updateLocationWithETA(driverId, location, destination) {
  const updatedLocation = await updateDriverLocation(driverId, location);

  if (destination) {
    const eta = calculateETA(
      { lat: location.lat, lng: location.lng },
      destination
    );
    updatedLocation.eta = eta;
  }

  return updatedLocation;
}

/**
 * Find nearby drivers using Redis Geo radius search
 * @param {Object} location - Origin location {lat, lng}
 * @param {number} radiusKm - Radius in kilometers
 * @param {number} limit - Maximum number of drivers to return
 * @returns {Array} Nearby driver records
 */
async function findNearbyDrivers(location, radiusKm = 5, limit = 10) {
  if (!location || location.lat === undefined || location.lng === undefined) {
    throw new Error('Invalid location: must include lat and lng');
  }

  const client = await getRedisClient();

  if (client) {
    const matches = await client.georadius(
      GEO_KEY,
      location.lng,
      location.lat,
      radiusKm,
      'km',
      'WITHDIST',
      'WITHCOORD',
      'ASC',
      'COUNT',
      limit
    );

    const nearbyDrivers = [];

    for (const match of matches || []) {
      const [driverId, distance, coords] = match;
      const driverLocation = await getDriverLocation(driverId);

      nearbyDrivers.push({
        driverId,
        distanceKm: Number(distance),
        lat: Number(coords?.[1] ?? driverLocation?.lat),
        lng: Number(coords?.[0] ?? driverLocation?.lng),
        address: driverLocation?.address || '',
        updatedAt: driverLocation?.updatedAt || null,
      });
    }

    return nearbyDrivers;
  }

  const radiusInKm = Number(radiusKm) || 0;
  const maxResults = Math.max(Number(limit) || 0, 0);

  return Array.from(driverLocations.values())
    .map((driverLocation) => ({
      driverId: driverLocation.driverId,
      distanceKm: calculateDistanceKm(location, driverLocation),
      lat: driverLocation.lat,
      lng: driverLocation.lng,
      address: driverLocation.address || '',
      updatedAt: driverLocation.updatedAt || null,
    }))
    .filter((driverLocation) => driverLocation.distanceKm <= radiusInKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, maxResults || undefined);
}

/**
 * Validate location data
 * @param {Object} location - Location object to validate
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateLocation(location) {
  if (!location) {
    return { valid: false, error: 'Location is required' };
  }

  if (location.lat === undefined || location.lng === undefined) {
    return { valid: false, error: 'Location must include lat and lng' };
  }

  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return { valid: false, error: 'Lat and lng must be numbers' };
  }

  if (location.lat < -90 || location.lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (location.lng < -180 || location.lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { valid: true };
}

/**
 * Get location update history (if stored)
 * Currently returns just current location
 * Can be extended to use database for historical data
 * @param {string} driverId - Driver ID
 * @returns {Array} Location history
 */
async function getLocationHistory(driverId) {
  const client = await getRedisClient();

  if (client) {
    const rawHistory = await client.lrange(`${HISTORY_KEY_PREFIX}${driverId}`, 0, HISTORY_LIMIT - 1);

    return rawHistory
      .map((entry) => {
        try {
          return JSON.parse(entry);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  return driverLocationHistory.get(driverId) || [];
}

async function appendLocationHistory(client, driverId, location) {
  const historyKey = `${HISTORY_KEY_PREFIX}${driverId}`;
  await client.lpush(historyKey, JSON.stringify(location));
  await client.ltrim(historyKey, 0, HISTORY_LIMIT - 1);
}

function appendMemoryHistory(driverId, location) {
  const entries = driverLocationHistory.get(driverId) || [];
  entries.unshift(location);
  driverLocationHistory.set(driverId, entries.slice(0, HISTORY_LIMIT));
}

function calculateDistanceKm(origin, destination) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(destination.lat - origin.lat);
  const lngDelta = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.sin(lngDelta / 2) ** 2 * Math.cos(originLat) * Math.cos(destinationLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

module.exports = {
  updateDriverLocation,
  getDriverLocation,
  hasActiveLocation,
  clearDriverLocation,
  getAllActiveLocations,
  updateLocationWithETA,
  findNearbyDrivers,
  validateLocation,
  getLocationHistory,
};