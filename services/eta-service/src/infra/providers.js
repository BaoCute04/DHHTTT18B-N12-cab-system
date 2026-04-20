export function createEtaProviderResolver({ providers = {}, fetchImpl = globalThis.fetch, logger = console } = {}) {
  const chain = normalizeChain(providers.chain);

  return {
    async resolveRoute({ origin, destination, departureTime, vehicleType, trafficSensitivity, preferredProvider }) {
      const providerOrder = preferredProvider && preferredProvider !== "auto"
        ? [preferredProvider, ...chain.filter((item) => item !== preferredProvider)]
        : chain;

      const attempts = [];

      for (const providerName of providerOrder) {
        const resolver = resolvers[providerName];
        if (!resolver) {
          continue;
        }

        try {
          const result = await resolver({
            origin,
            destination,
            departureTime,
            vehicleType,
            trafficSensitivity,
            providers,
            fetchImpl
          });

          if (result) {
            return {
              ...result,
              provider: providerName,
              attempts
            };
          }
        } catch (error) {
          attempts.push({ provider: providerName, error: error.message });
          logger.warn?.(`[eta-service] provider ${providerName} failed: ${error.message}`);
        }
      }

      const fallback = calculateHeuristicEta({
        origin,
        destination,
        vehicleType,
        trafficSensitivity,
        trafficFactor: providers.fallbackTrafficFactor || 1.18
      });

      return {
        ...fallback,
        provider: "heuristic",
        attempts
      };
    }
  };
}

const resolvers = {
  google: resolveWithGoogle,
  osrm: resolveWithOsrm,
  graphhopper: resolveWithGraphhopper,
  mapbox: resolveWithMapbox
};

async function resolveWithGoogle({ origin, destination, departureTime, providers, fetchImpl }) {
  if (!providers.google?.apiKey) {
    return null;
  }

  const url = new URL(providers.google.baseUrl);
  url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destinations", `${destination.lat},${destination.lng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("departure_time", departureTime || "now");
  url.searchParams.set("traffic_model", "best_guess");
  url.searchParams.set("key", providers.google.apiKey);

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(`Google Maps API responded with ${response.status}`);
  }

  const body = await response.json();
  const element = body?.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    throw new Error("Google Maps API did not return a valid route");
  }

  const durationSeconds = Math.max(1, Math.round(element.duration_in_traffic?.value || element.duration?.value || 0));
  const distanceMeters = Math.max(1, Math.round(element.distance?.value || 0));
  const trafficSeconds = Math.max(durationSeconds, Math.round(element.duration_in_traffic?.value || durationSeconds));

  return {
    distanceMeters,
    durationSeconds,
    trafficSeconds,
    routeLabel: "google-traffic"
  };
}

async function resolveWithOsrm({ origin, destination, providers, fetchImpl }) {
  const url = new URL(`/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`, providers.osrm.baseUrl);
  url.searchParams.set("overview", "false");
  url.searchParams.set("steps", "false");

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(`OSRM responded with ${response.status}`);
  }

  const body = await response.json();
  const route = body?.routes?.[0];
  if (!route) {
    throw new Error("OSRM did not return a valid route");
  }

  const durationSeconds = Math.max(1, Math.round(route.duration || 0));
  const distanceMeters = Math.max(1, Math.round(route.distance || 0));
  const trafficSeconds = Math.max(durationSeconds, Math.round(durationSeconds * 1.14));

  return {
    distanceMeters,
    durationSeconds,
    trafficSeconds,
    routeLabel: "osrm"
  };
}

async function resolveWithGraphhopper({ origin, destination, providers, fetchImpl }) {
  if (!providers.graphhopper?.apiKey) {
    return null;
  }

  const url = new URL(providers.graphhopper.baseUrl);
  url.searchParams.set("point", `${origin.lat},${origin.lng}`);
  url.searchParams.append("point", `${destination.lat},${destination.lng}`);
  url.searchParams.set("vehicle", "car");
  url.searchParams.set("calc_points", "false");
  url.searchParams.set("key", providers.graphhopper.apiKey);

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(`GraphHopper responded with ${response.status}`);
  }

  const body = await response.json();
  const path = body?.paths?.[0];
  if (!path) {
    throw new Error("GraphHopper did not return a valid route");
  }

  const durationSeconds = Math.max(1, Math.round((path.time || 0) / 1000));
  const distanceMeters = Math.max(1, Math.round(path.distance || 0));
  const trafficSeconds = Math.max(durationSeconds, Math.round(durationSeconds * 1.12));

  return {
    distanceMeters,
    durationSeconds,
    trafficSeconds,
    routeLabel: "graphhopper"
  };
}

async function resolveWithMapbox({ origin, destination, providers, fetchImpl }) {
  if (!providers.mapbox?.accessToken) {
    return null;
  }

  const url = new URL(`${providers.mapbox.baseUrl}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`);
  url.searchParams.set("overview", "false");
  url.searchParams.set("steps", "false");
  url.searchParams.set("access_token", providers.mapbox.accessToken);

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(`Mapbox responded with ${response.status}`);
  }

  const body = await response.json();
  const route = body?.routes?.[0];
  if (!route) {
    throw new Error("Mapbox did not return a valid route");
  }

  const durationSeconds = Math.max(1, Math.round(route.duration || 0));
  const distanceMeters = Math.max(1, Math.round(route.distance || 0));
  const trafficSeconds = Math.max(durationSeconds, Math.round(durationSeconds * 1.15));

  return {
    distanceMeters,
    durationSeconds,
    trafficSeconds,
    routeLabel: "mapbox"
  };
}

function calculateHeuristicEta({ origin, destination, vehicleType, trafficSensitivity, trafficFactor }) {
  const distanceKm = haversineKm(origin, destination);
  const baseSpeedKmh = vehicleSpeedKmh(vehicleType);
  const sensitivityFactor = trafficSensitivity === "high" ? 1.3 : trafficSensitivity === "low" ? 1.05 : 1.15;
  const adjustedFactor = Math.max(1, trafficFactor * sensitivityFactor);
  const durationSeconds = Math.max(60, Math.round((distanceKm / baseSpeedKmh) * 3600));
  const trafficSeconds = Math.max(durationSeconds, Math.round(durationSeconds * adjustedFactor));

  return {
    distanceMeters: Math.max(1, Math.round(distanceKm * 1000)),
    durationSeconds,
    trafficSeconds,
    routeLabel: "heuristic"
  };
}

function vehicleSpeedKmh(vehicleType) {
  if (vehicleType === "bike") {
    return 18;
  }

  if (vehicleType === "car_plus") {
    return 28;
  }

  return 24;
}

function haversineKm(origin, destination) {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function normalizeChain(chain) {
  const values = Array.isArray(chain) ? chain : [];
  const normalized = values.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  return normalized.length > 0 ? normalized : ["google", "osrm", "mapbox", "graphhopper"];
}