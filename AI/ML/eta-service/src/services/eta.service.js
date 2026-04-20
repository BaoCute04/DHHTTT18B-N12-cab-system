import { z } from "zod";
import { resolveRoute } from "../infra/providers.js";
import { resolveBiasFactor } from "./bias-correction.js";

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1).max(250).optional()
});

const estimatePayloadSchema = z.object({
  rideId: z.string().min(1).max(128),
  driverId: z.string().min(1).max(128).optional(),
  mode: z.enum(["to-pickup", "to-destination"]).default("to-pickup"),
  driverLocation: locationSchema,
  targetLocation: locationSchema,
  historicalBias: z.number().min(0.5).max(2).optional()
});

function estimateKey(rideId) {
  return `eta:estimate:${rideId}`;
}

function activeRideKey(rideId) {
  return `eta:ride:${rideId}`;
}

export function createEtaService({ config, redisStore, logger = console }) {
  return {
    async estimateEta(payload) {
      const data = estimatePayloadSchema.parse(payload);

      const route = await resolveRoute(data.driverLocation, data.targetLocation, config, logger);
      const bias = await resolveBiasFactor(
        {
          durationSeconds: route.durationSeconds,
          trafficSeconds: route.trafficSeconds,
          historicalBias: data.historicalBias ?? 1
        },
        config,
        logger
      );

      const etaSeconds = Math.max(30, Math.round(route.durationSeconds * bias.factor));
      const now = new Date().toISOString();

      const estimate = {
        rideId: data.rideId,
        driverId: data.driverId ?? null,
        mode: data.mode,
        provider: route.provider,
        providersTried: route.triedProviders,
        distanceMeters: route.distanceMeters,
        baseDurationSeconds: route.durationSeconds,
        trafficSeconds: route.trafficSeconds,
        bias: {
          source: bias.source,
          factor: bias.factor
        },
        etaSeconds,
        etaMinutes: Math.ceil(etaSeconds / 60),
        driverLocation: data.driverLocation,
        targetLocation: data.targetLocation,
        calculatedAt: now
      };

      await redisStore.setJson(estimateKey(data.rideId), estimate, config.cacheTtlSeconds);
      await redisStore.setJson(
        activeRideKey(data.rideId),
        {
          rideId: data.rideId,
          driverId: data.driverId ?? null,
          mode: data.mode,
          lastDriverLocation: data.driverLocation,
          lastTargetLocation: data.targetLocation,
          lastEstimate: estimate,
          updatedAt: now
        },
        config.activeRideTtlSeconds
      );

      return estimate;
    },

    async getEstimate(rideId) {
      return redisStore.getJson(estimateKey(rideId));
    },

    async getActiveRide(rideId) {
      return redisStore.getJson(activeRideKey(rideId));
    },

    async upsertActiveRide(rideId, payload) {
      const record = {
        rideId,
        ...payload,
        updatedAt: new Date().toISOString()
      };

      await redisStore.setJson(activeRideKey(rideId), record, config.activeRideTtlSeconds);
      return record;
    }
  };
}
