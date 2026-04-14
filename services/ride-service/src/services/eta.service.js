/**
 * ETA Service
 * Calculates estimated time of arrival using Haversine formula
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of starting point
 * @param {number} lon1 - Longitude of starting point
 * @param {number} lat2 - Latitude of ending point
 * @param {number} lon2 - Longitude of ending point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Calculate ETA in minutes
 * @param {Object} currentLocation - Current location {lat, lng}
 * @param {Object} destination - Destination {lat, lng}
 * @param {number} avgSpeed - Average speed in km/h (default: 30)
 * @returns {number|null} ETA in minutes
 */
function calculateETA(currentLocation, destination, avgSpeed = 30) {
  if (!currentLocation || !destination) {
    return null;
  }

  try {
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      destination.lat,
      destination.lng
    );

    if (distance <= 0) {
      return 0;
    }

    // Calculate ETA: (distance / speed) * 60 to convert to minutes
    const etaMinutes = Math.ceil((distance / avgSpeed) * 60);

    // Ensure minimum 5 minutes
    return Math.max(5, etaMinutes);
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return null;
  }
}

/**
 * Calculate ETA from pickup to destination
 * @param {Object} currentLocation - Driver's current location
 * @param {Object} pickup - Pickup location
 * @param {number} avgSpeed - Average speed in km/h
 * @returns {Object} Object with etaToPickup and distances
 */
function calculatePickupETA(currentLocation, pickup, avgSpeed = 30) {
  if (!currentLocation || !pickup) {
    return {
      etaToPickup: null,
      distanceToPickup: null,
    };
  }

  try {
    const distanceToPickup = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      pickup.lat,
      pickup.lng
    );

    const etaToPickup = Math.max(
      5,
      Math.ceil((distanceToPickup / avgSpeed) * 60)
    );

    return {
      etaToPickup,
      distanceToPickup: parseFloat(distanceToPickup.toFixed(2)),
    };
  } catch (error) {
    console.error('Error calculating pickup ETA:', error);
    return {
      etaToPickup: null,
      distanceToPickup: null,
    };
  }
}

/**
 * Calculate distance and ETA for entire ride
 * @param {Object} currentLocation - Driver's current location
 * @param {Object} pickup - Pickup location
 * @param {Object} destination - Destination location
 * @param {number} avgSpeed - Average speed in km/h
 * @returns {Object} Distance and ETA information
 */
function calculateRideEstimates(
  currentLocation,
  pickup,
  destination,
  avgSpeed = 30
) {
  if (!currentLocation || !pickup || !destination) {
    return {
      etaToPickup: null,
      etaToDestination: null,
      totalDistance: null,
      distanceToPickup: null,
    };
  }

  try {
    const distanceToPickup = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      pickup.lat,
      pickup.lng
    );

    const distanceToDestination = calculateDistance(
      pickup.lat,
      pickup.lng,
      destination.lat,
      destination.lng
    );

    const etaToPickup = Math.max(5, Math.ceil((distanceToPickup / avgSpeed) * 60));
    const etaToDestination = Math.max(
      5,
      Math.ceil((distanceToDestination / avgSpeed) * 60)
    );

    return {
      etaToPickup,
      etaToDestination,
      totalDistance: parseFloat(
        (distanceToPickup + distanceToDestination).toFixed(2)
      ),
      distanceToPickup: parseFloat(distanceToPickup.toFixed(2)),
      distanceToDestination: parseFloat(distanceToDestination.toFixed(2)),
    };
  } catch (error) {
    console.error('Error calculating ride estimates:', error);
    return {
      etaToPickup: null,
      etaToDestination: null,
      totalDistance: null,
      distanceToPickup: null,
      distanceToDestination: null,
    };
  }
}

module.exports = {
  calculateDistance,
  calculateETA,
  calculatePickupETA,
  calculateRideEstimates,
};
