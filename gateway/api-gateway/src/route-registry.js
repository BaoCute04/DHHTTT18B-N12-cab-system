import { serviceManifests } from "../../../platform/architecture/service-manifests.js";
import { httpSchemas } from "./validation-schemas.js";

const familyRoleMap = {
  "auth-service": ["Customer", "Driver", "Admin"],
  "user-service": ["Customer", "Driver", "Admin"],
  "driver-service": ["Driver", "Admin"],
  "booking-service": ["Customer", "Admin"],
  "ride-service": ["Customer", "Driver", "Admin"],
  "pricing-service": ["Customer", "Driver", "Admin"],
  "payment-service": ["Customer", "Admin"],
  "notification-service": ["Customer", "Driver", "Admin"],
  "review-service": ["Customer", "Driver", "Admin"]
};

export function createRouteRegistry({ env = process.env, upstreamTimeoutMs = 5000 } = {}) {
  const families = Object.values(serviceManifests).map((manifest) => ({
    familyKey: manifest.gatewayPath.replace("/api/v1/", ""),
    prefix: manifest.gatewayPath,
    serviceKey: manifest.key,
    upstreamUrl: env[buildTargetEnvName(manifest.key)] || `http://localhost:${manifest.port}`,
    authRequired: true,
    allowedRoles: familyRoleMap[manifest.key] || [],
    timeoutMs: upstreamTimeoutMs
  }));

  const authRatePolicy = createRatePolicy("auth", 5, 60_000, "ip");

  const policies = [
    {
      key: "auth-login",
      method: "POST",
      path: "/api/v1/auth/login",
      authRequired: false,
      rateLimit: authRatePolicy,
      validationSchema: httpSchemas.login
    },
    {
      key: "auth-refresh",
      method: "POST",
      path: "/api/v1/auth/refresh",
      authRequired: false,
      rateLimit: authRatePolicy,
      validationSchema: httpSchemas.refresh
    },
    {
      key: "auth-otp-request",
      method: "POST",
      path: "/api/v1/auth/login/otp/request",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "auth-otp-verify",
      method: "POST",
      path: "/api/v1/auth/login/otp/verify",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "auth-admin-login",
      method: "POST",
      path: "/api/v1/auth/login/admin",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "auth-mfa-challenge",
      method: "POST",
      path: "/api/v1/auth/mfa/challenge",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "auth-oauth-token",
      method: "POST",
      path: "/api/v1/auth/oauth/token",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "auth-oauth-revoke",
      method: "POST",
      path: "/api/v1/auth/oauth/revoke",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "auth-logout",
      method: "POST",
      path: "/api/v1/auth/logout",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "auth-logout-all",
      method: "POST",
      path: "/api/v1/auth/logout-all",
      authRequired: false,
      rateLimit: authRatePolicy
    },
    {
      key: "booking-create",
      method: "POST",
      path: "/api/v1/bookings",
      allowedRoles: ["Customer", "Admin"],
      rateLimit: createRatePolicy("booking-create", 10, 10_000, "user-or-ip"),
      validationSchema: httpSchemas.bookingCreate,
      idempotency: {
        required: true,
        ttlMs: 15 * 60_000
      }
    },
    {
      key: "payment-create",
      method: "POST",
      path: "/api/v1/payments",
      allowedRoles: ["Customer", "Admin"],
      rateLimit: createRatePolicy("payment-create", 10, 10_000, "user-or-ip"),
      validationSchema: httpSchemas.paymentCreate,
      idempotency: {
        required: true,
        ttlMs: 24 * 60 * 60_000
      }
    }
  ];

  return {
    resolve(request) {
      const pathname = extractPathname(request.originalUrl || request.url || "/");
      const family = families.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
      const policy = policies.find((item) => item.method === request.method && item.path === pathname);
      const isApiRoute = pathname.startsWith("/api/v1/");

      return {
        key: policy?.key || family?.familyKey || (isApiRoute ? "unmapped-api-route" : "public"),
        isApiRoute,
        pathname,
        serviceKey: family?.serviceKey || null,
        upstreamUrl: family?.upstreamUrl || null,
        authRequired: policy?.authRequired ?? family?.authRequired ?? false,
        allowedRoles: policy?.allowedRoles ?? family?.allowedRoles ?? [],
        rateLimit: policy?.rateLimit ?? (pathname.startsWith("/api/v1/auth/") ? authRatePolicy : null),
        validationSchema: policy?.validationSchema ?? null,
        idempotency: policy?.idempotency ?? null,
        timeoutMs: family?.timeoutMs || upstreamTimeoutMs
      };
    }
  };
}

function createRatePolicy(name, limit, windowMs, identity) {
  return {
    name,
    limit,
    windowMs,
    identity
  };
}

function extractPathname(urlLike) {
  return new URL(urlLike, "http://gateway.local").pathname;
}

function buildTargetEnvName(serviceName) {
  return serviceName.toUpperCase().replace(/-/g, "_") + "_URL";
}
