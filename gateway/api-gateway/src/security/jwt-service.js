import { createSecretKey } from "node:crypto";
import { importSPKI, jwtVerify } from "jose";
import { GatewayError } from "../errors.js";

export function createJwtService({
  secret = process.env.JWT_ACCESS_SECRET,
  publicKey = process.env.JWT_PUBLIC_KEY,
  issuer = process.env.JWT_ISSUER,
  audience = process.env.JWT_AUDIENCE
} = {}) {
  return {
    configured: Boolean(secret || publicKey),
    async verifyAccessToken(token) {
      if (!token) {
        throw new GatewayError(401, "UNAUTHORIZED", "Access token is required");
      }

      if (!secret && !publicKey) {
        throw new GatewayError(500, "JWT_NOT_CONFIGURED", "JWT validation is not configured", {
          expose: false
        });
      }

      try {
        const key = secret
          ? createSecretKey(Buffer.from(secret, "utf8"))
          : await importSPKI(publicKey, "RS256");

        const { payload } = await jwtVerify(token, key, {
          issuer: issuer || undefined,
          audience: audience || undefined
        });

        return {
          token,
          subject: payload.sub ?? null,
          userId: payload.userId ?? payload.sub ?? null,
          role: payload.role ?? null,
          clientType: payload.clientType ?? null,
          scopes: normalizeScopes(payload.scope),
          claims: payload
        };
      } catch (error) {
        if (error?.code === "ERR_JWT_EXPIRED") {
          throw new GatewayError(401, "TOKEN_EXPIRED", "Access token has expired");
        }

        throw new GatewayError(401, "INVALID_TOKEN", "Access token is invalid", {
          cause: error
        });
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

function normalizeScopes(scopeValue) {
  if (!scopeValue) {
    return [];
  }

  if (Array.isArray(scopeValue)) {
    return scopeValue;
  }

  if (typeof scopeValue === "string") {
    return scopeValue.split(" ").filter(Boolean);
  }

  return [];
}
