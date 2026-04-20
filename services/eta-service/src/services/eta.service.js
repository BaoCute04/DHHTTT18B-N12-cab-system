import { z } from "zod";
import {
  buildEtaActiveRideIndexKey,
  buildEtaActiveRideKey,
  buildEtaEstimateKey
} from "../infra/redis.js";

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1).max(255).optional()
}).strict();

const estimateInputSchema = z.object({
  rideId: z.string().uuid().optional(),
  origin: coordinateSchema,
  destination: coordinateSchema,
  driverLocation: coordinateSchema.optional(),
  provider: z.enum(["auto", "google", "osrm", "graphhopper", "mapbox"]).optional(),
  trafficSensitivity: z.enum(["low", "medium", "high"]).optional(),
  vehicleType: z.enum(["bike", "car", "car_plus"]).optional(),
  departureTime: z.string().datetime({ offset: true }).optional(),
  cacheTtlSeconds: z.number().int().min(30).max(3600).optional()
}).strict();

const activeRideInputSchema = z.object({
  rideId: z.string().uuid(),
  driverId: z.string().uuid().optional(),
  status: z.enum(["SEARCHING", "ASSIGNED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  origin: coordinateSchema,
  destination: coordinateSchema,
  driverLocation: coordinateSchema.optional(),
  provider: z.enum(["auto", "google", "osrm", "graphhopper", "mapbox"]).optional(),
  trafficSensitivity: z.enum(["low", "medium", "high"]).optional(),
  vehicleType: z.enum(["bike", "car", "car_plus"]).optional(),
  observedAt: z.string().datetime({ offset: true }).optional(),
  cacheTtlSeconds: z.number().int().min(60).max(86400).optional()
}).strict();

export function createEtaService({ redisClient, providerResolver, config, logger = console } = {}) {
  if (!redisClient) {
    throw new Error("Redis client is required for ETA service");
  }

  return {
    async estimateEta(input, principal = null) {
      const payload = estimateInputSchema.parse(input);
      const rideId = payload.rideId || null;
      const activeRide = rideId ? await getActiveRide(redisClient, rideId) : null;
      const origin = payload.origin || activeRide?.origin;
      const destination = payload.destination || activeRide?.destination;
      const driverLocation = payload.driverLocation || activeRide?.driverLocation || null;

      if (!origin || !destination) {
        throw buildHttpError(400, "ETA_COORDINATES_REQUIRED", "Origin and destination are required");
      }

      if (rideId) {
        const cachedEstimate = await getCachedEstimate(redisClient, rideId);
        if (cachedEstimate && !payload.provider) {
          return cachedEstimate;
        }
      }

      const routeResult = await providerResolver.resolveRoute({
        origin: driverLocation || origin,
        destination,
        departureTime: payload.departureTime,
        vehicleType: payload.vehicleType || activeRide?.vehicleType || "car",
        trafficSensitivity: payload.trafficSensitivity || activeRide?.trafficSensitivity || "medium",
        preferredProvider: payload.provider || activeRide?.provider || "auto"
      });

      const etaSeconds = Math.max(60, Math.round(routeResult.trafficSeconds || routeResult.durationSeconds));
      const now = new Date();
      const estimatedArrivalAt = new Date(now.getTime() + etaSeconds * 1000).toISOString();
      const activeRideRecord = {
        rideId,
        origin,
        destination,
        driverLocation,
        provider: routeResult.provider,
        routeLabel: routeResult.routeLabel,
        trafficSensitivity: payload.trafficSensitivity || activeRide?.trafficSensitivity || "medium",
        vehicleType: payload.vehicleType || activeRide?.vehicleType || "car",
        updatedBy: principal?.subjectId || null,
        updatedAt: now.toISOString(),
        estimatedArrivalAt,
        etaSeconds,
        etaMinutes: Math.max(1, Math.round(etaSeconds / 60)),
        distanceMeters: routeResult.distanceMeters,
        durationSeconds: routeResult.durationSeconds,
        trafficSeconds: routeResult.trafficSeconds,
        timestamps: {
          requestedAt: now.toISOString(),
          calculatedAt: now.toISOString()
        },
        providerTrace: routeResult.attempts
      };

      const cacheTtlSeconds = payload.cacheTtlSeconds || config.cache.estimateTtlSeconds;
      if (rideId) {
        await cacheActiveRide(redisClient, rideId, activeRideRecord, config.cache.activeRideTtlSeconds);
        await cacheEstimate(redisClient, rideId, activeRideRecord, cacheTtlSeconds);
      }

      return activeRideRecord;
    },

    async upsertActiveRide(input, principal = null) {
      const payload = activeRideInputSchema.parse(input);
      const now = new Date();
      const record = {
        ...payload,
        updatedBy: principal?.subjectId || null,
        updatedAt: now.toISOString(),
        timestamps: {
          observedAt: payload.observedAt || now.toISOString(),
          updatedAt: now.toISOString()
        }
      };

      await cacheActiveRide(redisClient, payload.rideId, record, payload.cacheTtlSeconds || config.cache.activeRideTtlSeconds);
      return record;
    },

    async getActiveRide(rideId) {
      return getActiveRide(redisClient, rideId);
    },

    async getEstimate(rideId) {
      return getCachedEstimate(redisClient, rideId);
    },

    async listActiveRides() {
      return listActiveRides(redisClient);
    }
  };
}

async function cacheActiveRide(redisClient, rideId, record, ttlSeconds) {
  const key = buildEtaActiveRideKey(rideId);
  const indexKey = buildEtaActiveRideIndexKey();
  await redisClient.set(key, JSON.stringify(record), "EX", Math.max(60, ttlSeconds));
  await redisClient.sadd(indexKey, rideId);
}

async function cacheEstimate(redisClient, rideId, record, ttlSeconds) {
  const key = buildEtaEstimateKey(rideId);
  await redisClient.set(key, JSON.stringify(record), "EX", Math.max(30, ttlSeconds));
}

async function getActiveRide(redisClient, rideId) {
  if (!rideId) {
    return null;
  }

  const raw = await redisClient.get(buildEtaActiveRideKey(rideId));
  return raw ? JSON.parse(raw) : null;
}

async function getCachedEstimate(redisClient, rideId) {
  if (!rideId) {
    return null;
  }

  const raw = await redisClient.get(buildEtaEstimateKey(rideId));
  return raw ? JSON.parse(raw) : null;
}

async function listActiveRides(redisClient) {
  const rideIds = await redisClient.smembers(buildEtaActiveRideIndexKey());
  const results = [];

  for (const rideId of rideIds) {
    const ride = await getActiveRide(redisClient, rideId);
    if (!ride) {
      await redisClient.srem(buildEtaActiveRideIndexKey(), rideId);
      continue;
    }

    results.push(ride);
  }

  return results;
}

function buildHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}