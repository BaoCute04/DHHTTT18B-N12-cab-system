import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from "jose";
import { GatewayError } from "../errors.js";

export function createJwtService({
  authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3104",
  jwksUrl = process.env.AUTH_JWKS_URL,
  authMeUrl = process.env.AUTH_ME_URL,
  issuer = process.env.JWT_ISSUER || "cab-auth-service",
  audience = process.env.JWT_AUDIENCE || "cab-api",
  fetchImpl = globalThis.fetch,
  timeoutMs = Number(process.env.AUTH_VALIDATION_TIMEOUT_MS || process.env.UPSTREAM_TIMEOUT_MS || 5000)
} = {}) {
  const resolvedJwksUrl = jwksUrl || buildAuthUrl(authServiceUrl, "/.well-known/jwks.json");
  const resolvedAuthMeUrl = authMeUrl || buildAuthUrl(authServiceUrl, "/api/v1/auth/me");
  const remoteJwks = createRemoteJWKSet(new URL(resolvedJwksUrl));

  return {
    configured: Boolean(resolvedJwksUrl && resolvedAuthMeUrl),
    jwksUrl: resolvedJwksUrl,
    authMeUrl: resolvedAuthMeUrl,
    async verifyAccessToken(token, context = {}) {
      if (!token) {
        throw new GatewayError(401, "UNAUTHORIZED", "Access token is required");
      }

      if (!resolvedJwksUrl || !resolvedAuthMeUrl) {
        throw new GatewayError(500, "JWT_NOT_CONFIGURED", "JWT validation is not configured", {
          expose: false
        });
      }

      let payload;
      try {
        const verified = await jwtVerify(token, remoteJwks, {
          issuer: issuer || undefined,
          audience: audience || undefined,
          algorithms: ["RS256"]
        });
        payload = verified.payload;
      } catch (error) {
        throw mapJwtVerificationError(error);
      }

      const authContext = await fetchAuthContext({
        token,
        authMeUrl: resolvedAuthMeUrl,
        fetchImpl,
        timeoutMs,
        context
      });

      return normalizeAuthContext({
        token,
        jwtPayload: payload,
        authContext
      });
    }
  };
}

async function fetchAuthContext({ token, authMeUrl, fetchImpl, timeoutMs, context }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers();
    headers.set("authorization", `Bearer ${token}`);

    if (context.requestId) {
      headers.set("x-request-id", context.requestId);
    }

    if (context.correlationId) {
      headers.set("x-correlation-id", context.correlationId);
    }

    const response = await fetchImpl(authMeUrl, {
      method: "GET",
      headers,
      signal: controller.signal
    });

    const body = await readJsonResponse(response);

    if (response.status === 401) {
      throw new GatewayError(401, "INVALID_TOKEN", extractMessage(body, "Access token is invalid or expired"));
    }

    if (response.status === 403) {
      throw new GatewayError(403, "FORBIDDEN", extractMessage(body, "Access token is not allowed"));
    }

    if (!response.ok) {
      throw new GatewayError(503, "AUTH_SERVICE_UNAVAILABLE", "Auth service failed to validate access token");
    }

    return body?.data || body;
  } catch (error) {
    if (error instanceof GatewayError) {
      throw error;
    }

    throw new GatewayError(503, "AUTH_SERVICE_UNAVAILABLE", "Auth service is unavailable for token validation", {
      cause: error
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonResponse(response) {
  const rawBody = await response.text();
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return {
      message: rawBody
    };
  }
}

function normalizeAuthContext({ token, jwtPayload, authContext }) {
  const roles = normalizeRoles(authContext?.roles || jwtPayload.roles || (jwtPayload.role ? [jwtPayload.role] : []));
  const role = normalizeRole(authContext?.role || roles[0] || jwtPayload.role);
  const scopes = normalizeScopes(authContext?.scopes || jwtPayload.scope);
  const permissions = normalizeList(authContext?.permissions || jwtPayload.permissions);
  const subject = authContext?.subjectId || authContext?.sub || jwtPayload.sub || null;

  return {
    token,
    subject,
    subjectId: subject,
    userId: authContext?.userId || subject,
    accountId: authContext?.accountId || jwtPayload.aid || jwtPayload.accountId || null,
    sessionId: authContext?.sessionId || jwtPayload.sid || null,
    role,
    roles: roles.length > 0 ? roles : role ? [role] : [],
    clientType: authContext?.clientType || jwtPayload.clientType || null,
    scopes,
    permissions,
    claims: jwtPayload,
    authContext
  };
}

function mapJwtVerificationError(error) {
  if (error?.code === "ERR_JWT_EXPIRED") {
    return new GatewayError(401, "TOKEN_EXPIRED", "Access token has expired");
  }

  if (
    error instanceof joseErrors.JOSEError &&
    ["ERR_JWS_SIGNATURE_VERIFICATION_FAILED", "ERR_JWT_CLAIM_VALIDATION_FAILED", "ERR_JOSE_ALG_NOT_ALLOWED"].includes(error.code)
  ) {
    return new GatewayError(401, "INVALID_TOKEN", "Access token is invalid", {
      cause: error
    });
  }

  throw new GatewayError(503, "AUTH_JWKS_UNAVAILABLE", "Auth JWKS is unavailable for token validation", {
    cause: error
  });
}

function buildAuthUrl(baseUrl, pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  return url.toString();
}

function extractMessage(body, fallback) {
  return body?.message || body?.error?.message || body?.error || fallback;
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

function normalizeRoles(roles) {
  return normalizeList(roles).map(normalizeRole).filter(Boolean);
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

function normalizeScopes(scopeValue) {
  return normalizeList(scopeValue);
}

function normalizeList(scopeValue) {
  if (!scopeValue) {
    return [];
  }

  if (Array.isArray(scopeValue)) {
    return scopeValue.map((value) => String(value).trim()).filter(Boolean);
  }

  if (typeof scopeValue === "string") {
    return scopeValue.split(/\s+/).filter(Boolean);
  }

  return [];
}
