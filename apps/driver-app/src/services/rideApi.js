import { request } from "./httpClient.js";

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Something went wrong");
  }
  return response.json();
}

export const rideApi = {
  getRide: async (rideId) => {
    const res = await request(`/ride/${rideId}`, {
      method: "GET"
    });
    return handleResponse(res);
  },

  acceptRide: async (rideId, driverId) => {
    // Note: The /assign-driver API on backend actually requires Admin.
    // We are deliberately keeping this as a real endpoint hit to expose the 403 error on the UI
    // as per project requirements, highlighting the API/authorization mismatch blocker.
    const res = await request(`/ride/${rideId}/assign-driver`, {
      method: "POST",
      body: JSON.stringify({ driverId })
    });
    return handleResponse(res);
  },

  startRide: async (rideId, driverId) => {
    const res = await request(`/ride/${rideId}/start`, {
      method: "POST",
      body: JSON.stringify({ driverId })
    });
    return handleResponse(res);
  },

  completeRide: async (rideId, driverId) => {
    const res = await request(`/ride/${rideId}/complete`, {
      method: "POST",
      body: JSON.stringify({ driverId })
    });
    return handleResponse(res);
  },

  updateLocation: async (rideId, driverId, lat, lng) => {
    const res = await request(`/ride/${rideId}/location`, {
      method: "POST",
      body: JSON.stringify({ 
        driverId,
        currentLocation: { lat, lng }
      })
    });
    return handleResponse(res);
  },

  getHistory: async (driverId) => {
    const res = await request(`/ride/user/${driverId}`, {
      method: "GET"
    });
    return handleResponse(res);
  },

  cancelRide: async (rideId, reason) => {
    const res = await request(`/ride/${rideId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  }
};
