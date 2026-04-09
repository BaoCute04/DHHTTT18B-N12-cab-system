/**
 * Ride Routes
 * Defines all ride API endpoints
 */

const express = require('express');
const rideController = require('../controllers/ride.controller');

const router = express.Router();

/**
 * Ride Management Endpoints
 */

// Create a new ride
router.post('/', rideController.createRide);

// Get ride statistics
router.get('/stats', rideController.getStatistics);

// Get ride by ID
router.get('/:rideId', rideController.getRide);

// Assign driver to ride
router.post('/:rideId/assign-driver', rideController.assignDriver);

// Update driver location
router.post('/:rideId/location', rideController.updateLocation);

// Start a ride
router.post('/:rideId/start', rideController.startRide);

// Complete a ride
router.post('/:rideId/complete', rideController.completeRide);

// Cancel a ride
router.post('/:rideId/cancel', rideController.cancelRide);

module.exports = router;
