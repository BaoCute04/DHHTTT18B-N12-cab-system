import express from "express";
import { getAiProfileForService } from "../../../../platform/architecture/ai-topology.js";
import { brokerTopology } from "../../../../platform/architecture/event-contracts.js";
import { getRealtimeFlowsForService } from "../../../../platform/architecture/realtime-topology.js";
import { getResilienceProfileForService } from "../../../../platform/architecture/resilience-topology.js";
import { getSecurityProfileForService } from "../../../../platform/architecture/security-topology.js";
import { getServiceManifest } from "../../../../platform/architecture/service-manifests.js";
import { asyncHandler } from "../lib/async-handler.js";
import { sendSuccess } from "../lib/response.js";
import {
  createPaymentMethodSchema,
  createSavedLocationSchema,
  eligibleDriversQuerySchema,
  locationIdParamSchema,
  patchDriverProfileSchema,
  patchSavedLocationSchema,
  patchUserPreferencesSchema,
  patchUserProfileSchema,
  userIdParamSchema,
  userListQuerySchema
} from "../schemas/user-schemas.js";

export function createUserRoutes({ broker, repository, userDomainService }) {
  const manifest = getServiceManifest("user-service");
  const router = express.Router();

  router.get("/health", (_request, response) => {
    response.json({
      service: manifest.key,
      status: "ok",
      storageEngine: repository.kind,
      brokerConnected: broker.connected
    });
  });

  router.get("/architecture", (_request, response) => {
    response.json({
      ...manifest,
      broker: {
        provider: brokerTopology.provider,
        brokersEnv: brokerTopology.brokersEnv,
        connected: broker.connected,
        mode: broker.mode,
        supportedEvents: broker.supportedEvents
      },
      aiProfile: getAiProfileForService(manifest.key),
      realtimeFlows: getRealtimeFlowsForService(manifest.key),
      resilienceProfile: getResilienceProfileForService(manifest.key),
      securityProfile: getSecurityProfileForService(manifest.key),
      storageEngine: repository.kind
    });
  });

  router.get(`${manifest.gatewayPath}/catalog`, (_request, response) => {
    response.json({
      service: manifest.key,
      displayName: manifest.displayName,
      gatewayPath: manifest.gatewayPath,
      routes: [
        "GET /api/v1/users",
        "GET /api/v1/users/drivers/eligible",
        "GET /api/v1/users/:userId",
        "PATCH /api/v1/users/:userId",
        "GET /api/v1/users/:userId/summary",
        "GET /api/v1/users/:userId/driver-profile",
        "PATCH /api/v1/users/:userId/driver-profile",
        "GET /api/v1/users/:userId/preferences",
        "PATCH /api/v1/users/:userId/preferences",
        "GET /api/v1/users/:userId/saved-locations",
        "POST /api/v1/users/:userId/saved-locations",
        "PATCH /api/v1/users/:userId/saved-locations/:locationId",
        "DELETE /api/v1/users/:userId/saved-locations/:locationId",
        "GET /api/v1/users/:userId/payment-methods",
        "POST /api/v1/users/:userId/payment-methods",
        "GET /api/v1/users/:userId/wallet"
      ],
      scope: "M1+"
    });
  });

  router.get(manifest.gatewayPath, asyncHandler(async (request, response) => {
    const query = userListQuerySchema.parse(request.query);
    const users = await userDomainService.listUsers(query);
    sendSuccess(response, request, 200, "Users fetched", users);
  }));

  router.get(`${manifest.gatewayPath}/drivers/eligible`, asyncHandler(async (request, response) => {
    const query = eligibleDriversQuerySchema.parse(request.query);
    const drivers = await userDomainService.listEligibleDrivers(query);
    sendSuccess(response, request, 200, "Eligible drivers fetched", drivers);
  }));

  router.get(`${manifest.gatewayPath}/:userId/summary`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const summary = await userDomainService.getUserSummary(userId);
    sendSuccess(response, request, 200, "User summary fetched", summary);
  }));

  router.get(`${manifest.gatewayPath}/:userId`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const user = await userDomainService.getUser(userId);
    sendSuccess(response, request, 200, "User profile fetched", user);
  }));

  router.patch(`${manifest.gatewayPath}/:userId`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const payload = patchUserProfileSchema.parse(request.body);
    const result = await userDomainService.upsertUserProfile(userId, payload);
    const statusCode = result.created ? 201 : 200;
    const message = result.created ? "User profile created" : "User profile updated";

    sendSuccess(response, request, statusCode, message, result.user);
  }));

  router.get(`${manifest.gatewayPath}/:userId/driver-profile`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const driverProfile = await userDomainService.getDriverProfile(userId);
    sendSuccess(response, request, 200, "Driver profile fetched", driverProfile);
  }));

  router.patch(`${manifest.gatewayPath}/:userId/driver-profile`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const payload = patchDriverProfileSchema.parse(request.body);
    const driverProfile = await userDomainService.upsertDriverProfile(userId, payload);
    sendSuccess(response, request, 200, "Driver profile updated", driverProfile);
  }));

  router.get(`${manifest.gatewayPath}/:userId/preferences`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const preferences = await userDomainService.getPreferences(userId);
    sendSuccess(response, request, 200, "User preferences fetched", preferences);
  }));

  router.patch(`${manifest.gatewayPath}/:userId/preferences`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const payload = patchUserPreferencesSchema.parse(request.body);
    const preferences = await userDomainService.upsertPreferences(userId, payload);
    sendSuccess(response, request, 200, "User preferences updated", preferences);
  }));

  router.get(`${manifest.gatewayPath}/:userId/saved-locations`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const savedLocations = await userDomainService.listSavedLocations(userId);
    sendSuccess(response, request, 200, "Saved locations fetched", savedLocations);
  }));

  router.post(`${manifest.gatewayPath}/:userId/saved-locations`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const payload = createSavedLocationSchema.parse(request.body);
    const savedLocation = await userDomainService.createSavedLocation(userId, payload);
    sendSuccess(response, request, 201, "Saved location created", savedLocation);
  }));

  router.patch(`${manifest.gatewayPath}/:userId/saved-locations/:locationId`, asyncHandler(async (request, response) => {
    const { userId, locationId } = {
      ...userIdParamSchema.parse({ userId: request.params.userId }),
      ...locationIdParamSchema.parse({ locationId: request.params.locationId })
    };
    const payload = patchSavedLocationSchema.parse(request.body);
    const savedLocation = await userDomainService.updateSavedLocation(userId, locationId, payload);
    sendSuccess(response, request, 200, "Saved location updated", savedLocation);
  }));

  router.delete(`${manifest.gatewayPath}/:userId/saved-locations/:locationId`, asyncHandler(async (request, response) => {
    const { userId, locationId } = {
      ...userIdParamSchema.parse({ userId: request.params.userId }),
      ...locationIdParamSchema.parse({ locationId: request.params.locationId })
    };
    const result = await userDomainService.deleteSavedLocation(userId, locationId);
    sendSuccess(response, request, 200, "Saved location deleted", result);
  }));

  router.get(`${manifest.gatewayPath}/:userId/payment-methods`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const paymentMethods = await userDomainService.listPaymentMethods(userId);
    sendSuccess(response, request, 200, "Payment methods fetched", paymentMethods);
  }));

  router.post(`${manifest.gatewayPath}/:userId/payment-methods`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const payload = createPaymentMethodSchema.parse(request.body);
    const paymentMethod = await userDomainService.createPaymentMethod(userId, payload);
    sendSuccess(response, request, 201, "Payment method created", paymentMethod);
  }));

  router.get(`${manifest.gatewayPath}/:userId/wallet`, asyncHandler(async (request, response) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const wallet = await userDomainService.getWallet(userId);
    sendSuccess(response, request, 200, "Wallet read model fetched", wallet);
  }));

  return router;
}
