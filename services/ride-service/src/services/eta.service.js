/**
 * ETA Service – Ride Service adapter
 * ────────────────────────────────────
 * This module keeps the existing API surface used throughout ride-service
 * (calculateDistance, calculateETA, calculatePickupETA, calculateRideEstimates)
 * while transparently delegating to the AI/ML ETA module when it is available.
 *
 * Delegation strategy:
 *   • If the AI ETA module is loadable AND Redis is reachable → delegate
 *   • Otherwise → fall back to the original Haversine computation
 *
 * This means ride-service continues to work even without the AI layer.
 */

'use strict';

// ─── Try to load the AI ETA module ────────────────────────────────────────────
let aiEta = null;
try {
  // Path from ride-service root to AI layer (monorepo structure)
  aiEta = require('../../../../AI/ML/eta-service/src/eta.service');
  console.log('[ride-service/eta] AI ETA module loaded ✅');
} catch (err) {
  console.warn('[ride-service/eta] AI ETA module not available, using fallback:', err.message);
}

// ─── Original Haversine implementation (fallback) ─────────────────────────────

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Simple Haversine-based ETA (minutes).
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @param {number} [avgSpeed=30]
 * @returns {number|null}
 */
function _haversineETA(from, to, avgSpeed = 30) {
  if (!from || !to) return null;
  try {
    const dist = calculateDistance(from.lat, from.lng, to.lat, to.lng);
    if (dist <= 0) return 0;
    return Math.max(1, Math.ceil((dist / avgSpeed) * 60));
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate ETA in minutes between two locations.
 * Delegates to the AI module when available; falls back to Haversine.
 *
 * @param {{ lat: number, lng: number }} currentLocation
 * @param {{ lat: number, lng: number }} destination
 * @param {{ rideId?: string, segment?: string }} [opts]
 * @returns {Promise<number|null>}
 */
async function calculateETA(currentLocation, destination, opts = {}) {
  // AI path
  if (aiEta) {
    try {
      const result = await aiEta.calculateETA(currentLocation, destination, opts);
      if (result) return result.etaMinutes;
    } catch (err) {
      console.warn('[ride-service/eta] AI calculateETA failed, using Haversine fallback:', err.message);
    }
  }
  // Fallback
  return _haversineETA(currentLocation, destination);
}

/**
 * Calculate ETA from driver location to pickup point.
 *
 * @param {{ lat: number, lng: number }} currentLocation
 * @param {{ lat: number, lng: number }} pickup
 * @param {{ rideId?: string }} [opts]
 * @returns {Promise<{ etaToPickup: number|null, distanceToPickup: number|null }>}
 */
async function calculatePickupETA(currentLocation, pickup, opts = {}) {
  if (!currentLocation || !pickup) {
    return { etaToPickup: null, distanceToPickup: null };
  }

  // AI path
  if (aiEta) {
    try {
      const result = await aiEta.calculatePickupETA(currentLocation, pickup, opts);
      if (result) {
        return {
          etaToPickup: result.etaMinutes,
          distanceToPickup: result.distanceKm,
        };
      }
    } catch (err) {
      console.warn('[ride-service/eta] AI calculatePickupETA failed, using Haversine fallback:', err.message);
    }
  }

  // Fallback
  const dist = calculateDistance(currentLocation.lat, currentLocation.lng, pickup.lat, pickup.lng);
  const avgSpeed = parseFloat(process.env.AVG_DRIVER_SPEED || '30');
  return {
    etaToPickup: Math.max(1, Math.ceil((dist / avgSpeed) * 60)),
    distanceToPickup: parseFloat(dist.toFixed(2)),
  };
}

/**
 * Calculate full ride estimates.
 *
 * @param {{ lat: number, lng: number }} currentLocation
 * @param {{ lat: number, lng: number }} pickup
 * @param {{ lat: number, lng: number }} destination
 * @param {{ rideId?: string }} [opts]
 * @returns {Promise<{ etaToPickup, etaToDestination, totalDistance, distanceToPickup, distanceToDestination }>}
 */
async function calculateRideEstimates(currentLocation, pickup, destination, opts = {}) {
  if (!currentLocation || !pickup || !destination) {
    return {
      etaToPickup: null,
      etaToDestination: null,
      totalDistance: null,
      distanceToPickup: null,
      distanceToDestination: null,
    };
  }

  // AI path
  if (aiEta) {
    try {
      const estimates = await aiEta.calculateRideEstimates(currentLocation, pickup, destination, opts);
      if (estimates.toPickup && estimates.toDestination) {
        return {
          etaToPickup: estimates.toPickup.etaMinutes,
          etaToDestination: estimates.toDestination.etaMinutes,
          totalDistance: estimates.totalDistanceKm,
          distanceToPickup: estimates.toPickup.distanceKm,
          distanceToDestination: estimates.toDestination.distanceKm,
        };
      }
    } catch (err) {
      console.warn('[ride-service/eta] AI calculateRideEstimates failed, using Haversine fallback:', err.message);
    }
  }

  // Fallback
  const avgSpeed = parseFloat(process.env.AVG_DRIVER_SPEED || '30');
  const dToPickup = calculateDistance(currentLocation.lat, currentLocation.lng, pickup.lat, pickup.lng);
  const dToDestination = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
  return {
    etaToPickup: Math.max(1, Math.ceil((dToPickup / avgSpeed) * 60)),
    etaToDestination: Math.max(1, Math.ceil((dToDestination / avgSpeed) * 60)),
    totalDistance: parseFloat((dToPickup + dToDestination).toFixed(2)),
    distanceToPickup: parseFloat(dToPickup.toFixed(2)),
    distanceToDestination: parseFloat(dToDestination.toFixed(2)),
  };
}

// ─── Re-export AI helpers for ride-service consumers ─────────────────────────
// These allow ride-service to use the Redis-backed store directly.

/**
 * Update driver location in Redis (via AI module).
 * Falls back to no-op if AI module unavailable.
 */
async function updateDriverLocationToRedis(driverId, location, rideId = null) {
  if (!aiEta) return null;
  return aiEta.updateLocationAndInvalidateETA(driverId, location, rideId);
}

async function saveActiveRideToRedis(rideId, snapshot) {
  if (!aiEta) return;
  return aiEta.saveActiveRide(rideId, snapshot);
}

async function getActiveRideFromRedis(rideId) {
  if (!aiEta) return null;
  return aiEta.getActiveRide(rideId);
}

async function removeActiveRideFromRedis(rideId) {
  if (!aiEta) return;
  return aiEta.removeActiveRide(rideId);
}

module.exports = {
  // Original API (kept for backward compatibility)
  calculateDistance,
  calculateETA,
  calculatePickupETA,
  calculateRideEstimates,

  // Redis-backed helpers (new)
  updateDriverLocationToRedis,
  saveActiveRideToRedis,
  getActiveRideFromRedis,
  removeActiveRideFromRedis,

  // Expose the AI module itself if caller needs direct access
  aiEta,
};
