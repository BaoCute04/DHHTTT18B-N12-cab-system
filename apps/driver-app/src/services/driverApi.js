import { request } from "./httpClient.js";

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Something went wrong");
  }
  return response.json();
}

export const driverApi = {
  getDriver: async (driverId) => {
    const res = await request(`/api/v1/drivers/${driverId}`, {
      method: "GET"
    });
    return handleResponse(res);
  },

  goOnline: async (driverId) => {
    const res = await request(`/api/v1/drivers/${driverId}/go-online`, {
      method: "POST"
    });
    return handleResponse(res);
  },

  goOffline: async (driverId) => {
    const res = await request(`/api/v1/drivers/${driverId}/go-offline`, {
      method: "POST"
    });
    return handleResponse(res);
  },

  updateLocation: async (driverId, lat, lng) => {
    const res = await request(`/api/v1/drivers/${driverId}/location`, {
      method: "PATCH",
      body: JSON.stringify({
        lat,
        lng
      })
    });
    return handleResponse(res);
  }
};
