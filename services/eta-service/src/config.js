export function loadEtaConfig(env = process.env) {
  return {
    serviceName: "eta-service",
    port: Number(env.PORT || 3110),
    redis: {
      url: env.ETA_REDIS_URL || "redis://localhost:6379"
    },
    auth: {
      authServiceUrl: env.ETA_AUTH_SERVICE_URL || env.AUTH_SERVICE_URL || "http://localhost:3104",
      jwksUrl: env.ETA_AUTH_JWKS_URL || env.AUTH_JWKS_URL || "",
      issuer: env.JWT_ISSUER || "cab-auth-service",
      audience: env.JWT_AUDIENCE || "cab-api"
    },
    internalAuth: {
      token: env.ETA_INTERNAL_AUTH_TOKEN || ""
    },
    providers: {
      chain: parseList(env.ETA_PROVIDER_CHAIN || "google,osrm,mapbox,graphhopper"),
      google: {
        apiKey: env.ETA_GOOGLE_MAPS_API_KEY || "",
        baseUrl: env.ETA_GOOGLE_MAPS_BASE_URL || "https://maps.googleapis.com/maps/api/distancematrix/json"
      },
      osrm: {
        baseUrl: env.ETA_OSRM_BASE_URL || "https://router.project-osrm.org"
      },
      graphhopper: {
        apiKey: env.ETA_GRAPHHOPPER_API_KEY || "",
        baseUrl: env.ETA_GRAPHHOPPER_BASE_URL || "https://graphhopper.com/api/1/route"
      },
      mapbox: {
        accessToken: env.ETA_MAPBOX_ACCESS_TOKEN || "",
        baseUrl: env.ETA_MAPBOX_BASE_URL || "https://api.mapbox.com/directions/v5/mapbox/driving"
      },
      fallbackTrafficFactor: Number(env.ETA_FALLBACK_TRAFFIC_FACTOR || 1.18)
    },
    cache: {
      activeRideTtlSeconds: Number(env.ETA_ACTIVE_RIDE_TTL_SECONDS || 86400),
      estimateTtlSeconds: Number(env.ETA_ESTIMATE_TTL_SECONDS || 300)
    },
    access: {
      allowedRoles: ["Customer", "Driver", "Admin"]
    }
  };
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}