import axios from "axios";

export async function calculateEta({ rideId, driverLocation, config, logger }) {
  try {
    const headers = {
      "Content-Type": "application/json",
      "X-Consumer-ID": "eta-tracking-consumer",
      "X-Request-ID": `${rideId}-${Date.now()}`
    };

    if (config.eta.internalAuthToken) {
      headers["X-Internal-Token"] = config.eta.internalAuthToken;
    }

    const response = await axios.post(
      `${config.eta.serviceUrl}/internal/eta/estimate`,
      {
        rideId,
        origin: driverLocation,
        // destination will be fetched from active ride cache in ETA service
        provider: "auto"
      },
      {
        timeout: config.eta.timeout,
        headers
      }
    );

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      logger.warn("Invalid ETA response format", { rideId, response: response.data });
      return null;
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      logger.error("ETA Service unavailable (connection refused)", { rideId });
    } else if (error.response?.status === 404) {
      logger.debug("Ride not found in ETA cache", { rideId });
      return null;
    } else if (error.response?.status === 401) {
      logger.warn("ETA Service authentication failed", { rideId });
    } else {
      logger.error("ETA calculation failed", {
        rideId,
        error: error.message,
        status: error.response?.status
      });
    }
    return null;
  }
}
