import {
  createErrorResponse,
  createResponse,
  validateDriverPayload,
  validateLocationPayload,
  DRIVER_STATUS,
  DRIVER_AVAILABILITY
} from "../utils/index.js";
import { findDriver, listAvailableDrivers, upsertDriver, updateDriverStatus, updateDriverLocation } from "../models/Driver.js";
import { publishDriverLocationUpdate } from "../infra/kafka.js";

export async function getAvailableDrivers(request, response) {
  try {
    const availableDrivers = await listAvailableDrivers();
    return response.json(
      createResponse({
        message: "Available drivers fetched",
        data: { drivers: availableDrivers },
        request
      })
    );
  } catch (error) {
    console.error("[getAvailableDrivers] error:", error.message);
    return createErrorResponse(response, 500, "Failed to fetch available drivers", request);
  }
}

export async function getDriverById(request, response) {
  try {
    const driver = await findDriver(request.params.driverId);
    if (!driver) {
      return createErrorResponse(response, 404, "Driver not found", request);
    }

    return response.json(
      createResponse({
        message: "Driver fetched",
        data: driver.toObject ? driver.toObject() : driver,
        request
      })
    );
  } catch (error) {
    console.error("[getDriverById] error:", error.message);
    return createErrorResponse(response, 500, "Failed to fetch driver", request);
  }
}

export async function patchDriver(request, response) {
  try {
    const payload = request.body || {};
    if (Object.keys(payload).length === 0) {
      return createErrorResponse(response, 400, "Request payload is required", request);
    }

    const validation = validateDriverPayload(payload);
    if (!validation.success) {
      return createErrorResponse(response, 400, validation.message, request);
    }

    const existingDriver = await findDriver(request.params.driverId);
    const driver = await upsertDriver(request.params.driverId, payload);

    if (!driver) {
      return createErrorResponse(response, 500, "Failed to save driver", request);
    }

    const message = existingDriver ? "Driver updated" : "Driver created";

    return response.json(
      createResponse({
        message,
        data: driver.toObject ? driver.toObject() : driver,
        request
      })
    );
  } catch (error) {
    console.error("[patchDriver] error:", error.message);
    return createErrorResponse(response, 500, "Failed to update driver", request);
  }
}

export async function goOnline(request, response) {
  try {
    const driver = await findDriver(request.params.driverId);
    if (!driver) {
      return createErrorResponse(response, 404, "Driver not found", request);
    }

    const updatedDriver = await updateDriverStatus(request.params.driverId, {
      status: DRIVER_STATUS.ONLINE,
      availability: driver.availability === DRIVER_AVAILABILITY.BUSY ? DRIVER_AVAILABILITY.BUSY : DRIVER_AVAILABILITY.AVAILABLE
    });

    if (!updatedDriver) {
      return createErrorResponse(response, 500, "Failed to update driver status", request);
    }

    return response.json(
      createResponse({
        message: "Driver is now ONLINE",
        data: updatedDriver.toObject ? updatedDriver.toObject() : updatedDriver,
        request
      })
    );
  } catch (error) {
    console.error("[goOnline] error:", error.message);
    return createErrorResponse(response, 500, "Failed to go online", request);
  }
}

export async function goOffline(request, response) {
  try {
    const driver = await findDriver(request.params.driverId);
    if (!driver) {
      return createErrorResponse(response, 404, "Driver not found", request);
    }

    const updatedDriver = await updateDriverStatus(request.params.driverId, {
      status: DRIVER_STATUS.OFFLINE
    });

    if (!updatedDriver) {
      return createErrorResponse(response, 500, "Failed to update driver status", request);
    }

    return response.json(
      createResponse({
        message: "Driver is now OFFLINE",
        data: updatedDriver.toObject ? updatedDriver.toObject() : updatedDriver,
        request
      })
    );
  } catch (error) {
    console.error("[goOffline] error:", error.message);
    return createErrorResponse(response, 500, "Failed to go offline", request);
  }
}

export async function updateLocation(request, response) {
  try {
    const payload = request.body || {};
    const validation = validateLocationPayload(payload);
    if (!validation.success) {
      return createErrorResponse(response, 400, validation.message, request);
    }

    const driver = await findDriver(request.params.driverId);
    if (!driver) {
      return createErrorResponse(response, 404, "Driver not found", request);
    }

    const updatedDriver = await updateDriverLocation(request.params.driverId, payload);

    if (!updatedDriver) {
      return createErrorResponse(response, 500, "Failed to update location", request);
    }

    const rideId = payload.rideId || request.header("x-ride-id") || null;
    const targetLocation = payload.targetLocation || payload.pickup || payload.destination || null;

    if (rideId) {
      await publishDriverLocationUpdate(
        {
          event: "driver.location.updated",
          rideId,
          driverId: request.params.driverId,
          mode: payload.mode || "to-pickup",
          lat: payload.lat,
          lng: payload.lng,
          address: payload.address,
          targetLocation: targetLocation || undefined,
          recordedAt: new Date().toISOString()
        },
        console
      );
    }

    return response.json(
      createResponse({
        message: "Driver location updated",
        data: updatedDriver.toObject ? updatedDriver.toObject() : updatedDriver,
        request
      })
    );
  } catch (error) {
    console.error("[updateLocation] error:", error.message);
    return createErrorResponse(response, 500, "Failed to update location", request);
  }
}

