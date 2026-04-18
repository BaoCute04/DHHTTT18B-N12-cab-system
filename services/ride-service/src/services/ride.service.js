/**
 * Ride Service
 * Business logic for ride operations with optional MongoDB persistence
 */

const { v4: uuidv4 } = require('uuid');
const { Ride, RIDE_STATUS } = require('../models/ride.model');
const { RideMongoModel } = require('../models/ride.mongo.model');
const { calculateETA } = require('./eta.service');
const { updateDriverLocation } = require('./location.service');
const { isMongoConnected } = require('../database/mongoose');
const messageBroker = require('../utils/messageBroker');


const rides = new Map();

function usesMongo() {
  return isMongoConnected();
}

function toRideObject(ride) {
  if (!ride) {
    return null;
  }

  if (typeof ride.toJSON === 'function') {
    return ride;
  }

  return new Ride(ride);
}

function fromMongoDoc(doc) {
  return doc ? doc : null;
}

function setRideFields(ride, updates) {
  Object.assign(ride, updates);
  ride.updatedAt = new Date().toISOString();
  return ride;
}

async function saveRide(ride) {
  if (usesMongo()) {
    if (typeof ride.save === 'function') {
      await ride.save();
      return ride;
    }

    const payload = ride.toJSON ? ride.toJSON() : ride;
    return RideMongoModel.create(payload);
  }

  rides.set(ride.rideId, ride);
  return ride;
}

async function getRideById(rideId) {
  if (usesMongo()) {
    return RideMongoModel.findOne({ rideId });
  }

  return rides.get(rideId) || null;
}

async function getRidesByUserId(userId) {
  if (usesMongo()) {
    return RideMongoModel.find({ userId }).sort({ updatedAt: -1 });
  }

  return Array.from(rides.values()).filter((ride) => ride.userId === userId);
}

async function getRidesByDriverId(driverId) {
  if (usesMongo()) {
    return RideMongoModel.find({
      driverId,
      status: {
        $in: [
          RIDE_STATUS.DRIVER_ASSIGNED,
          RIDE_STATUS.DRIVER_ARRIVING,
          RIDE_STATUS.IN_PROGRESS,
        ],
      },
    }).sort({ updatedAt: -1 });
  }

  return Array.from(rides.values()).filter(
    (ride) =>
      ride.driverId === driverId &&
      [
        RIDE_STATUS.DRIVER_ASSIGNED,
        RIDE_STATUS.DRIVER_ARRIVING,
        RIDE_STATUS.IN_PROGRESS,
      ].includes(ride.status)
  );
}

async function createRide(rideData) {
  if (!rideData.bookingId || !rideData.userId) {
    throw new Error('bookingId and userId are required');
  }
  if (!rideData.pickup || !rideData.destination) {
    throw new Error('pickup and destination are required');
  }

  const ride = usesMongo()
    ? new RideMongoModel({
        rideId: uuidv4(),
        bookingId: rideData.bookingId,
        userId: rideData.userId,
        driverId: rideData.driverId || null,
        pickup: rideData.pickup,
        destination: rideData.destination,
        status: rideData.driverId ? RIDE_STATUS.DRIVER_ASSIGNED : RIDE_STATUS.SEARCHING,
      })
    : new Ride({
        rideId: uuidv4(),
        bookingId: rideData.bookingId,
        userId: rideData.userId,
        driverId: rideData.driverId || null,
        pickup: rideData.pickup,
        destination: rideData.destination,
        status: rideData.driverId ? RIDE_STATUS.DRIVER_ASSIGNED : RIDE_STATUS.SEARCHING,
      });

  const savedRide = await saveRide(ride);
  
  await messageBroker.publish('ride.status.changed', {
    event_type: 'RIDE_CREATED',
    rideId: ride.rideId,
    bookingId: ride.bookingId,
    userId: ride.userId,
    driverId: ride.driverId,
    status: ride.status,
    pickup: ride.pickup,
    destination: ride.destination,
    timestamp: new Date().toISOString()
  });

  return savedRide;
}

async function assignDriver(rideId, driverId) {
  const ride = await getRideById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (!driverId) {
    throw new Error('driverId is required');
  }

  if (ride.status !== RIDE_STATUS.SEARCHING) {
    throw new Error(`Cannot assign driver to ride in ${ride.status} status`);
  }

  if (usesMongo()) {
    ride.driverId = driverId;
    ride.status = RIDE_STATUS.DRIVER_ASSIGNED;
    ride.updatedAt = new Date();
    await ride.save();
    return ride;
  }

  ride.driverId = driverId;
  ride.updateStatus(RIDE_STATUS.DRIVER_ASSIGNED);
  await saveRide(ride);
  return ride;
}

async function updateRideLocation(rideId, driverId, location) {
  const ride = await getRideById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (!driverId || ride.driverId !== driverId) {
    throw new Error('Driver ID mismatch');
  }

  if (!location || location.lat === undefined || location.lng === undefined) {
    throw new Error('Invalid location: must include lat and lng');
  }

  if (usesMongo()) {
    ride.currentLocation = location;
    ride.updatedAt = new Date();

    if (ride.status === RIDE_STATUS.DRIVER_ASSIGNED) {
      ride.status = RIDE_STATUS.DRIVER_ARRIVING;
    }

    if (
      ride.status === RIDE_STATUS.DRIVER_ASSIGNED ||
      ride.status === RIDE_STATUS.DRIVER_ARRIVING
    ) {
      ride.etaMinutes = calculateETA(location, ride.pickup);
    } else if (ride.status === RIDE_STATUS.IN_PROGRESS) {
      ride.etaMinutes = calculateETA(location, ride.destination);
    }

    await ride.save();
    await updateDriverLocation(driverId, location);
    return ride;
  }

  ride.currentLocation = location;
  ride.updatedAt = new Date().toISOString();

  if (ride.status === RIDE_STATUS.DRIVER_ASSIGNED) {
    ride.status = RIDE_STATUS.DRIVER_ARRIVING;
  }

  if (
    ride.status === RIDE_STATUS.DRIVER_ASSIGNED ||
    ride.status === RIDE_STATUS.DRIVER_ARRIVING
  ) {
    ride.etaMinutes = calculateETA(location, ride.pickup);
  } else if (ride.status === RIDE_STATUS.IN_PROGRESS) {
    ride.etaMinutes = calculateETA(location, ride.destination);
  }

  updateDriverLocation(driverId, location);
  await saveRide(ride);
  return ride;
}

async function startRide(rideId, driverId) {
  const ride = await getRideById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (!driverId || ride.driverId !== driverId) {
    throw new Error('Unauthorized: Driver ID does not match');
  }

  if (
    ![RIDE_STATUS.DRIVER_ASSIGNED, RIDE_STATUS.DRIVER_ARRIVING].includes(
      ride.status
    )
  ) {
    throw new Error(
      `Cannot start ride in ${ride.status} status. Must be in DRIVER_ASSIGNED or DRIVER_ARRIVING`
    );
  }

  if (usesMongo()) {
    ride.status = RIDE_STATUS.IN_PROGRESS;
    ride.startedAt = new Date();
    ride.updatedAt = new Date();
    if (ride.currentLocation) {
      ride.etaMinutes = calculateETA(ride.currentLocation, ride.destination);
    }
    await ride.save();
  } else {
    ride.status = RIDE_STATUS.IN_PROGRESS;
    ride.startedAt = new Date().toISOString();
    ride.updatedAt = new Date().toISOString();
    if (ride.currentLocation) {
      ride.etaMinutes = calculateETA(ride.currentLocation, ride.destination);
    }
    await saveRide(ride);
  }

  await messageBroker.publish('ride.status.changed', {
    event_type: 'RIDE_STARTED',
    rideId: ride.rideId,
    userId: ride.userId,
    status: ride.status,
    startedAt: ride.startedAt,
    timestamp: new Date().toISOString()
  });

  return ride;
}

async function completeRide(rideId, driverId) {
  const ride = await getRideById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (!driverId || ride.driverId !== driverId) {
    throw new Error('Unauthorized: Driver ID does not match');
  }

  if (ride.status !== RIDE_STATUS.IN_PROGRESS) {
    throw new Error(
      `Cannot complete ride in ${ride.status} status. Must be IN_PROGRESS`
    );
  }

  if (usesMongo()) {
    ride.status = RIDE_STATUS.COMPLETED;
    ride.completedAt = new Date();
    ride.updatedAt = new Date();
    ride.currentLocation = ride.destination;
    ride.etaMinutes = 0;
    await ride.save();
  } else {
    ride.status = RIDE_STATUS.COMPLETED;
    ride.completedAt = new Date().toISOString();
    ride.updatedAt = new Date().toISOString();
    ride.currentLocation = ride.destination;
    ride.etaMinutes = 0;
    await saveRide(ride);
  }

  await messageBroker.publish('ride.status.changed', {
    event_type: 'RIDE_COMPLETED',
    rideId: ride.rideId,
    userId: ride.userId,
    status: ride.status,
    completedAt: ride.completedAt,
    timestamp: new Date().toISOString()
  });

  return ride;
}

async function cancelRide(rideId, userId = null, driverId = null, reason = '') {
  const ride = await getRideById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  const isUserAuthorized = userId && ride.userId === userId;
  const isDriverAuthorized = driverId && ride.driverId === driverId;

  if (!isUserAuthorized && !isDriverAuthorized) {
    throw new Error('Unauthorized: Cannot cancel this ride');
  }

  if ([RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED].includes(ride.status)) {
    throw new Error(`Cannot cancel ride in ${ride.status} status`);
  }

  if (usesMongo()) {
    ride.status = RIDE_STATUS.CANCELLED;
    ride.updatedAt = new Date();
    await ride.save();
  } else {
    ride.status = RIDE_STATUS.CANCELLED;
    ride.updatedAt = new Date().toISOString();
    await saveRide(ride);
  }

  await messageBroker.publish('ride.status.changed', {
    event_type: 'RIDE_CANCELLED',
    rideId: ride.rideId,
    userId: ride.userId,
    status: ride.status,
    reason: reason,
    timestamp: new Date().toISOString()
  });

  return ride;
}

async function getRideStatistics() {
  if (usesMongo()) {
    const [searching, driverAssigned, driverArriving, inProgress, completed, cancelled] =
      await Promise.all([
        RideMongoModel.countDocuments({ status: RIDE_STATUS.SEARCHING }),
        RideMongoModel.countDocuments({ status: RIDE_STATUS.DRIVER_ASSIGNED }),
        RideMongoModel.countDocuments({ status: RIDE_STATUS.DRIVER_ARRIVING }),
        RideMongoModel.countDocuments({ status: RIDE_STATUS.IN_PROGRESS }),
        RideMongoModel.countDocuments({ status: RIDE_STATUS.COMPLETED }),
        RideMongoModel.countDocuments({ status: RIDE_STATUS.CANCELLED }),
      ]);

    return {
      totalRides: searching + driverAssigned + driverArriving + inProgress + completed + cancelled,
      byStatus: {
        searching,
        driverAssigned,
        driverArriving,
        inProgress,
        completed,
        cancelled,
      },
    };
  }

  const allRides = Array.from(rides.values());

  return {
    totalRides: allRides.length,
    byStatus: {
      searching: allRides.filter((r) => r.status === RIDE_STATUS.SEARCHING).length,
      driverAssigned: allRides.filter((r) => r.status === RIDE_STATUS.DRIVER_ASSIGNED).length,
      driverArriving: allRides.filter((r) => r.status === RIDE_STATUS.DRIVER_ARRIVING).length,
      inProgress: allRides.filter((r) => r.status === RIDE_STATUS.IN_PROGRESS).length,
      completed: allRides.filter((r) => r.status === RIDE_STATUS.COMPLETED).length,
      cancelled: allRides.filter((r) => r.status === RIDE_STATUS.CANCELLED).length,
    },
  };
}

async function clearAllRides() {
  if (usesMongo()) {
    await RideMongoModel.deleteMany({});
    return;
  }

  rides.clear();
}

module.exports = {
  createRide,
  getRideById,
  getRidesByUserId,
  getRidesByDriverId,
  assignDriver,
  updateRideLocation,
  startRide,
  completeRide,
  cancelRide,
  getRideStatistics,
  clearAllRides,
};
