/**
 * ETA AI Service – Configuration
 * ────────────────────────────────
 * Central config object built from environment variables.
 * Import this wherever you need ETA-related constants.
 */

'use strict';

require('dotenv').config();

const config = {
  // ── Routing ──────────────────────────────────────────────────────────────
  /** Which routing provider to use: osrm | graphhopper | googlemaps | mapbox */
  routingProvider: (process.env.ROUTING_PROVIDER || 'osrm').toLowerCase(),

  /** Base URL for OSRM (default: public demo server) */
  osrmBaseUrl: process.env.OSRM_BASE_URL || 'http://router.project-osrm.org',

  /** GraphHopper base URL */
  graphhopperBaseUrl: process.env.GRAPHHOPPER_BASE_URL || 'https://graphhopper.com/api/1',
  graphhopperApiKey: process.env.GRAPHHOPPER_API_KEY || '',

  /** Google Maps API key */
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',

  /** Mapbox access token */
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || '',

  // ── Redis cache TTLs ─────────────────────────────────────────────────────
  /** Seconds to keep a cached ETA result */
  etaCacheTtl: parseInt(process.env.ETA_CACHE_TTL_SECONDS || '30', 10),

  /** Seconds to keep a driver location or active ride in Redis */
  locationTtl: parseInt(process.env.DRIVER_LOCATION_TTL_SECONDS || '300', 10),

  // ── ETA Heuristics ───────────────────────────────────────────────────────
  /** Average speed (km/h) used when all routing APIs are unavailable */
  fallbackAvgSpeedKmh: parseFloat(process.env.FALLBACK_AVG_SPEED_KMH || '30'),

  /** Minimum ETA value to ever return (minutes) */
  etaMinMinutes: parseInt(process.env.ETA_MIN_MINUTES || '1', 10),

  // ── AI Bias Correction ───────────────────────────────────────────────────
  /**
   * Multiplicative factor applied to the routing API's duration.
   * 1.0 = no adjustment, 1.15 = +15% buffer for traffic variance.
   * Future ML models can dynamically set this per route / time-of-day.
   */
  etaBiasFactor: parseFloat(process.env.ETA_BIAS_FACTOR || '1.0'),
};

module.exports = config;
