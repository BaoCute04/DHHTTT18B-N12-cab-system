'use strict';

require('dotenv').config();

const config = require('./eta.config');
const redis = require('./infra/redis');
const { getRoute } = require('./providers/routing.providers');
const { getTrafficDelayFactor } = require('./providers/traffic.providers');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCoordinatePoint(point) {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
    return null;
  }

  return {
    lat: point.lat,
    lng: point.lng,
  };
}

function deriveBiasProfileKey({ segment = 'toDestination', biasContext = {} }) {
  if (biasContext.profileKey) {
    return biasContext.profileKey;
  }

  const timestamp = biasContext.timestamp ? new Date(biasContext.timestamp) : new Date();
  const hourBucket = String(timestamp.getHours()).padStart(2, '0');
  return `${segment}:hour:${hourBucket}`;
}

async function resolveBiasProfile({ segment, biasContext = {} }) {
  const profileKey = deriveBiasProfileKey({ segment, biasContext });
  const savedProfile = await redis.getBiasProfile(profileKey);
  const rawBiasFactor = Number(savedProfile?.biasFactor ?? config.etaBiasFactor);
  const biasFactor = clamp(
    Number.isFinite(rawBiasFactor) ? rawBiasFactor : config.etaBiasFactor,
    config.etaBiasFactorMin,
    config.etaBiasFactorMax
  );

  return {
    profileKey,
    biasFactor,
    source: savedProfile ? 'bias-profile' : 'default-config',
    metadata: savedProfile?.metadata || {},
  };
}

function toETAResult(routeInfo, rideId, segment, trafficInfo, biasProfile) {
  const baseDurationSeconds = routeInfo.durationSeconds;
  const trafficDelayFactor = trafficInfo?.delayFactor || 1;
  const aiBiasFactor = biasProfile?.biasFactor || config.etaBiasFactor;
  const adjustedDurationSeconds = Math.round(baseDurationSeconds * trafficDelayFactor * aiBiasFactor);
  const etaMinutes = Math.max(config.etaMinMinutes, Math.ceil(adjustedDurationSeconds / 60));
  const distanceKm = parseFloat((routeInfo.distanceMeters / 1000).toFixed(2));

  return {
    etaMinutes,
    distanceKm,
    baseDurationSeconds,
    durationSeconds: adjustedDurationSeconds,
    provider: routeInfo.provider,
    trafficProvider: trafficInfo?.provider || config.trafficProvider,
    trafficDelayFactor,
    aiBiasFactor,
    biasProfileKey: biasProfile?.profileKey || null,
    biasSource: biasProfile?.source || 'default-config',
    biasMetadata: biasProfile?.metadata || {},
    rideId: rideId || null,
    segment: segment || null,
    cachedAt: null,
    computedAt: new Date().toISOString(),
  };
}

async function calculateETA(origin, destination, opts = {}) {
  const normalizedOrigin = normalizeCoordinatePoint(origin);
  const normalizedDestination = normalizeCoordinatePoint(destination);

  if (!normalizedOrigin || !normalizedDestination) {
    console.error('[ETA] calculateETA: missing origin or destination');
    return null;
  }

  const {
    rideId = null,
    segment = 'toDestination',
    skipCache = false,
    biasContext = {},
  } = opts;

  if (rideId && !skipCache) {
    try {
      const cached = await redis.getCachedETA(rideId, segment);
      if (cached) {
        console.log(`[ETA] Cache HIT rideId=${rideId} segment=${segment}`);
        return { ...cached, cachedAt: cached.computedAt };
      }
    } catch (error) {
      console.warn('[ETA] Redis cache read failed:', error.message);
    }
  }

  try {
    const routeInfo = await getRoute(normalizedOrigin, normalizedDestination);
    const trafficInfo = await getTrafficDelayFactor(normalizedOrigin, normalizedDestination, biasContext);
    const biasProfile = await resolveBiasProfile({ segment, biasContext });
    const result = toETAResult(routeInfo, rideId, segment, trafficInfo, biasProfile);

    if (rideId) {
      try {
        await redis.cacheETA(rideId, segment, result);
        console.log(`[ETA] Cache WRITE rideId=${rideId} segment=${segment} ttl=${config.etaCacheTtl}s`);
      } catch (error) {
        console.warn('[ETA] Redis cache write failed:', error.message);
      }
    }

    return result;
  } catch (error) {
    console.error('[ETA] calculateETA failed:', error.message);
    return null;
  }
}

async function calculatePickupETA(driverLocation, pickup, opts = {}) {
  return calculateETA(driverLocation, pickup, {
    ...opts,
    segment: 'toPickup',
  });
}

async function calculateRideEstimates(driverLocation, pickup, destination, opts = {}) {
  const [toPickup, toDestination] = await Promise.all([
    calculatePickupETA(driverLocation, pickup, opts),
    calculateETA(pickup, destination, {
      ...opts,
      segment: 'toDestination',
    }),
  ]);

  const totalDistanceKm =
    toPickup && toDestination
      ? parseFloat((toPickup.distanceKm + toDestination.distanceKm).toFixed(2))
      : null;

  const totalEtaMinutes =
    toPickup && toDestination ? toPickup.etaMinutes + toDestination.etaMinutes : null;

  return {
    toPickup,
    toDestination,
    totalDistanceKm,
    totalEtaMinutes,
  };
}

async function updateDriverLocation(driverId, location) {
  if (!driverId) {
    throw new Error('driverId is required');
  }
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
  console.log(`[ETA] Driver location saved driverId=${driverId}`);
  return payload;
}

async function getDriverLocation(driverId) {
  return redis.getDriverLocation(driverId);
}

async function removeDriverLocation(driverId) {
  await redis.removeDriverLocation(driverId);
}

async function saveActiveRide(rideId, snapshot) {
  if (!rideId) {
    throw new Error('rideId is required');
  }
  await redis.saveActiveRide(rideId, snapshot);
  console.log(`[ETA] Active ride saved rideId=${rideId}`);
}

async function getActiveRide(rideId) {
  return redis.getActiveRide(rideId);
}

async function removeActiveRide(rideId) {
  await redis.removeActiveRide(rideId);
  console.log(`[ETA] Active ride removed rideId=${rideId}`);
}

async function invalidateRideETA(rideId) {
  await redis.invalidateETA(rideId);
  console.log(`[ETA] ETA cache invalidated rideId=${rideId}`);
}

async function updateLocationAndInvalidateETA(driverId, location, rideId = null) {
  const saved = await updateDriverLocation(driverId, location);
  if (rideId) {
    await invalidateRideETA(rideId);
  }
  return saved;
}

async function handleDriverLocationUpdated(eventPayload) {
  if (!eventPayload?.driverId || !eventPayload?.location) {
    throw new Error('driver location event requires driverId and location');
  }

  const savedLocation = await updateLocationAndInvalidateETA(
    eventPayload.driverId,
    eventPayload.location,
    eventPayload.rideId || null
  );

  return {
    driverId: eventPayload.driverId,
    rideId: eventPayload.rideId || null,
    location: savedLocation,
    processedAt: new Date().toISOString(),
  };
}

async function saveBiasProfile(profileKey, biasFactor, metadata = {}) {
  if (!profileKey) {
    throw new Error('profileKey is required');
  }

  const normalizedBiasFactor = clamp(
    Number(biasFactor),
    config.etaBiasFactorMin,
    config.etaBiasFactorMax
  );

  const payload = {
    biasFactor: normalizedBiasFactor,
    metadata,
    updatedAt: new Date().toISOString(),
  };

  await redis.saveBiasProfile(profileKey, payload);
  return {
    profileKey,
    ...payload,
  };
}

async function getBiasProfile(profileKey) {
  if (!profileKey) {
    return null;
  }

  const saved = await redis.getBiasProfile(profileKey);
  if (!saved) {
    return null;
  }

  return {
    profileKey,
    ...saved,
  };
}

async function removeBiasProfile(profileKey) {
  if (!profileKey) {
    return;
  }
  await redis.removeBiasProfile(profileKey);
}

async function shutdown() {
  await redis.disconnect();
}

module.exports = {
  calculateETA,
  calculatePickupETA,
  calculateRideEstimates,
  updateDriverLocation,
  getDriverLocation,
  removeDriverLocation,
  saveActiveRide,
  getActiveRide,
  removeActiveRide,
  invalidateRideETA,
  updateLocationAndInvalidateETA,
  handleDriverLocationUpdated,
  saveBiasProfile,
  getBiasProfile,
  removeBiasProfile,
  shutdown,
};
