import express from "express";

export function createEtaRouter({ etaService }) {
  const router = express.Router();

  router.post("/estimate", async (request, response, next) => {
    try {
      const result = await etaService.estimateEta(request.body, request.principal);
      response.status(200).json({
        success: true,
        message: "ETA calculated successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/active-rides", async (request, response, next) => {
    try {
      const result = await etaService.upsertActiveRide(request.body, request.principal);
      response.status(200).json({
        success: true,
        message: "Active ride cached successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/active-rides", async (_request, response, next) => {
    try {
      const rides = await etaService.listActiveRides();
      response.json({
        success: true,
        message: "Active rides retrieved successfully",
        data: rides
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/active-rides/:rideId", async (request, response, next) => {
    try {
      const ride = await etaService.getActiveRide(request.params.rideId);
      if (!ride) {
        response.status(404).json({
          success: false,
          message: "Active ride not found"
        });
        return;
      }

      response.json({
        success: true,
        message: "Active ride retrieved successfully",
        data: ride
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:rideId", async (request, response, next) => {
    try {
      const estimate = await etaService.getEstimate(request.params.rideId);
      if (!estimate) {
        response.status(404).json({
          success: false,
          message: "ETA estimate not found"
        });
        return;
      }

      response.json({
        success: true,
        message: "ETA estimate retrieved successfully",
        data: estimate
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", (_request, response) => {
    response.json({
      success: true,
      message: "ETA service is running"
    });
  });

  return router;
}