import { GatewayError } from "../errors.js";

export function enforceDriverLocationAbac(auth, payload) {
  if (!auth) {
    throw new GatewayError(401, "UNAUTHORIZED", "Authentication is required");
  }

  if (auth.role !== "Driver") {
    throw new GatewayError(403, "FORBIDDEN", "Only drivers can publish GPS updates");
  }

  const normalizedStatus = String(payload.rideStatus || "").trim().toUpperCase();
  const allowedStatuses = new Set(["ACTIVE", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "IN_PROGRESS"]);

  if (!allowedStatuses.has(normalizedStatus)) {
    throw new GatewayError(
      403,
      "FORBIDDEN",
      "Driver can update GPS only when ride is active or in driver-arriving / in-progress states"
    );
  }
}
