# ETA Service - Real-time Traffic Integration

## 🎯 Tổng Quan

ETA Service nâng cấp giới thiệu **tích hợp giao thông thực tế** với hỗ trợ cho:
- ✅ **Real-time Traffic Providers**: OSRM, Google Maps, HERE API
- ✅ **Redis Caching**: Cache kết quả để giảm latency
- ✅ **Kafka Event Stream**: Publish traffic updates in real-time
- ✅ **Traffic Delay Factors**: Tính toán delay dựa trên giờ trong ngày
- ✅ **AI Bias Correction**: Điều chỉnh ETA dựa trên dữ liệu lịch sử

---

## 🔧 Cấu Hình

### 1. Traffic Provider
```env
# Chọn một provider: osrm, google, here
TRAFFIC_PROVIDER=osrm

# OSRM (miễn phí, open-source)
OSRM_URL=http://router.project-osrm.org/route/v1/driving

# Google Maps (có phí)
GOOGLE_MAPS_API_KEY=your_key_here

# HERE API (có phí)
HERE_API_KEY=your_key_here
```

### 2. Redis Cache
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Kafka Events
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ride-service
KAFKA_TOPIC_TRAFFIC_UPDATES=traffic-updates
```

---

## 📊 API Sử Dụng

### Calculate ETA (với real-time traffic)
```javascript
const etaService = require('./services/eta.service');

// Basic ETA calculation
const result = await etaService.calculateETA(
  { lat: 10.7769, lng: 106.6966 }, // currentLocation
  { lat: 10.8141, lng: 106.6955 }, // destination
  30, // avgSpeed (fallback)
  'ride-123' // rideId (optional)
);

// Response:
{
  eta: 15,                          // minutes
  distance: 8.5,                    // km
  duration: 14,                     // minutes before delay factor
  trafficProvider: 'osrm',          // or google-maps, here, fallback-haversine
  trafficDelayFactor: 1.2,          // 1.0 = normal, 1.5 = peak hour
  timestamp: 1713607200000
}
```

### Calculate Pickup ETA
```javascript
const pickupETA = await etaService.calculatePickupETA(
  { lat: 10.7769, lng: 106.6966 }, // driver's current location
  { lat: 10.7900, lng: 106.7100 }, // pickup location
  30,
  'ride-123'
);

// Response:
{
  etaToPickup: 8,
  distanceToPickup: 4.2,
  trafficProvider: 'osrm',
  trafficDelayFactor: 1.0,
  timestamp: 1713607200000
}
```

### Calculate Full Ride Estimates
```javascript
const rideEstimates = await etaService.calculateRideEstimates(
  { lat: 10.7769, lng: 106.6966 }, // driver's location
  { lat: 10.7900, lng: 106.7100 }, // pickup
  { lat: 10.8141, lng: 106.6955 }, // destination
  30,
  'ride-123'
);

// Response:
{
  etaToPickup: 8,
  etaToDestination: 12,
  totalEta: 20,
  totalDistance: 12.7,
  distanceToPickup: 4.2,
  distanceToDestination: 8.5,
  trafficDelayFactor: 1.15,
  providers: {
    pickup: 'osrm',
    destination: 'google-maps'
  },
  timestamp: 1713607200000
}
```

---

## 🚦 Traffic Delay Factors

Hệ thống **tự động tính toán** traffic delay dựa trên:

| Thời gian | Delay Factor | Mô tả |
|-----------|--------------|-------|
| 7-9 AM (Thứ 2-6) | 1.5x | Peak hour sáng (+50%) |
| 5-7 PM (Thứ 2-6) | 1.5x | Peak hour chiều (+50%) |
| 10 PM - 5 AM | 0.8x | Giờ thấp điểm (-20%) |
| Thời gian khác | 1.0x | Normal |

---

## 🤖 AI Bias Correction

Hệ thống **tự động học** từ dữ liệu lịch sử:

```
1. Thống kê được lưu trữ trong Redis (30 ngày)
2. Công thức: Corrected ETA = Estimated ETA × (1 + Average Error %) + Standard Deviation
3. Cần tối thiểu 10 samples để áp dụng correction
```

### Update Historical Stats (gọi sau khi hoàn thành ride)
```javascript
await etaService.updateHistoricalStats(
  'route-hash-123', // route identifier
  15, // estimated duration (minutes)
  18  // actual duration (minutes)
);
```

---

## 📡 Real-time Updates via Kafka

Mọi khi ETA thay đổi, service sẽ publish event:

```
Topic: traffic-updates
Message:
{
  rideId: 'ride-123',
  eventType: 'ride-estimates-updated',
  etaToPickup: 8,
  etaToDestination: 12,
  totalEta: 20,
  totalDistance: 12.7,
  trafficDelayFactor: 1.15,
  timestamp: '2026-04-20T10:00:00Z'
}
```

### Significant Traffic Change Alert
```
Nếu ETA thay đổi ≥ 10% so với lần cuối, sẽ gửi cảnh báo:
{
  rideId: 'ride-123',
  eventType: 'traffic-alert',
  previousETA: 15,
  currentETA: 20,
  percentChange: 33.3
}
```

---

## 💾 Caching Strategy

- **Cache TTL**: 5 phút (300 giây)
- **Cache Key**: `eta:lat1:lon1:lat2:lon2`
- **Clear Cache**: Khi có cập nhật đáng kể

```javascript
// Xóa cache cho một route
await etaService.clearETACache(10.7769, 106.6966, 10.8141, 106.6955);
```

---

## 🔍 Monitoring & Analytics

### Get Traffic Statistics
```javascript
const stats = await etaService.getTrafficStatistics('route-hash-123');

// Response:
{
  routeHash: 'route-hash-123',
  averageErrorPercent: -2.5,      // Underestimate by 2.5%
  standardDeviation: 3.2,          // Variance across samples
  samplesCount: 156,               // Historical samples collected
  minError: -8.5,
  maxError: 12.3
}
```

### Monitor Traffic Changes
```javascript
await etaService.monitorTrafficConditions(
  'ride-123',
  previousETA,
  currentLocation,
  destination
);

// Tự động detect nếu traffic thay đổi ≥ 10% so với lần trước
```

---

## 🔄 Integration Example

```javascript
const express = require('express');
const etaService = require('./services/eta.service');
const router = express.Router();

// Endpoint: GET /api/rides/:rideId/eta
router.get('/api/rides/:rideId/eta', async (req, res) => {
  try {
    const { currentLat, currentLng, destLat, destLng } = req.query;
    
    const eta = await etaService.calculateETA(
      { lat: parseFloat(currentLat), lng: parseFloat(currentLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) },
      30,
      req.params.rideId
    );

    res.json(eta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: GET /api/rides/:rideId/full-estimates
router.get('/api/rides/:rideId/full-estimates', async (req, res) => {
  try {
    const { driverLat, driverLng, pickupLat, pickupLng, destLat, destLng } = req.query;
    
    const estimates = await etaService.calculateRideEstimates(
      { lat: parseFloat(driverLat), lng: parseFloat(driverLng) },
      { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) },
      30,
      req.params.rideId
    );

    res.json(estimates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 📦 Dependencies Cần Thiết

```json
{
  "axios": "^1.6.0",
  "redis": "^4.6.0",
  "kafkajs": "^2.2.0"
}
```

---

## ⚙️ Docker Deployment

```yaml
services:
  ride-service:
    environment:
      - TRAFFIC_PROVIDER=osrm
      - REDIS_HOST=redis
      - KAFKA_BROKERS=kafka:9092
```

---

## 🎓 Performance Tips

1. **Use Caching**: Cache results để giảm API calls
2. **Batch Requests**: Tính toán multiple routes cùng lúc
3. **Fallback Strategy**: Hệ thống tự động fallback nếu traffic API down
4. **Periodically Update**: Cập nhật ETA mỗi 30-60 giây trên client

---

## 🐛 Debugging

```javascript
// Enable detailed logging
process.env.LOG_LEVEL = 'debug';

// Xem traffic data từ provider
const trafficData = await etaService.getTrafficRouteData(10.7769, 106.6966, 10.8141, 106.6955);
console.log('Traffic Data:', trafficData);
```

---

Bạn đã thành công nâng cấp ETA Service! 🚀
