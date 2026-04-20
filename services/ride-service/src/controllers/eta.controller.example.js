/**
 * Example: ETA Service Integration
 * How to use the enhanced ETA Service in ride controllers
 */

const express = require('express');
const etaService = require('../services/eta.service');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/rides/:rideId/eta
 * Calculate ETA to destination with real-time traffic
 */
router.get('/rides/:rideId/eta', async (req, res) => {
  try {
    const { currentLat, currentLng, destLat, destLng } = req.query;
    const { rideId } = req.params;

    // Validate inputs
    if (!currentLat || !currentLng || !destLat || !destLng) {
      return res.status(400).json({
        error: 'Missing required parameters: currentLat, currentLng, destLat, destLng',
      });
    }

    const eta = await etaService.calculateETA(
      { lat: parseFloat(currentLat), lng: parseFloat(currentLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) },
      30, // Average speed fallback
      rideId // Track this ride
    );

    logger.info(`ETA calculated for ride ${rideId}`, eta);
    res.json(eta);
  } catch (error) {
    logger.error('Error calculating ETA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rides/:rideId/pickup-eta
 * Calculate ETA to pickup location
 */
router.get('/rides/:rideId/pickup-eta', async (req, res) => {
  try {
    const { driverLat, driverLng, pickupLat, pickupLng } = req.query;
    const { rideId } = req.params;

    if (!driverLat || !driverLng || !pickupLat || !pickupLng) {
      return res.status(400).json({
        error: 'Missing required parameters: driverLat, driverLng, pickupLat, pickupLng',
      });
    }

    const pickupETA = await etaService.calculatePickupETA(
      { lat: parseFloat(driverLat), lng: parseFloat(driverLng) },
      { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
      30,
      rideId
    );

    logger.info(`Pickup ETA calculated for ride ${rideId}`, pickupETA);
    res.json(pickupETA);
  } catch (error) {
    logger.error('Error calculating pickup ETA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rides/:rideId/full-estimates
 * Calculate complete ride estimates (driver → pickup → destination)
 */
router.get('/rides/:rideId/full-estimates', async (req, res) => {
  try {
    const {
      driverLat,
      driverLng,
      pickupLat,
      pickupLng,
      destLat,
      destLng,
    } = req.query;
    const { rideId } = req.params;

    if (
      !driverLat ||
      !driverLng ||
      !pickupLat ||
      !pickupLng ||
      !destLat ||
      !destLng
    ) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    const estimates = await etaService.calculateRideEstimates(
      { lat: parseFloat(driverLat), lng: parseFloat(driverLng) },
      { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) },
      30,
      rideId
    );

    logger.info(`Full estimates calculated for ride ${rideId}`, estimates);
    res.json(estimates);
  } catch (error) {
    logger.error('Error calculating ride estimates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/rides/:rideId/complete
 * Called when ride completes - update historical statistics
 */
router.post('/rides/:rideId/complete', async (req, res) => {
  try {
    const { rideId } = req.params;
    const {
      driverLat,
      driverLng,
      pickupLat,
      pickupLng,
      destLat,
      destLng,
      estimatedPickupTime,
      actualPickupTime,
      estimatedDestTime,
      actualDestTime,
    } = req.body;

    // Create route hashes for both segments
    const pickupRouteHash = `${Math.round(driverLat * 100)}_${Math.round(driverLng * 100)}_${Math.round(pickupLat * 100)}_${Math.round(pickupLng * 100)}`;
    const destRouteHash = `${Math.round(pickupLat * 100)}_${Math.round(pickupLng * 100)}_${Math.round(destLat * 100)}_${Math.round(destLng * 100)}`;

    // Update historical statistics
    await Promise.all([
      etaService.updateHistoricalStats(
        pickupRouteHash,
        estimatedPickupTime,
        actualPickupTime
      ),
      etaService.updateHistoricalStats(
        destRouteHash,
        estimatedDestTime,
        actualDestTime
      ),
    ]);

    logger.info(`Historical stats updated for ride ${rideId}`);
    res.json({ message: 'Ride statistics updated' });
  } catch (error) {
    logger.error('Error updating ride statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/traffic/statistics/:routeHash
 * Get traffic statistics for a specific route
 */
router.get('/traffic/statistics/:routeHash', async (req, res) => {
  try {
    const { routeHash } = req.params;

    const stats = await etaService.getTrafficStatistics(routeHash);

    if (!stats) {
      return res.status(404).json({ error: 'No statistics found for this route' });
    }

    logger.info(`Traffic statistics retrieved for route ${routeHash}`, stats);
    res.json(stats);
  } catch (error) {
    logger.error('Error retrieving traffic statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/traffic/monitor/:rideId
 * Monitor traffic conditions for a ride
 */
router.post('/traffic/monitor/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;
    const {
      currentLat,
      currentLng,
      destLat,
      destLng,
      previousETA,
    } = req.body;

    if (!previousETA) {
      return res.status(400).json({ error: 'previousETA is required' });
    }

    const currentETA = await etaService.monitorTrafficConditions(
      rideId,
      previousETA,
      { lat: currentLat, lng: currentLng },
      { lat: destLat, lng: destLng }
    );

    logger.info(`Traffic monitored for ride ${rideId}`, currentETA);
    res.json(currentETA);
  } catch (error) {
    logger.error('Error monitoring traffic conditions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/eta-cache/clear
 * Clear ETA cache for a specific route (admin only)
 */
router.post('/eta-cache/clear', async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.body;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    await etaService.clearETACache(lat1, lon1, lat2, lon2);

    logger.info('ETA cache cleared for route', { lat1, lon1, lat2, lon2 });
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * USAGE EXAMPLES:
 *
 * 1. Get ETA to destination:
 *    GET /api/rides/ride-123/eta?currentLat=10.7769&currentLng=106.6966&destLat=10.8141&destLng=106.6955
 *
 * 2. Get ETA to pickup:
 *    GET /api/rides/ride-123/pickup-eta?driverLat=10.7769&driverLng=106.6966&pickupLat=10.7900&pickupLng=106.7100
 *
 * 3. Get full ride estimates:
 *    GET /api/rides/ride-123/full-estimates?driverLat=10.7769&driverLng=106.6966&pickupLat=10.7900&pickupLng=106.7100&destLat=10.8141&destLng=106.6955
 *
 * 4. Complete ride (update statistics):
 *    POST /api/rides/ride-123/complete
 *    {
 *      "driverLat": 10.7769,
 *      "driverLng": 106.6966,
 *      "pickupLat": 10.7900,
 *      "pickupLng": 106.7100,
 *      "destLat": 10.8141,
 *      "destLng": 106.6955,
 *      "estimatedPickupTime": 8,
 *      "actualPickupTime": 9,
 *      "estimatedDestTime": 12,
 *      "actualDestTime": 13
 *    }
 *
 * 5. Get traffic statistics:
 *    GET /api/traffic/statistics/route-hash-123
 *
 * 6. Monitor traffic changes:
 *    POST /api/traffic/monitor/ride-123
 *    {
 *      "currentLat": 10.7769,
 *      "currentLng": 106.6966,
 *      "destLat": 10.8141,
 *      "destLng": 106.6955,
 *      "previousETA": { "eta": 15, "distance": 8.5, "timestamp": 1234567890 }
 *    }
 *
 * 7. Clear cache:
 *    POST /api/eta-cache/clear
 *    {
 *      "lat1": 10.7769,
 *      "lon1": 106.6966,
 *      "lat2": 10.8141,
 *      "lon2": 106.6955
 *    }
 */
