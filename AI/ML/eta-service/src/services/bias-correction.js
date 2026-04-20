function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeHeuristicBias({ durationSeconds, trafficSeconds, historicalBias = 1 }) {
  const trafficRatio = durationSeconds > 0 ? trafficSeconds / durationSeconds : 1;
  const normalizedTraffic = clamp(trafficRatio, 0.8, 1.8);
  const normalizedHistorical = clamp(Number(historicalBias) || 1, 0.85, 1.35);
  return clamp(normalizedTraffic * normalizedHistorical, 0.85, 1.5);
}

export async function resolveBiasFactor(context, config, logger = console) {
  const heuristicFactor = computeHeuristicBias(context);

  if (!config.modelServingUrl) {
    return {
      source: "heuristic",
      factor: heuristicFactor
    };
  }

  try {
    const response = await fetch(config.modelServingUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(context),
      signal: AbortSignal.timeout(2000)
    });

    if (!response.ok) {
      throw new Error(`model serving returned ${response.status}`);
    }

    const payload = await response.json();
    const factor = Number(payload?.factor);

    if (!Number.isFinite(factor)) {
      throw new Error("model serving response missing numeric factor");
    }

    return {
      source: "model-serving",
      factor: clamp(factor, 0.8, 1.6)
    };
  } catch (error) {
    logger.warn?.(`[eta-service] model serving fallback: ${error.message}`);
    return {
      source: "heuristic",
      factor: heuristicFactor
    };
  }
}
