import { GatewayError } from "../errors.js";

export function createAuthorizationMiddleware() {
  return function authorizationMiddleware(request, _response, next) {
    if (!request.routeConfig?.isApiRoute || !request.routeConfig.authRequired) {
      return next();
    }

    const allowedRoles = request.routeConfig.allowedRoles || [];
    if (allowedRoles.length === 0) {
      return next();
    }

    const authRole = request.auth?.role;
    const normalizedAuthRole = typeof authRole === "string" ? authRole.toLowerCase() : "";
    const allowed = allowedRoles.some(
      (role) => String(role).toLowerCase() === normalizedAuthRole
    );
    if (!normalizedAuthRole || !allowed) {
      return next(new GatewayError(403, "FORBIDDEN", "You do not have permission to access this resource"));
    }

    return next();
  };
}
