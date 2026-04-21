/**
 * ETA AI Service – Core Module
 * ─────────────────────────────────────────────────────────────────────────────
 * This module is the "brain" of the ETA AI layer.  It is NOT an HTTP service –
 * it exposes a programmatic API that other services (ride-service, etc.) import
 * directly, or that can be called from a Kafka consumer / gRPC handler.
 *
 * Architecture role (from the diagram):
 *   AI / ML Layer  →  ETA Prediction Model
 *
 * Key responsibilities:
 *   1. Get real-time routing & travel time from the configured provider
 *      (OSRM / GraphHopper / Google Maps / Mapbox).
 *   2. Apply AI bias-correction factor (placeholder for future ML model).
 *   3. Cache results in Redis to reduce external API calls and latency.
 *   4. Store / retrieve active ride snapshots and driver locations in Redis
 *      (replacing the in-memory Map() used in ride-service).
 *
 * Public API (all functions are async):
 *   calculateETA(origin, destination)           → ETAResult
 *   calculatePickupETA(driverLoc, pickup)        → ETAResult
 *   calculateRideEstimates(driverLoc, pickup, destination) → RideEstimates
 *
 *   // Redis-backed store helpers
 *   updateDriverLocation(driverId, location)
 *   getDriverLocation(driverId)
 *   removeDriverLocation(driverId)
 *   saveActiveRide(rideId, snapshot)
 *   getActiveRide(rideId)
 *   removeActiveRide(rideId)
 *   invalidateRideETA(rideId)
 */

'use strict';

require('dotenv').config();

const config      = require('./eta.config');
const redis       = require('./infra/redis');
const { getRoute } = require('./providers/routing.providers');

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert routing-provider output to our standard ETAResult.
 * Applies the AI bias-correction factor.
 *
 * @param {{ durationSeconds: number, distanceMeters: number, provider: string }} routeInfo
 * @param {string} rideId   – used for logging
 * @param {string} segment  – 'toPickup' | 'toDestination'
 * @returns {ETAResult}
 */
function toETAResult(routeInfo, rideId, segment) {
  const rawSeconds  = routeInfo.durationSeconds;
  const biased      = rawSeconds * config.etaBiasFactor;
  const etaMinutes  = Math.max(config.etaMinMinutes, Math.ceil(biased / 60));
  const distanceKm  = parseFloat((routeInfo.distanceMeters / 1000).toFixed(2));

  return {
    etaMinutes,
    distanceKm,
    durationSeconds: Math.round(biased),
    provider: routeInfo.provider,
    biasFactor: config.etaBiasFactor,
    rideId: rideId || null,
    segment: segment || null,
    cachedAt: null,   // will be set when retrieved from cache
    computedAt: new Date().toISOString(),
  };
}

/**
 * @typedef {Object} ETAResult
 * @property {number}  etaMinutes       – ETA in minutes (bias-corrected)
 * @property {number}  distanceKm       – Route distance in km
 * @property {number}  durationSeconds  – Route duration in seconds (bias-corrected)
 * @property {string}  provider         – Routing provider used
 * @property {number}  biasFactor       – AI correction factor applied
 * @property {string|null} rideId
 * @property {string|null} segment      – 'toPickup' | 'toDestination'
 * @property {string|null} cachedAt     – ISO timestamp if served from cache
 * @property {string}  computedAt       – ISO timestamp of computation
 */

// ─── Core ETA functions ───────────────────────────────────────────────────────

/**
 * Calculate ETA between two GPS points.
 * Checks Redis cache first; falls back to routing provider; caches result.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {{ rideId?: string, segment?: string, skipCache?: boolean }} [opts]
 * @returns {Promise<ETAResult|null>}
 */
async function calculateETA(origin, destination, opts = {}) {
  if (!origin || !destination) {
    console.error('[ETA] calculateETA: missing origin or destination');
    return null;
  }

  const { rideId = null, segment = 'toDestination', skipCache = false } = opts;

  // ── 1. Cache read ──────────────────────────────────────────────────────────
  if (rideId && !skipCache) {
    try {
      const cached = await redis.getCachedETA(rideId, segment);
      if (cached) {
        console.log(`[ETA] Cache HIT  rideId=${rideId} segment=${segment}`);
        return { ...cached, cachedAt: cached.computedAt };
      }
    } catch (err) {
      console.warn('[ETA] Redis cache read failed:', err.message);
    }
  }

  // ── 2. Routing provider ────────────────────────────────────────────────────
  try {
    const routeInfo = await getRoute(origin, destination);
    const result    = toETAResult(routeInfo, rideId, segment);

    // ── 3. Cache write ─────────────────────────────────────────────────────
    if (rideId) {
      try {
        await redis.cacheETA(rideId, segment, result);
        console.log(`[ETA] Cache WRITE rideId=${rideId} segment=${segment} ttl=${config.etaCacheTtl}s`);
      } catch (err) {
        console.warn('[ETA] Redis cache write failed:', err.message);
      }
    }

    return result;
  } catch (err) {
    console.error('[ETA] calculateETA failed:', err.message);
    return null;
  }
}

/**
 * Calculate ETA from driver's current position to the pickup point.
 *
 * @param {{ lat: number, lng: number }} driverLocation
 * @param {{ lat: number, lng: number }} pickup
 * @param {{ rideId?: string, skipCache?: boolean }} [opts]
 * @returns {Promise<ETAResult|null>}
 */
async function calculatePickupETA(driverLocation, pickup, opts = {}) {
  return calculateETA(driverLocation, pickup, {
    ...opts,
    segment: 'toPickup',
  });
}

/**
 * Calculate full ride estimates: driver→pickup and pickup→destination.
 *
 * @param {{ lat: number, lng: number }} driverLocation
 * @param {{ lat: number, lng: number }} pickup
 * @param {{ lat: number, lng: number }} destination
 * @param {{ rideId?: string, skipCache?: boolean }} [opts]
 * @returns {Promise<RideEstimates>}
 *
 * @typedef {Object} RideEstimates
 * @property {ETAResult|null} toPickup
 * @property {ETAResult|null} toDestination
 * @property {number|null} totalDistanceKm
 * @property {number|null} totalEtaMinutes
 */
async function calculateRideEstimates(driverLocation, pickup, destination, opts = {}) {
  const [toPickup, toDestination] = await Promise.all([
    calculatePickupETA(driverLocation, pickup, opts),
    calculateETA(pickup, destination, { ...opts, segment: 'toDestination' }),
  ]);

  const totalDistanceKm =
    toPickup && toDestination
      ? parseFloat((toPickup.distanceKm + toDestination.distanceKm).toFixed(2))
      : null;

  const totalEtaMinutes =
    toPickup && toDestination
      ? toPickup.etaMinutes + toDestination.etaMinutes
      : null;

  return { toPickup, toDestination, totalDistanceKm, totalEtaMinutes };
}

// ─── Redis-backed Driver Location API ────────────────────────────────────────
// These replace the in-memory Map() in ride-service/location.service.js

/**
 * Persist a driver's GPS location to Redis.
 * @param {string} driverId
 * @param {{ lat: number, lng: number, address?: string }} location
 * @returns {Promise<{ lat: number, lng: number, address: string, updatedAt: string }>}
 */
async function updateDriverLocation(driverId, location) {
  if (!driverId) throw new Error('driverId is required');
  if (!location || location.lat == null || location.lng == null) {
    throw new Error('location must include lat and lng');
  }

  const payload = {
    lat: location.lat,
    lng: location.lng,
    address: location.address || '',
    updatedAt: new Date().toISOString(),
  };

  await redis.saveDriverLocation(driverId, payload);
  console.log(`[ETA] Driver location saved  driverId=${driverId}`);
  return payload;
}

/**
 * Retrieve a driver's latest GPS location from Redis.
 * @param {string} driverId
 * @returns {Promise<{ lat: number, lng: number, address: string, updatedAt: string }|null>}
 */
async function getDriverLocation(driverId) {
  return redis.getDriverLocation(driverId);
}

/**
 * Remove a driver's location from Redis (e.g. driver goes offline).
 * @param {string} driverId
 */
async function removeDriverLocation(driverId) {
  await redis.removeDriverLocation(driverId);
}

// ─── Redis-backed Active Ride API ─────────────────────────────────────────────
// Replaces the in-memory Map() used in ride-service/ride.service.js

/**
 * Save an active ride snapshot to Redis.
 * Call this when a ride transitions to an active status
 * (DRIVER_ASSIGNED, DRIVER_ARRIVING, IN_PROGRESS).
 *
 * @param {string} rideId
 * @param {object} snapshot  – any serialisable ride object
 */
async function saveActiveRide(rideId, snapshot) {
  if (!rideId) throw new Error('rideId is required');
  await redis.saveActiveRide(rideId, snapshot);
  console.log(`[ETA] Active ride saved  rideId=${rideId}`);
}

/**
 * Retrieve an active ride snapshot from Redis.
 * @param {string} rideId
 * @returns {Promise<object|null>}
 */
async function getActiveRide(rideId) {
  return redis.getActiveRide(rideId);
}

/**
 * Remove an active ride from Redis
 * (call on COMPLETED / CANCELLED to free memory).
 * @param {string} rideId
 */
async function removeActiveRide(rideId) {
  await redis.removeActiveRide(rideId);
  console.log(`[ETA] Active ride removed  rideId=${rideId}`);
}

/**
 * Invalidate cached ETA entries for a ride.
 * Call this after every driver location update so the next
 * calculateETA() call fetches a fresh route.
 * @param {string} rideId
 */
async function invalidateRideETA(rideId) {
  await redis.invalidateETA(rideId);
  console.log(`[ETA] ETA cache invalidated  rideId=${rideId}`);
}

// ─── Convenience: update location + invalidate ETA in one call ────────────────

/**
 * Atomically update a driver's location in Redis AND invalidate the ETA cache
 * for their active ride.  This is the function ride-service should call on
 * every GPS update event.
 *
 * @param {string} driverId
 * @param {{ lat: number, lng: number, address?: string }} location
 * @param {string|null} [rideId]  – if provided, ETA cache for this ride is cleared
 * @returns {Promise<{ lat: number, lng: number, address: string, updatedAt: string }>}
 */
async function updateLocationAndInvalidateETA(driverId, location, rideId = null) {
  const saved = await updateDriverLocation(driverId, location);
  if (rideId) {
    await invalidateRideETA(rideId);
  }
  return saved;
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

/**
 * Disconnect from Redis.  Call on process exit / SIGTERM.
 */
async function shutdown() {
  await redis.disconnect();
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  // ── Core ETA
  calculateETA,
  calculatePickupETA,
  calculateRideEstimates,

  // ── Driver locations (Redis)
  updateDriverLocation,
  getDriverLocation,
  removeDriverLocation,

  // ── Active rides (Redis)
  saveActiveRide,
  getActiveRide,
  removeActiveRide,

  // ── Cache management
  invalidateRideETA,
  updateLocationAndInvalidateETA,

  // ── Lifecycle
  shutdown,
};
