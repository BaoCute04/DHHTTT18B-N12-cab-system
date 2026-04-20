import { createRemoteJWKSet, jwtVerify } from "jose";

export function createEtaAuthVerifier({ authServiceUrl, jwksUrl, issuer, audience } = {}) {
  const resolvedJwksUrl = jwksUrl || buildAuthUrl(authServiceUrl || "http://localhost:3104", "/.well-known/jwks.json");
  const remoteJwks = createRemoteJWKSet(new URL(resolvedJwksUrl));

  return {
    configured: Boolean(resolvedJwksUrl),
    async verifyAccessToken(token) {
      if (!token) {
        throw createAuthError(401, "UNAUTHORIZED", "Bearer token is required");
      }

      try {
        const verified = await jwtVerify(token, remoteJwks, {
          issuer: issuer || undefined,
          audience: audience || undefined,
          algorithms: ["RS256"]
        });

        return normalizePrincipal(verified.payload, token);
      } catch (error) {
        throw mapJwtVerificationError(error);
      }
    }
  };
}

export function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function normalizePrincipal(payload, token) {
  const roles = normalizeRoles(Array.isArray(payload.roles) ? payload.roles : payload.role ? [payload.role] : []);
  const role = roles[0] || normalizeRole(payload.role) || null;

  return {
    token,
    subjectId: payload.sub || null,
    userId: payload.sub || null,
    sessionId: payload.sid || null,
    role,
    roles: roles.length > 0 ? roles : role ? [role] : [],
    scopes: normalizeList(payload.scope),
    permissions: normalizeList(payload.permissions),
    claims: payload
  };
}

function normalizeRoles(roles) {
  return normalizeList(roles).map(normalizeRole).filter(Boolean);
}

function normalizeRole(role) {
  if (!role) {
    return null;
  }

  const normalized = String(role).trim().toLowerCase();
  if (normalized === "customer") {
    return "Customer";
  }

  if (normalized === "driver") {
    return "Driver";
  }

  if (normalized === "admin") {
    return "Admin";
  }

  return String(role);
}

function normalizeList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(/\s+/).filter(Boolean);
  }

  return [];
}

function mapJwtVerificationError(error) {
  if (error?.code === "ERR_JWT_EXPIRED") {
    return createAuthError(401, "TOKEN_EXPIRED", "Access token has expired");
  }

  return createAuthError(401, "INVALID_TOKEN", "Access token is invalid", { cause: error });
}

function buildAuthUrl(baseUrl, pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  return url.toString();
}

function createAuthError(statusCode, code, message, extras = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (extras.cause) {
    error.cause = extras.cause;
  }
  return error;
}