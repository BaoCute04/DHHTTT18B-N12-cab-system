/**
 * Location Service
 * Manages driver location updates and tracking
 */

const { calculateETA } = require('./eta.service');

/**
 * In-memory storage for driver locations
 * In production, would use Redis or database
 */
const driverLocations = new Map();

/**
 * Update driver's location
 * @param {string} driverId - Driver ID
 * @param {Object} location - Location {lat, lng, address}
 * @returns {Object} Updated location object
 */
function updateDriverLocation(driverId, location) {
  if (!location || location.lat === undefined || location.lng === undefined) {
    throw new Error('Invalid location: must include lat and lng');
  }

  // Validate coordinates
  if (location.lat < -90 || location.lat > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90');
  }
  if (location.lng < -180 || location.lng > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180');
  }

  const updatedLocation = {
    lat: location.lat,
    lng: location.lng,
    address: location.address || '',
    updatedAt: new Date().toISOString(),
  };

  driverLocations.set(driverId, updatedLocation);
  return updatedLocation;
}

/**
 * Get driver's current location
 * @param {string} driverId - Driver ID
 * @returns {Object|null} Driver's location or null if not found
 */
function getDriverLocation(driverId) {
  return driverLocations.get(driverId) || null;
}

/**
 * Check if driver has active location
 * @param {string} driverId - Driver ID
 * @returns {boolean} True if driver has location
 */
function hasActiveLocation(driverId) {
  return driverLocations.has(driverId);
}

/**
 * Clear driver location (when ride ends or driver goes offline)
 * @param {string} driverId - Driver ID
 * @returns {boolean} True if location was cleared
 */
function clearDriverLocation(driverId) {
  return driverLocations.delete(driverId);
}

/**
 * Get all active driver locations
 * @returns {Object} Map of driver locations
 */
function getAllActiveLocations() {
  return new Map(driverLocations);
}

/**
 * Update location and calculate ETA
 * @param {string} driverId - Driver ID
 * @param {Object} location - New location
 * @param {Object} destination - Destination for ETA calculation
 * @returns {Object} Updated location with calculated ETA
 */
function updateLocationWithETA(driverId, location, destination) {
  const updatedLocation = updateDriverLocation(driverId, location);

  if (destination) {
    const eta = calculateETA(
      { lat: location.lat, lng: location.lng },
      destination
    );
    updatedLocation.eta = eta;
  }

  return updatedLocation;
}

/**
 * Validate location data
 * @param {Object} location - Location object to validate
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateLocation(location) {
  if (!location) {
    return { valid: false, error: 'Location is required' };
  }

  if (location.lat === undefined || location.lng === undefined) {
    return { valid: false, error: 'Location must include lat and lng' };
  }

  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return { valid: false, error: 'Lat and lng must be numbers' };
  }

  if (location.lat < -90 || location.lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (location.lng < -180 || location.lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { valid: true };
}

/**
 * Get location update history (if stored)
 * Currently returns just current location
 * Can be extended to use database for historical data
 * @param {string} driverId - Driver ID
 * @returns {Array} Location history
 */
function getLocationHistory(driverId) {
  const currentLocation = getDriverLocation(driverId);
  return currentLocation ? [currentLocation] : [];
}

module.exports = {
  updateDriverLocation,
  getDriverLocation,
  hasActiveLocation,
  clearDriverLocation,
  getAllActiveLocations,
  updateLocationWithETA,
  validateLocation,
  getLocationHistory,
};
