import { GatewayError } from "../errors.js";

export function enforceDriverLocationAbac(auth, payload) {
  if (!auth) {
    throw new GatewayError(401, "UNAUTHORIZED", "Authentication is required");
  }

  if (auth.role !== "Driver") {
    throw new GatewayError(403, "FORBIDDEN", "Only drivers can publish GPS updates");
  }

  if (payload.rideStatus !== "ACTIVE") {
    throw new GatewayError(403, "FORBIDDEN", "Driver can update GPS only when ride is ACTIVE");
  }
}
