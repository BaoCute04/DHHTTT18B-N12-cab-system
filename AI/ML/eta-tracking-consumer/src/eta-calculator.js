export async function calculateEta(payload, config) {
  const response = await fetch(`${config.etaServiceUrl}/internal/eta/estimate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": config.etaInternalToken
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.requestTimeoutMs)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eta-service responded ${response.status}: ${text}`);
  }

  const result = await response.json();
  if (!result?.success || !result?.data) {
    throw new Error("eta-service returned invalid response");
  }

  return result.data;
}

export async function getActiveRide(rideId, config) {
  const response = await fetch(`${config.etaServiceUrl}/internal/eta/active-rides/${rideId}`, {
    method: "GET",
    headers: {
      "x-internal-token": config.etaInternalToken
    },
    signal: AbortSignal.timeout(config.requestTimeoutMs)
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eta-service active-ride lookup failed ${response.status}: ${text}`);
  }

  const result = await response.json();
  return result?.data || null;
}
