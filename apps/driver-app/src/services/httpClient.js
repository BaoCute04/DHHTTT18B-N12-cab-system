import { isStandaloneMode } from "@/config/runtime.js";
import { env } from "@/config/env.js";

const apiBaseUrl = env.apiBaseUrl;

function buildMockRide(rideId = "ride-456", status = "WAITING_FOR_ACCEPTANCE") {
  return {
    rideId,
    bookingId: rideId,
    driverId: "driver-123",
    userId: "customer-456",
    status,
    pickup: { lat: 10.7769, lng: 106.7009, address: "123 Main St" },
    destination: { lat: 10.7821, lng: 106.6953, address: "456 Oak Ave" },
    priceSnapshot: { amount: 50000 },
    etaMinutes: status === "IN_PROGRESS" ? 6 : 8,
    updatedAt: new Date().toISOString(),
    customer: {
      name: "Jane Doe",
      phone: "+84911111111",
    },
  };
}

function createMockResponse(path, options) {
  let data = {
    mock: true,
    method: options.method || "GET",
    path,
    status: "standalone",
  };

  if (path.includes("/api/v1/auth/login/otp/verify")) {
    const body = options.body ? JSON.parse(options.body) : {};
    if (body.code === "000000") {
      return new Response(
        JSON.stringify({
          data: null,
          message: "OTP code is invalid",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    data = {
      accessToken: "mock-standalone-token",
      id: "driver-123",
      user: {
        id: "driver-123",
        subject_id: "driver-123",
        role: "Driver",
        name: "Mock Driver",
      },
      account: {
        id: "driver-123",
        phone: "+84900000002",
        role: "driver",
        name: "Mock Driver",
      },
    };
  } else if (path.includes("/reviews") || path.includes("/average")) {
    if (path.includes("/average")) {
      data = {
        averageRating: 4.8,
        totalReviews: 125,
        distribution: { "5": 100, "4": 20, "3": 5, "2": 0, "1": 0 },
      };
    } else {
      data = [
        { id: "rev-1", rating: 5, comment: "Friendly driver, smooth trip.", createdAt: new Date().toISOString() },
        { id: "rev-2", rating: 4, comment: "Clean car and on time.", createdAt: new Date().toISOString() },
      ];
    }
  } else if (path.includes("/api/v1/rides/driver/") && path.endsWith("/history")) {
    data = [
      { ...buildMockRide("ride-h1", "COMPLETED"), completedAt: new Date().toISOString() },
      { ...buildMockRide("ride-h2", "COMPLETED"), completedAt: new Date(Date.now() - 86400000).toISOString() },
    ];
  } else if (path.match(/\/api\/v1\/drivers\/[^/]+$/)) {
    data = {
      id: "driver-123",
      phone: "+84900000002",
      role: "driver",
      name: "Mock Driver",
      status: "online",
      rating: 4.8,
      totalTrips: 150,
      todayEarnings: 320000,
      kycStatus: "approved",
      profile: {
        firstName: "Tai xe",
        lastName: "Cab Mock",
      },
      vehicle: {
        type: "car",
        plateNumber: "51A-123.45",
      },
    };
  } else if (path.includes("/api/v1/drivers/") && (path.includes("/go-online") || path.includes("/go-offline"))) {
    data = {
      status: path.includes("/go-online") ? "online" : "offline",
    };
  } else if (path.includes("/api/v1/rides/") && path.includes("/location")) {
    data = {
      ...buildMockRide("ride-456", "DRIVER_ARRIVING"),
      currentLocation: { lat: 10.7777, lng: 106.7015 },
      etaMinutes: 3,
    };
  } else if (path.includes("/api/v1/rides/") && path.endsWith("/accept")) {
    data = buildMockRide("ride-456", "ACCEPTED");
  } else if (path.includes("/api/v1/rides/") && path.endsWith("/start")) {
    data = buildMockRide("ride-456", "IN_PROGRESS");
  } else if (path.includes("/api/v1/rides/") && path.endsWith("/complete")) {
    data = {
      ...buildMockRide("ride-456", "COMPLETED"),
      paymentId: "pay-mock-001",
      paymentStatus: "COMPLETED",
      completedAt: new Date().toISOString(),
    };
  } else if (path.includes("/api/v1/rides/")) {
    const segments = path.split("/").filter(Boolean);
    const rideId = segments[segments.length - 1] || "ride-456";
    data = buildMockRide(rideId, "WAITING_FOR_ACCEPTANCE");
  } else if (path.includes("/api/v1/drivers/") && path.includes("/location")) {
    data = { success: true };
  }

  return new Response(
    JSON.stringify({
      data,
      status: "success",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
      status: 200,
    }
  );
}

export async function request(path, options = {}) {
  if (isStandaloneMode) {
    return createMockResponse(path, options);
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let token = localStorage.getItem("accessToken");
  if (!token) {
    try {
      const savedSession = JSON.parse(localStorage.getItem("sessionData") || "null");
      token = savedSession?.accessToken || null;
    } catch {
      token = null;
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${normalizedPath}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event("session-expired"));
    localStorage.removeItem("accessToken");
    localStorage.removeItem("sessionData");
  }

  return response;
}
