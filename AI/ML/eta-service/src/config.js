function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseProviders(rawValue) {
  const providers = String(rawValue || "osrm,heuristic")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return providers.length > 0 ? providers : ["osrm", "heuristic"];
}

export function loadConfig(env = process.env) {
  return {
    port: parseNumber(env.PORT, 3110),
    redisUrl: env.ETA_REDIS_URL || "redis://localhost:6379",
    cacheTtlSeconds: parseNumber(env.ETA_CACHE_TTL_SECONDS, 120),
    activeRideTtlSeconds: parseNumber(env.ETA_ACTIVE_RIDE_TTL_SECONDS, 600),
    providers: parseProviders(env.ETA_PROVIDERS),
    providerTimeoutMs: parseNumber(env.ETA_PROVIDER_TIMEOUT_MS, 2500),
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || "",
    graphhopperApiKey: env.GRAPHHOPPER_API_KEY || "",
    mapboxApiKey: env.MAPBOX_API_KEY || "",
    internalToken: env.ETA_INTERNAL_TOKEN || "",
    modelServingUrl: env.ETA_MODEL_SERVING_URL || ""
  };
}
