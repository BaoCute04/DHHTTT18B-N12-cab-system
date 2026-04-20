function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(origin, destination) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

function normalizeResult(provider, distanceMeters, durationSeconds) {
  return {
    provider,
    distanceMeters: Math.max(0, Math.round(distanceMeters || 0)),
    durationSeconds: Math.max(1, Math.round(durationSeconds || 1)),
    trafficSeconds: Math.max(1, Math.round(durationSeconds || 1))
  };
}

async function resolveWithOsrm(origin, destination, timeoutMs) {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`OSRM request failed (${response.status})`);
  }

  const payload = await response.json();
  const route = payload?.routes?.[0];

  if (!route) {
    throw new Error("OSRM returned empty routes");
  }

  return normalizeResult("osrm", route.distance, route.duration);
}

async function resolveWithGoogle(origin, destination, timeoutMs, apiKey) {
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }

  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    key: apiKey
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Google request failed (${response.status})`);
  }

  const payload = await response.json();
  const row = payload?.rows?.[0]?.elements?.[0];

  if (!row || row.status !== "OK") {
    throw new Error("Google provider returned invalid route");
  }

  return normalizeResult("google", row.distance?.value, row.duration_in_traffic?.value || row.duration?.value);
}

async function resolveWithGraphhopper(origin, destination, timeoutMs, apiKey) {
  if (!apiKey) {
    throw new Error("GRAPHHOPPER_API_KEY is missing");
  }

  const params = new URLSearchParams({
    profile: "car",
    key: apiKey,
    point: `${origin.lat},${origin.lng}`
  });
  params.append("point", `${destination.lat},${destination.lng}`);

  const response = await fetch(`https://graphhopper.com/api/1/route?${params.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`GraphHopper request failed (${response.status})`);
  }

  const payload = await response.json();
  const path = payload?.paths?.[0];

  if (!path) {
    throw new Error("GraphHopper returned empty paths");
  }

  return normalizeResult("graphhopper", path.distance, path.time / 1000);
}

async function resolveWithMapbox(origin, destination, timeoutMs, apiKey) {
  if (!apiKey) {
    throw new Error("MAPBOX_API_KEY is missing");
  }

  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: apiKey,
    overview: "false"
  });

  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Mapbox request failed (${response.status})`);
  }

  const payload = await response.json();
  const route = payload?.routes?.[0];

  if (!route) {
    throw new Error("Mapbox returned empty routes");
  }

  return normalizeResult("mapbox", route.distance, route.duration);
}

function resolveWithHeuristic(origin, destination) {
  const distanceMeters = haversineDistanceMeters(origin, destination);
  const averageSpeedMetersPerSecond = 8.5;
  const durationSeconds = distanceMeters / averageSpeedMetersPerSecond;
  return normalizeResult("heuristic", distanceMeters, durationSeconds);
}

export async function resolveRoute(origin, destination, config, logger = console) {
  const providerChain = {
    google: () => resolveWithGoogle(origin, destination, config.providerTimeoutMs, config.googleMapsApiKey),
    osrm: () => resolveWithOsrm(origin, destination, config.providerTimeoutMs),
    graphhopper: () => resolveWithGraphhopper(origin, destination, config.providerTimeoutMs, config.graphhopperApiKey),
    mapbox: () => resolveWithMapbox(origin, destination, config.providerTimeoutMs, config.mapboxApiKey),
    heuristic: () => Promise.resolve(resolveWithHeuristic(origin, destination))
  };

  const triedProviders = [];

  for (const provider of config.providers) {
    const resolver = providerChain[provider];
    if (!resolver) {
      continue;
    }

    triedProviders.push(provider);

    try {
      const result = await resolver();
      return {
        ...result,
        triedProviders
      };
    } catch (error) {
      logger.warn?.(`[eta-service] provider ${provider} failed: ${error.message}`);
    }
  }

  const fallback = resolveWithHeuristic(origin, destination);
  return {
    ...fallback,
    triedProviders: [...triedProviders, "heuristic"]
  };
}
