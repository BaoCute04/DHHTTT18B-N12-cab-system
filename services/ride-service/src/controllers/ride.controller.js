/**
 * Ride Controller
 * Handles HTTP requests for ride operations
 */

const { v4: uuidv4 } = require('uuid');
const rideService = require('../services/ride.service');
const locationService = require('../services/location.service');

function generateRequestId() {
  return uuidv4();
}

function createResponse({
  success,
  message,
  data = null,
  requestId = generateRequestId(),
  statusCode = 200,
}) {
  return {
    success,
    message,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
    statusCode,
  };
}

async function createRide(req, res) {
  try {
    const requestId = generateRequestId();
    const { bookingId, userId, driverId, pickup, destination } = req.body;

    if (!bookingId || !userId) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: 'Missing required fields: bookingId, userId',
          statusCode: 400,
          requestId,
        })
      );
    }

    if (!pickup || !destination) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: 'Missing required fields: pickup, destination',
          statusCode: 400,
          requestId,
        })
      );
    }

    const ride = await rideService.createRide({
      bookingId,
      userId,
      driverId,
      pickup,
      destination,
    });

    return res.status(201).json(
      createResponse({
        success: true,
        message: 'Ride created',
        data: ride.toJSON(),
        requestId,
        statusCode: 201,
      })
    );
  } catch (error) {
    return res.status(500).json(
      createResponse({
        success: false,
        message: error.message || 'Internal server error',
        statusCode: 500,
      })
    );
  }
}

async function getRide(req, res) {
  try {
    const requestId = generateRequestId();
    const { rideId } = req.params;

    const ride = await rideService.getRideById(rideId);
    if (!ride) {
      return res.status(404).json(
        createResponse({
          success: false,
          message: 'Ride not found',
          statusCode: 404,
          requestId,
        })
      );
    }

    return res.json(
      createResponse({
        success: true,
        message: 'Ride fetched',
        data: ride.toJSON(),
        requestId,
      })
    );
  } catch (error) {
    return res.status(500).json(
      createResponse({
        success: false,
        message: error.message || 'Internal server error',
        statusCode: 500,
      })
    );
  }
}

async function getUserRides(req, res) {
  try {
    const requestId = generateRequestId();
    const { userId } = req.params;

    const userRides = await rideService.getRidesByUserId(userId);

    return res.json(
      createResponse({
        success: true,
        message: 'User rides fetched',
        data: userRides.map((ride) => ride.toJSON()),
        requestId,
      })
    );
  } catch (error) {
    return res.status(500).json(
      createResponse({
        success: false,
        message: error.message || 'Internal server error',
        statusCode: 500,
      })
    );
  }
}

async function assignDriver(req, res) {
  try {
    const requestId = generateRequestId();
    const { rideId } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: 'driverId is required',
          statusCode: 400,
          requestId,
        })
      );
    }

    const ride = await rideService.assignDriver(rideId, driverId);

    return res.json(
      createResponse({
        success: true,
        message: 'Driver assigned to ride',
        data: ride.toJSON(),
        requestId,
      })
    );
  } catch (error) {
    const statusCode = error.message === 'Ride not found' ? 404 : 400;
    return res.status(statusCode).json(
      createResponse({
        success: false,
        message: error.message,
        statusCode,
      })
    );
  }
}

async function updateLocation(req, res) {
  try {
    const requestId = generateRequestId();
    const { rideId } = req.params;
    const { driverId, currentLocation } = req.body;

    if (!driverId) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: 'driverId is required',
          statusCode: 400,
          requestId,
        })
      );
    }

    const validation = locationService.validateLocation(currentLocation);
    if (!validation.valid) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: validation.error,
          statusCode: 400,
          requestId,
        })
      );
    }

    const ride = await rideService.updateRideLocation(
      rideId,
      driverId,
      currentLocation
    );

    return res.json(
      createResponse({
        success: true,
        message: 'Location updated',
        data: ride.toJSON(),
        requestId,
      })
    );
  } catch (error) {
    const statusCode = error.message === 'Ride not found' ? 404 : 400;
    return res.status(statusCode).json(
      createResponse({
        success: false,
        message: error.message,
        statusCode,
      })
    );
  }
}

async function startRide(req, res) {
  try {
    const requestId = generateRequestId();
    const { rideId } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: 'driverId is required',
          statusCode: 400,
          requestId,
        })
      );
    }

    const ride = await rideService.startRide(rideId, driverId);

    return res.json(
      createResponse({
        success: true,
        message: 'Ride started',
        data: ride.toJSON(),
        requestId,
      })
    );
  } catch (error) {
    const statusCode = error.message === 'Ride not found' ? 404 : 400;
    return res.status(statusCode).json(
      createResponse({
        success: false,
        message: error.message,
        statusCode,
      })
    );
  }
}

async function completeRide(req, res) {
  try {
    const requestId = generateRequestId();
    const { rideId } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: 'driverId is required',
          statusCode: 400,
          requestId,
        })
      );
    }

    const ride = await rideService.completeRide(rideId, driverId);

    return res.json(
      createResponse({
        success: true,
        message: 'Ride completed',
        data: ride.toJSON(),
        requestId,
      })
    );
  } catch (error) {
    const statusCode = error.message === 'Ride not found' ? 404 : 400;
    return res.status(statusCode).json(
      createResponse({
        success: false,
        message: error.message,
        statusCode,
      })
    );
  }
}

async function cancelRide(req, res) {
  try {
    const requestId = generateRequestId();
    const { rideId } = req.params;
    const { userId, driverId, reason } = req.body;

    if (!userId && !driverId) {
      return res.status(400).json(
        createResponse({
          success: false,
          message: 'Either userId or driverId is required',
          statusCode: 400,
          requestId,
        })
      );
    }

    const ride = await rideService.cancelRide(rideId, userId, driverId, reason);

    return res.json(
      createResponse({
        success: true,
        message: 'Ride cancelled',
        data: ride.toJSON(),
        requestId,
      })
    );
  } catch (error) {
    const statusCode = error.message === 'Ride not found' ? 404 : 400;
    return res.status(statusCode).json(
      createResponse({
        success: false,
        message: error.message,
        statusCode,
      })
    );
  }
}

async function getStatistics(req, res) {
  try {
    const requestId = generateRequestId();
    const stats = await rideService.getRideStatistics();

    return res.json(
      createResponse({
        success: true,
        message: 'Ride statistics fetched',
        data: stats,
        requestId,
      })
    );
  } catch (error) {
    return res.status(500).json(
      createResponse({
        success: false,
        message: error.message || 'Internal server error',
        statusCode: 500,
      })
    );
  }
}

module.exports = {
  createRide,
  getRide,
  getUserRides,
  assignDriver,
  updateLocation,
  startRide,
  completeRide,
  cancelRide,
  getStatistics,
};
