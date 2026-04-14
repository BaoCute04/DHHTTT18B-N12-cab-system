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

    if (!request.auth?.role || !allowedRoles.includes(request.auth.role)) {
      return next(new GatewayError(403, "FORBIDDEN", "You do not have permission to access this resource"));
    }

    return next();
  };
}
