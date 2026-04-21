/**
 * Location Service
 * ─────────────────
 * Manages driver location updates and tracking.
 *
 * Storage strategy (in priority order):
 *   1. AI ETA module → Redis (when @cab/eta-ai-service is available)
 *   2. In-memory Map (fallback when Redis is unavailable)
 *
 * The public API is unchanged so all existing callers (ride.service.js,
 * socket.js) continue to work without modification.
 */

'use strict';

const { calculateETA } = require('./eta.service');

// ── Try to use Redis via the AI ETA module ─────────────────────────────────────
let aiEta = null;
try {
  aiEta = require('../../../../AI/ML/eta-service/src/eta.service');
} catch {
  // Redis not available – fall through to in-memory
}

/**
 * In-memory fallback for driver locations.
 * Used only when the AI/Redis layer is unavailable.
 */
const _driverLocations = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _validateLocation(location) {
  if (!location || location.lat === undefined || location.lng === undefined) {
    throw new Error('Invalid location: must include lat and lng');
  }
  if (location.lat < -90 || location.lat > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90');
  }
  if (location.lng < -180 || location.lng > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Update driver's location.
 * Persists to Redis when the AI layer is available; otherwise to the in-memory map.
 *
 * @param {string} driverId
 * @param {{ lat: number, lng: number, address?: string }} location
 * @param {string|null} [rideId]  – if provided, ETA cache for this ride is invalidated
 * @returns {Promise<{ lat, lng, address, updatedAt }>}
 */
async function updateDriverLocation(driverId, location, rideId = null) {
  _validateLocation(location);

  const payload = {
    lat: location.lat,
    lng: location.lng,
    address: location.address || '',
    updatedAt: new Date().toISOString(),
  };

  if (aiEta) {
    try {
      return await aiEta.updateLocationAndInvalidateETA(driverId, location, rideId);
    } catch (err) {
      console.warn('[location-service] Redis write failed, using in-memory:', err.message);
    }
  }

  _driverLocations.set(driverId, payload);
  return payload;
}

/**
 * Get driver's current location.
 * Reads from Redis when available; falls back to in-memory map.
 *
 * @param {string} driverId
 * @returns {Promise<{ lat, lng, address, updatedAt }|null>}
 */
async function getDriverLocation(driverId) {
  if (aiEta) {
    try {
      const loc = await aiEta.getDriverLocation(driverId);
      if (loc) return loc;
    } catch (err) {
      console.warn('[location-service] Redis read failed, using in-memory:', err.message);
    }
  }
  return _driverLocations.get(driverId) || null;
}

/**
 * Check if driver has an active location entry.
 * @param {string} driverId
 * @returns {Promise<boolean>}
 */
async function hasActiveLocation(driverId) {
  const loc = await getDriverLocation(driverId);
  return loc !== null;
}

/**
 * Clear driver location (when ride ends or driver goes offline).
 * @param {string} driverId
 * @returns {Promise<boolean>}
 */
async function clearDriverLocation(driverId) {
  if (aiEta) {
    try {
      await aiEta.removeDriverLocation(driverId);
      return true;
    } catch (err) {
      console.warn('[location-service] Redis delete failed:', err.message);
    }
  }
  return _driverLocations.delete(driverId);
}

/**
 * Get all active driver locations from in-memory map.
 * (Redis does not support full enumeration efficiently – use this only for dev/debug.)
 * @returns {Map}
 */
function getAllActiveLocations() {
  return new Map(_driverLocations);
}

/**
 * Update location and calculate ETA in one step.
 * @param {string} driverId
 * @param {{ lat: number, lng: number }} location
 * @param {{ lat: number, lng: number }} destination
 * @param {{ rideId?: string }} [opts]
 * @returns {Promise<{ lat, lng, address, updatedAt, eta: number|null }>}
 */
async function updateLocationWithETA(driverId, location, destination, opts = {}) {
  const updatedLocation = await updateDriverLocation(driverId, location, opts.rideId || null);

  if (destination) {
    const eta = await calculateETA(
      { lat: location.lat, lng: location.lng },
      destination,
      opts
    );
    updatedLocation.eta = eta;
  }

  return updatedLocation;
}

/**
 * Validate location data.
 * @param {{ lat?: number, lng?: number }} location
 * @returns {{ valid: boolean, error?: string }}
 */
function validateLocation(location) {
  if (!location) return { valid: false, error: 'Location is required' };
  if (location.lat === undefined || location.lng === undefined)
    return { valid: false, error: 'Location must include lat and lng' };
  if (typeof location.lat !== 'number' || typeof location.lng !== 'number')
    return { valid: false, error: 'Lat and lng must be numbers' };
  if (location.lat < -90 || location.lat > 90)
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  if (location.lng < -180 || location.lng > 180)
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  return { valid: true };
}

/**
 * Get location history (stub – returns current location only).
 * @param {string} driverId
 * @returns {Promise<Array>}
 */
async function getLocationHistory(driverId) {
  const loc = await getDriverLocation(driverId);
  return loc ? [loc] : [];
}

module.exports = {
  updateDriverLocation,
  getDriverLocation,
  hasActiveLocation,
  clearDriverLocation,
  getAllActiveLocations,
  updateLocationWithETA,
  validateLocation,
  getLocationHistory,
};
