import express from "express";

function respondError(response, statusCode, message) {
  response.status(statusCode).json({
    success: false,
    message
  });
}

function ensureInternalToken(request, response, next, internalToken) {
  if (!internalToken) {
    next();
    return;
  }

  const suppliedToken = request.header("x-internal-token");
  if (suppliedToken !== internalToken) {
    respondError(response, 401, "Invalid internal token");
    return;
  }

  next();
}

export function createEtaRouter({ etaService, config }) {
  const router = express.Router();

  router.get("/", (_request, response) => {
    response.json({
      success: true,
      service: "eta-service",
      endpoints: {
        estimate: "POST /internal/eta/estimate",
        getEstimate: "GET /internal/eta/estimate/:rideId",
        upsertActiveRide: "PUT /internal/eta/active-rides/:rideId"
      }
    });
  });

  router.use((request, response, next) => ensureInternalToken(request, response, next, config.internalToken));

  router.post("/estimate", async (request, response) => {
    try {
      const estimate = await etaService.estimateEta(request.body || {});
      response.json({ success: true, data: estimate });
    } catch (error) {
      respondError(response, 400, error.message || "Failed to estimate ETA");
    }
  });

  router.get("/estimate/:rideId", async (request, response) => {
    const estimate = await etaService.getEstimate(request.params.rideId);

    if (!estimate) {
      respondError(response, 404, "ETA estimate not found");
      return;
    }

    response.json({ success: true, data: estimate });
  });

  router.put("/active-rides/:rideId", async (request, response) => {
    try {
      const ride = await etaService.upsertActiveRide(request.params.rideId, request.body || {});
      response.json({ success: true, data: ride });
    } catch (error) {
      respondError(response, 400, error.message || "Failed to update active ride");
    }
  });

  router.get("/active-rides/:rideId", async (request, response) => {
    const ride = await etaService.getActiveRide(request.params.rideId);

    if (!ride) {
      respondError(response, 404, "Active ride not found");
      return;
    }

    response.json({ success: true, data: ride });
  });

  return router;
}
