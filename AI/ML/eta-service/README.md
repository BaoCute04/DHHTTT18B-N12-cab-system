# ETA AI Service

> **AI / ML Layer — ETA Prediction Service**
>
> Nằm trong `AI/ML/eta-service`, cùng cấp với thư mục `services/`.
> Service này chạy độc lập và expose REST API để các service khác gọi nội bộ qua HTTP.

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
            │   ├── app.js                    ← Express app
            │   ├── index.js                  ← Service entrypoint
            │   ├── eta.config.js             ← Cấu hình từ env
            │   └── eta.service.js            ← Core ETA logic nội bộ
            ├── .env.example
            ├── Dockerfile
            └── package.json
```

---

## Vai trò trong hệ thống

| Thành phần | Mô tả |
|---|---|
| `app.js` | REST surface của ETA service |
| `index.js` | Process entrypoint |
| `eta.service.js` | Core ETA logic – tính ETA, quản lý cache và vị trí |
| `infra/redis.js` | Singleton Redis client – cache ETA, active rides, driver locations |
| `providers/routing.providers.js` | Strategy pattern: chọn routing provider theo env |
| `eta.config.js` | Tập trung tất cả cấu hình từ `.env` |

---

## Flow tính ETA (theo sequence diagram)

```
DriverApp → [GPS update]
    → Gateway / upstream service
        → eta-service (driver location lane)
            → Redis (driver:loc:<id>)
            → invalidate ETA cache

CustomerApp → [Request ETA]
    → Gateway / upstream service
        → eta-service
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
POST /api/v1/eta/calculate
POST /api/v1/eta/pickup
POST /api/v1/eta/ride-estimates
GET  /health
```

---

## Cài đặt

```bash
cd AI/ML/eta-service
npm install
cp .env.example .env
npm run start
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

`ride-service` gọi ETA qua REST nội bộ bằng `ETA_SERVICE_URL`, không import trực tiếp module ETA nữa.
