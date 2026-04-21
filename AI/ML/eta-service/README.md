# ETA AI Service

> **AI / ML Layer — ETA Prediction Module**
> 
> Nằm trong `AI/ML/eta-service`, cùng cấp với thư mục `services/`.  
> Module này **không phải là HTTP service** — nó là thư viện được import bởi các service khác (ride-service, v.v.) và hoạt động như lớp AI hỗ trợ tính toán ETA.

---

## Kiến trúc

```
CAB_BOOKING/
├── services/          ← Core services (ride, booking, driver…)
└── AI/
    └── ML/
        └── eta-service/          ← Module này
            ├── src/
            │   ├── infra/
            │   │   └── redis.js              ← Singleton ioredis client
            │   ├── providers/
            │   │   └── routing.providers.js  ← OSRM / GraphHopper / Google Maps / Mapbox
            │   ├── eta.config.js             ← Cấu hình từ env
            │   └── eta.service.js            ← Core API (điểm duy nhất để import)
            ├── .env.example
            ├── Dockerfile
            └── package.json
```

---

## Vai trò trong hệ thống

| Thành phần | Mô tả |
|---|---|
| `eta.service.js` | Core module – tính ETA, quản lý cache và vị trí |
| `infra/redis.js` | Singleton Redis client – cache ETA, active rides, driver locations |
| `providers/routing.providers.js` | Strategy pattern: chọn routing provider theo env |
| `eta.config.js` | Tập trung tất cả cấu hình từ `.env` |

---

## Flow tính ETA (theo sequence diagram)

```
DriverApp → [GPS update]
    → ride-service (updateLocationAndInvalidateETA)
        → AI/eta-service.updateDriverLocation()  → Redis (driver:loc:<id>)
        → AI/eta-service.invalidateRideETA()     → Redis (xoá cache cũ)

CustomerApp → [Request ETA]
    → ride-service
        → AI/eta-service.calculatePickupETA()
            1. Đọc Redis cache (eta:<rideId>:toPickup)
            2. Cache MISS → gọi Routing Provider (OSRM / Google Maps …)
            3. Apply AI bias factor
            4. Ghi cache Redis (TTL = ETA_CACHE_TTL_SECONDS)
            5. Return ETAResult
```

---

## Routing Providers

| Provider | Loại | Cách bật |
|---|---|---|
| **OSRM** (mặc định) | Self-hosted / public demo | `ROUTING_PROVIDER=osrm` |
| **GraphHopper** | Self-hosted / cloud | `ROUTING_PROVIDER=graphhopper` |
| **Google Maps** | Cloud (trả phí) | `ROUTING_PROVIDER=googlemaps` + `GOOGLE_MAPS_API_KEY` |
| **Mapbox** | Cloud (trả phí) | `ROUTING_PROVIDER=mapbox` + `MAPBOX_ACCESS_TOKEN` |
| **Haversine** | Fallback tự động | Khi tất cả providers lỗi |

> Nếu provider được chọn lỗi (network timeout, API key sai), hệ thống tự động fallback về công thức Haversine để đảm bảo luôn có kết quả.

---

## Redis Schema

| Key pattern | TTL | Nội dung |
|---|---|---|
| `eta:<rideId>:toPickup` | `ETA_CACHE_TTL_SECONDS` (30s) | ETAResult JSON |
| `eta:<rideId>:toDestination` | `ETA_CACHE_TTL_SECONDS` (30s) | ETAResult JSON |
| `ride:active:<rideId>` | `DRIVER_LOCATION_TTL_SECONDS` (300s) | Ride snapshot JSON |
| `driver:loc:<driverId>` | `DRIVER_LOCATION_TTL_SECONDS` (300s) | `{ lat, lng, address, updatedAt }` |

---

## Public API

```js
const eta = require('./AI/ML/eta-service/src/eta.service');

// Tính ETA từ A đến B
const result = await eta.calculateETA(
  { lat: 10.7769, lng: 106.7009 },  // origin
  { lat: 10.8231, lng: 106.6297 },  // destination
  { rideId: 'ride-123', segment: 'toDestination' }
);
// result: { etaMinutes, distanceKm, durationSeconds, provider, biasFactor, … }

// Tính ETA tài xế → pickup
const pickupETA = await eta.calculatePickupETA(driverLocation, pickup, { rideId });

// Tính full ride estimate (driver→pickup + pickup→destination)
const estimates = await eta.calculateRideEstimates(driverLocation, pickup, destination, { rideId });
// estimates: { toPickup, toDestination, totalDistanceKm, totalEtaMinutes }

// ── Driver location (Redis) ─────────────────────────
await eta.updateDriverLocation(driverId, { lat, lng, address });
const loc = await eta.getDriverLocation(driverId);
await eta.removeDriverLocation(driverId);

// ── Active rides (Redis) ────────────────────────────
await eta.saveActiveRide(rideId, rideSnapshot);
const ride = await eta.getActiveRide(rideId);
await eta.removeActiveRide(rideId);

// ── Atomic update: location + invalidate ETA cache ──
await eta.updateLocationAndInvalidateETA(driverId, location, rideId);

// ── Shutdown ────────────────────────────────────────
await eta.shutdown(); // đóng Redis connection
```

---

## Cài đặt

```bash
cd AI/ML/eta-service
npm install

# Tạo file .env
cp .env.example .env
# Sửa ROUTING_PROVIDER, REDIS_URL, API keys…

# Chạy demo / test
node src/eta.service.js --test
```

---

## Biến môi trường quan trọng

| Biến | Mặc định | Mô tả |
|---|---|---|
| `ROUTING_PROVIDER` | `osrm` | Provider: osrm / graphhopper / googlemaps / mapbox |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `ETA_CACHE_TTL_SECONDS` | `30` | Thời gian cache ETA (giây) |
| `DRIVER_LOCATION_TTL_SECONDS` | `300` | TTL vị trí tài xế trong Redis |
| `FALLBACK_AVG_SPEED_KMH` | `30` | Tốc độ trung bình fallback (km/h) |
| `ETA_BIAS_FACTOR` | `1.0` | Hệ số điều chỉnh AI (1.15 = +15% buffer) |
| `OSRM_BASE_URL` | `http://router.project-osrm.org` | OSRM server URL |
| `GOOGLE_MAPS_API_KEY` | _(bắt buộc nếu dùng googlemaps)_ | Google Maps API key |
| `MAPBOX_ACCESS_TOKEN` | _(bắt buộc nếu dùng mapbox)_ | Mapbox token |

---

## Tích hợp với ride-service

Xem `services/ride-service/src/services/eta.service.js` — đã được cập nhật để delegate sang module AI này khi Redis khả dụng.
