# ETA Service Postman Collection Guide

## 📋 Mô tả (Description)

Bộ sưu tập Postman để test **ETA Service** - dịch vụ nội bộ tính toán thời gian dự kiến đến (Estimated Time of Arrival).

**ETA Service phục vụ:**
- 🔐 Xác thực qua JWT/JWKS (auth-service)
- 🗂️ Cache estimates và active rides (Redis)
- 📍 Tính toán routing qua 4 providers (Google Maps, OSRM, GraphHopper, Mapbox)

### Cách dùng nhanh:

1. Import cả 2 file vào Postman.
2. Chọn environment `eta-service-local`.
3. Chạy folder **00 Health** (kiểm tra services chạy)
4. Chạy folder **01 Auth Token Bootstrap** (lấy access token)
5. Chạy folder **02 ETA Internal APIs** (test các endpoint)

---

## 🔗 Liên Kết với Các Services Khác

### 🚕 **Ride Service** (LIÊN QUAN CHÍNH)

**Mục đích:** Khi user tạo/cập nhật ride, cần tính ETA để:
- Hiển thị "Arriving in X minutes" cho user
- Biết tài xế mất bao lâu đến pickup location
- Cache ETA cho ride đó

**Flow:**

```
User tạo Ride
    ↓
Ride Service nhận request
    ↓
Ride Service gọi ETA Service:
    POST /internal/eta/estimate
    {
      "origin": { "latitude": 21.0285, "longitude": 105.8542 },
      "destination": { "latitude": 10.7769, "longitude": 106.7009 },
      "vehicleType": "car",
      "optionalRideId": "550e8400-e29b-41d4-a716-446655440000"
    }
    ↓
ETA Service trả về:
    {
      "etaSeconds": 1200,
      "etaMinutes": 20,
      "distanceMeters": 45000,
      "provider": "osrm",
      "routeLabel": "Primary Route"
    }
    ↓
Ride Service lưu ETA vào DB
    ↓
User nhận thông báo: "Driver arriving in ~20 minutes"
```

**Code Example (Ride Service):**

```javascript
// services/ride-service/src/services/ride.service.js

import axios from 'axios';

export class RideService {
  constructor(config, etaClient) {
    this.etaServiceUrl = config.etaServiceUrl || 'http://localhost:3110';
    this.etaClient = etaClient;
  }

  async createRide(rideData, accessToken) {
    // 1. Tính ETA trước khi tạo ride
    const eta = await this.getEtaEstimate(
      rideData.origin,
      rideData.destination,
      rideData.vehicleType,
      accessToken
    );

    // 2. Tạo ride object
    const ride = {
      id: generateUUID(),
      customerId: rideData.customerId,
      origin: rideData.origin,
      destination: rideData.destination,
      etaSeconds: eta.etaSeconds,
      etaMinutes: eta.etaMinutes,
      distanceMeters: eta.distanceMeters,
      provider: eta.provider,
      status: 'pending'
    };

    // 3. Lưu vào DB
    const savedRide = await this.db.rides.create(ride);

    // 4. Lưu ride vào ETA Service cache (24 giờ)
    await this.cacheRideInEta(savedRide, accessToken);

    return savedRide;
  }

  async getEtaEstimate(origin, destination, vehicleType = 'car', accessToken) {
    try {
      const response = await axios.post(
        `${this.etaServiceUrl}/internal/eta/estimate`,
        {
          origin,
          destination,
          vehicleType,
          optionalRideId: null // Không cache ngay, chỉ tính
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(`ETA calculation failed: ${response.data.message}`);
    } catch (error) {
      console.error('ETA Service error:', error.message);
      // Fallback: dùng local Haversine nếu ETA Service không available
      return this.calculateHaversineEta(origin, destination, vehicleType);
    }
  }

  async cacheRideInEta(ride, accessToken) {
    try {
      await axios.post(
        `${this.etaServiceUrl}/internal/eta/active-rides`,
        {
          rideId: ride.id,
          driverId: ride.driverId || null,
          origin: ride.origin,
          destination: ride.destination,
          vehicleType: ride.vehicleType,
          status: ride.status
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (error) {
      console.warn('Failed to cache ride in ETA:', error.message);
      // Non-blocking error
    }
  }

  calculateHaversineEta(origin, destination, vehicleType = 'car') {
    // Fallback implementation
    const distance = this.haversineDistance(origin, destination);
    const speeds = { bike: 18, car: 24, car_plus: 28 }; // km/h
    const speed = speeds[vehicleType] || 24;
    const durationSeconds = Math.round((distance / speed) * 3600);

    return {
      etaSeconds: durationSeconds,
      etaMinutes: Math.round(durationSeconds / 60),
      distanceMeters: distance * 1000,
      provider: 'haversine',
      routeLabel: 'Fallback estimation'
    };
  }
}
```

---

### 🚘 **Driver Service** (CÓ THỂ CÓ)

**Mục đích:** Khi driver accept ride hoặc update location, có thể:
- Lấy driver's current location
- Tính ETA từ driver → pickup location
- Hiển thị cho driver: "You'll arrive in X minutes"

**Flow:**

```
Driver nhận thông báo ride
    ↓
Driver accepts ride
    ↓
Driver Service lấy current location từ GPS
    ↓
Driver Service gọi ETA Service:
    POST /internal/eta/estimate
    {
      "origin": driver_location,     // GPS hiện tại
      "destination": pickup_location,
      "vehicleType": driver_vehicle_type
    }
    ↓
ETA Service trả về ETA để driver đến pickup
    ↓
Driver App hiển thị: "Arriving at pickup in 5 minutes"
```

**Code Example (Driver Service):**

```javascript
// services/driver-service/src/services/driver.service.js

export class DriverService {
  constructor(config, etaClient) {
    this.etaServiceUrl = config.etaServiceUrl || 'http://localhost:3110';
    this.etaClient = etaClient;
  }

  async acceptRide(rideId, driverId, accessToken) {
    // 1. Lấy ride details
    const ride = await this.db.rides.findById(rideId);

    // 2. Lấy driver current location (từ GPS)
    const driverLocation = await this.getDriverLocation(driverId);

    // 3. Tính ETA từ driver → pickup
    const etaToPickup = await this.getEtaEstimate(
      driverLocation,
      ride.origin,        // Pickup location
      ride.vehicleType,
      accessToken
    );

    // 4. Update ride status
    const updatedRide = await this.db.rides.updateOne(
      { id: rideId },
      {
        driverId: driverId,
        status: 'accepted',
        etaToPickupSeconds: etaToPickup.etaSeconds,
        etaToPickupMinutes: etaToPickup.etaMinutes
      }
    );

    // 5. Emit event: DriverAcceptedRide (Kafka)
    await this.kafka.emit('DriverAcceptedRide', {
      rideId,
      driverId,
      etaToPickupMinutes: etaToPickup.etaMinutes
    });

    return updatedRide;
  }

  async updateDriverLocation(driverId, newLocation, accessToken) {
    // 1. Lấy active rides của driver
    const activeRides = await this.db.rides.find({
      driverId,
      status: { $in: ['accepted', 'arrived_at_pickup'] }
    });

    // 2. Untuk masing-masing ride, update ETA
    for (const ride of activeRides) {
      // Hanya update nếu belum di pickup location
      if (ride.status === 'accepted') {
        const eta = await this.getEtaEstimate(
          newLocation,
          ride.origin,  // Pickup
          ride.vehicleType,
          accessToken
        );

        await this.db.rides.updateOne(
          { id: ride.id },
          { etaToPickupSeconds: eta.etaSeconds }
        );
      }

      // Jika sudah di pickup, hitung ETA ke destination
      if (ride.status === 'arrived_at_pickup') {
        const eta = await this.getEtaEstimate(
          newLocation,
          ride.destination,
          ride.vehicleType,
          accessToken
        );

        await this.db.rides.updateOne(
          { id: ride.id },
          { etaToDestinationSeconds: eta.etaSeconds }
        );
      }
    }

    // 3. Update driver location ke DB
    await this.db.drivers.updateOne(
      { id: driverId },
      { currentLocation: newLocation, updatedAt: new Date() }
    );
  }

  async getEtaEstimate(origin, destination, vehicleType, accessToken) {
    try {
      const response = await axios.post(
        `${this.etaServiceUrl}/internal/eta/estimate`,
        { origin, destination, vehicleType },
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 3000
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('ETA error:', error.message);
      return this.fallbackCalculation(origin, destination, vehicleType);
    }
  }
}
```

---

### 📋 **Booking Service** (CÓ THỂ CÓ)

**Mục đích:** Khi user xem booking details, hiển thị:
- Estimated time to arrive at destination
- Estimated arrival time (ETA)

```javascript
async getBookingDetails(bookingId, accessToken) {
  const booking = await this.db.bookings.findById(bookingId);
  const ride = await this.db.rides.findById(booking.rideId);

  // Nếu ride đã cached trong ETA Service, lấy cached value
  if (ride.etaSeconds) {
    booking.estimatedArrivalAt = new Date(
      Date.now() + ride.etaSeconds * 1000
    );
  }

  return booking;
}
```

---

### 💰 **Pricing Service** (CÓ THỂ CÓ)

**Mục đích:** Tính giá dựa trên distance và duration từ ETA

```javascript
async calculateFare(origin, destination, vehicleType, accessToken) {
  // 1. Lấy ETA data (distance + duration)
  const eta = await this.etaClient.estimate(
    origin,
    destination,
    vehicleType,
    accessToken
  );

  // 2. Tính giá
  const basePrice = 15000; // VND
  const perKmPrice = 5000;
  const perMinutePrice = 1000;

  const distanceKm = eta.distanceMeters / 1000;
  const durationMinutes = eta.durationSeconds / 60;

  const fare =
    basePrice +
    distanceKm * perKmPrice +
    durationMinutes * perMinutePrice;

  return {
    baseFare: basePrice,
    distanceFare: distanceKm * perKmPrice,
    timeFare: durationMinutes * perMinutePrice,
    totalFare: Math.round(fare),
    currency: 'VND'
  };
}
```

---

## 🔐 **Authentication Flow cho Services**

Khi một service (Ride, Driver, Booking, etc.) gọi ETA Service:

1. Service đó phải có valid **access token** từ Auth Service
2. Token được lấy via OTP flow (hoặc service-to-service auth)
3. Token được gửi trong header: `Authorization: Bearer <token>`
4. ETA Service xác thực token via JWKS từ Auth Service

**Config cho các services:**

```javascript
// Mỗi service cần cấu hình:

export const etaServiceConfig = {
  etaServiceUrl: process.env.ETA_SERVICE_URL || 'http://localhost:3110',
  
  // Cách lấy access token cho service-to-service call:
  getServiceAccessToken: async () => {
    // Option 1: Dùng chung token từ customer
    return customerAccessToken;
    
    // Option 2: Lấy service token riêng (future)
    // return await authService.getServiceToken();
  }
};
```

---
