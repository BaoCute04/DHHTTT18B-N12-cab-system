/**
 * Ride Model
 * Defines the structure of a Ride document
 */

const { v4: uuidv4 } = require('uuid');

// Ride Status Enum
const RIDE_STATUS = {
  SEARCHING: 'SEARCHING',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

/**
 * Create a new Ride object
 * @param {Object} data - Ride data
 * @returns {Object} Ride object
 */
class Ride {
  constructor(data) {
    this.rideId = data.rideId || uuidv4();
    this.bookingId = data.bookingId;
    this.userId = data.userId;
    this.driverId = data.driverId || null;
    this.status = data.status || RIDE_STATUS.SEARCHING;
    this.pickup = data.pickup;
    this.destination = data.destination;
    this.currentLocation = data.currentLocation || null;
    this.etaMinutes = data.etaMinutes || null;
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Convert to JSON response format
   */
  toJSON() {
    return {
      rideId: this.rideId,
      bookingId: this.bookingId,
      userId: this.userId,
      driverId: this.driverId,
      status: this.status,
      pickup: this.pickup,
      destination: this.destination,
      currentLocation: this.currentLocation,
      etaMinutes: this.etaMinutes,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if ride can transition to new status
   */
  canTransitionTo(newStatus) {
    const validTransitions = {
      [RIDE_STATUS.SEARCHING]: [RIDE_STATUS.DRIVER_ASSIGNED, RIDE_STATUS.CANCELLED],
      [RIDE_STATUS.DRIVER_ASSIGNED]: [
        RIDE_STATUS.DRIVER_ARRIVING,
        RIDE_STATUS.CANCELLED,
      ],
      [RIDE_STATUS.DRIVER_ARRIVING]: [
        RIDE_STATUS.IN_PROGRESS,
        RIDE_STATUS.CANCELLED,
      ],
      [RIDE_STATUS.IN_PROGRESS]: [RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED],
      [RIDE_STATUS.COMPLETED]: [],
      [RIDE_STATUS.CANCELLED]: [],
    };

    return (validTransitions[this.status] || []).includes(newStatus);
  }

  /**
   * Update status with validation
   */
  updateStatus(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status} to ${newStatus}`
      );
    }
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
  }
}

module.exports = {
  Ride,
  RIDE_STATUS,
};
