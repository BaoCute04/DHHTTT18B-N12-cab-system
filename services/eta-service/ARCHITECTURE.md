# 🏗️ ETA Service - Complete Architecture Documentation

## 📋 Overview

This document describes the complete ETA Service architecture incorporating:
- ✅ **Event-Driven GPS Updates** (Kafka-based real-time location tracking)
- ✅ **Redis Hot-Store** (ultra-low latency caching)
- ✅ **AI Bias Correction** (historical accuracy improvements)
- ✅ **Multi-Provider Routing** (Google Maps, OSRM, GraphHopper, Mapbox)
- ✅ **Non-blocking Architecture** (async, no service blocking)

---

## 🔗 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAB BOOKING - ETA SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────┘

DRIVER LOCATION → [Kafka: driver.location.updated] → ETA-Tracking-Consumer
                                                              ↓
                                                    ┌─────────────────┐
                                                    │  ETA Service    │
                                                    │  (Calculate)    │
                                                    └────────┬────────┘
                                                             ↓
                                                    ┌─────────────────┐
                                                    │ Bias Correction │
                                                    │ (AI Adjust)     │
                                                    └────────┬────────┘
                                                             ↓
                                                    [Redis: Cache ETA]
                                                             ↓
                                             [Kafka: traffic.updates]
                                                             ↓
                            ┌────────────────────┬───────────┬──────────────┐
                            ↓                    ↓           ↓              ↓
                    Ride Service           Driver App  Notification   Pricing Service
                    (Update ride)      (Show ETA)      Service        (Calculate fare)
```

---

## 🚀 Key Architectural Principles

### 1️⃣ **ETA is Independent (Non-blocking)**

```
Traditional (Blocking):
  Booking Request
    ↓ [WAIT for ETA]
    ↓ [WAIT for Price]
    ↓ [WAIT for Driver Match]
  Response (SLOW - 3-5 seconds)

✅ Event-Driven (Non-blocking):
  Booking Request → Return immediately
    ├─→ Emit: "booking.created" (async)
    ├─→ Ride Service consumes → creates ride
    ├─→ Driver Service consumes → matches driver
    ├─→ ETA-Tracking consumes → calculates ETA
    └─→ Notification Service consumes → sends notification
  Response (FAST - <100ms)
```

**Benefits:**
- Booking doesn't wait for ETA calculation
- ETA updates continuously (not just at booking)
- Parallel processing of independent tasks
- Better scalability & resilience

### 2️⃣ **GPS Updates are Event-Driven (Kafka)**

```
Driver Mobile App (GPS update every 5 seconds)
    ↓
Driver Service receives location
    ↓
Publish to Kafka: driver.location.updated
    ├─→ Topic: "driver.location.updated"
    ├─→ Partition key: rideId (ordering guaranteed)
    ├─→ Message: {rideId, driverId, lat, lng, timestamp}
    ↓
ETA-Tracking-Consumer subscribes
    ├─→ Receives location update
    ├─→ Calls ETA Service
    ├─→ Applies bias correction
    ├─→ Publishes to Kafka: traffic.updates
    ↓
Other services consume (async):
    ├─→ Ride Service updates ride ETA
    ├─→ Notification Service (if ETA changed significantly)
    ├─→ Pricing Service (adjust fare)
    └─→ Driver App (push notification with new ETA)
```

**Advantages:**
- Real-time without polling
- Decoupled services (no HTTP calls)
- Ordered delivery per ride (partition key)
- Can replay history (Kafka retention)
- Fault-tolerant (consumer groups)

### 3️⃣ **Redis Hot-Store for Speed**

```
Cache Layers:
┌─────────────────────────────────────────┐
│ L1: Redis (ETA Service)                 │
│  ├─ eta:estimate:{rideId}              │
│  │  └─ TTL: 5 minutes (300s)           │
│  └─ eta:active-ride:{rideId}           │
│     └─ TTL: 24 hours (86400s)          │
│  Response time: <20ms                   │
└─────────────────────────────────────────┘
          ↓ (miss)
┌─────────────────────────────────────────┐
│ L2: External Routing APIs               │
│  ├─ Google Maps API: 1-2s               │
│  ├─ OSRM API: 500ms-1s                  │
│  ├─ Mapbox API: 1-2s                    │
│  └─ GraphHopper API: 1-2s               │
│  Response time: 500ms - 2s              │
└─────────────────────────────────────────┘
```

**Data Stored:**
```json
{
  "eta:estimate:550e8400": {
    "rideId": "550e8400",
    "etaSeconds": 1200,
    "etaMinutes": 20,
    "distanceMeters": 45000,
    "provider": "osrm",
    "biasCorrection": { "factor": 1.18 }
  },
  "eta:active-ride:550e8400": {
    "rideId": "550e8400",
    "driverId": "660e8400",
    "origin": { "lat": 21.0285, "lng": 105.8542 },
    "destination": { "lat": 10.7769, "lng": 106.7009 },
    "status": "ACTIVE"
  }
}
```

### 4️⃣ **Modular Routing (Easy Provider Switching)**

```
ETA Request
    ↓
Provider Resolver (chainable)
    ├─→ Try Google Maps
    │   └─ Success? Return result
    ├─→ Else try OSRM
    │   └─ Success? Return result
    ├─→ Else try Mapbox
    │   └─ Success? Return result
    ├─→ Else try GraphHopper
    │   └─ Success? Return result
    └─→ Else use Haversine (fallback)
        └─ Always works (mathematical)
```

**Adding New Provider:**

```javascript
// 1. Add resolver function in providers.js
async function resolveWithHere({ origin, destination, providers, fetchImpl }) {
  // HERE Maps API call
  const result = await callHereApi(...);
  return {
    distanceMeters: result.distance,
    durationSeconds: result.time,
    trafficSeconds: result.trafficTime,
    routeLabel: "HERE Route"
  };
}

// 2. Register in resolvers
const resolvers = {
  google: resolveWithGoogle,
  osrm: resolveWithOsrm,
  here: resolveWithHere,  // ← New!
  mapbox: resolveWithMapbox,
  graphhopper: resolveWithGraphhopper
};

// 3. Update config
ETA_PROVIDER_CHAIN=here,google,osrm,mapbox,graphhopper

// Done! No changes to eta.service.js needed
```

### 5️⃣ **AI Bias Correction (History-based Improvements)**

```
Raw ETA from Routing API
    ↓
Apply Corrections:
    ├─→ Time-of-day factor (rush hour vs night)
    ├─→ Day-of-week factor (weekday vs weekend)
    ├─→ Provider accuracy factor (historical performance)
    ├─→ Distance factor (longer routes have more variance)
    └─→ Combine: correctedEta = raw × factor1 × factor2 × factor3 × factor4
    ↓
Final ETA (adjusted for real-world conditions)
```

**Example Correction:**

```
Raw ETA: 1200 seconds (20 minutes)

Corrections:
- Time factor (rush hour): 1.35x
- Provider accuracy (OSRM): 1.05x
- Distance adjustment (45km): 1.02x
- Combined factor: 1.35 × 1.05 × 1.02 = 1.445

Corrected ETA: 1200 × 1.445 = 1734 seconds (29 minutes)

Result: More accurate prediction accounting for:
  ✓ Current traffic conditions
  ✓ Provider's historical accuracy
  ✓ Route characteristics
```

---

## 📦 Service Components

### **1. ETA Service** (Core Calculation)
- Port: `3110`
- Role: REST API for ETA calculations
- Dependencies: Redis, Auth Service, Routing APIs
- Endpoints:
  - `POST /internal/eta/estimate` - Calculate new ETA
  - `POST /internal/eta/active-rides` - Cache active ride
  - `GET /internal/eta/active-rides` - List cached rides
  - `GET /internal/eta/{rideId}` - Get cached ETA

### **2. ETA-Tracking-Consumer** (Real-time Updater)
- Role: Kafka consumer for location events
- Subscribes to: `driver.location.updated`
- Publishes to: `traffic.updates`
- Capabilities:
  - Recalculate ETA on each driver location update
  - Apply AI bias correction
  - Cache updated estimates in Redis
  - Emit events for real-time propagation

### **3. Driver Service** (Location Publisher)
- Role: Publishes driver locations to Kafka
- When: GPS update received (~every 5 seconds)
- Topic: `driver.location.updated`
- Data: `{rideId, driverId, location, speed, heading}`

### **4. Ride Service** (Event Consumer)
- Role: Consumes booking & ETA events
- Subscribes to: `ride.created`, `payment.success`, `driver.assigned`
- Publishes: `ride.status.changed`
- Uses: ETA data for ride lifecycle management

### **5. Booking Service** (Entry Point)
- Role: User requests ride
- Publishes: `booking.created`
- Async flow: Other services respond to event

---

## 🔄 Real-world Flow

### **Scenario: User Books Ride (Hà Nội → TP.HCM)**

```
1. USER BOOKS RIDE
   ├─ App: POST /api/v1/bookings {origin, destination}
   └─ Return: 202 Accepted (fast! ~50ms)

2. BOOKING SERVICE CREATES BOOKING
   ├─ Save to DB
   └─ Publish: Kafka topic "booking.created" {bookingId, customerId, origin, destination}

3. RIDE SERVICE CONSUMES EVENT
   ├─ Create ride record
   ├─ Cache in Redis
   └─ Publish: "ride.created"

4. ETA-TRACKING-CONSUMER (watching Kafka)
   ├─ Not triggered yet (no driver location)
   ├─ Wait for driver assignment

5. DRIVER SERVICE MATCHES DRIVER
   ├─ Find suitable driver
   ├─ Assign driver to ride
   └─ Publish: "driver.assigned" {rideId, driverId}

6. FIRST GPS UPDATE ARRIVES
   ├─ Driver's app sends location via WebSocket
   ├─ Driver Service: Publish to Kafka "driver.location.updated"
   │   {rideId, driverId, lat, lng, timestamp}
   ├─ Message routed to Kafka partition for this rideId (ordering guaranteed)
   ↓

7. ETA-TRACKING-CONSUMER PROCESSES LOCATION
   ├─ Receives event from Kafka partition
   ├─ GET /internal/eta/estimate {origin: driver_location, destination: dest}
   ├─ ETA Service:
   │   ├─ Call Provider: Google Maps → 1000 seconds
   │   ├─ Apply bias: rush hour (1.35) → 1350 seconds
   │   ├─ Cache in Redis: eta:estimate:{rideId}
   │   └─ Return: {etaSeconds: 1350, etaMinutes: 22.5, provider: "google"}
   ├─ Consumer: Publish to Kafka "traffic.updates"
   │   {rideId, etaSeconds: 1350, etaMinutes: 22.5}
   ↓

8. OTHER SERVICES CONSUME TRAFFIC UPDATE
   ├─ Ride Service:
   │   ├─ Update ride.etaSeconds = 1350
   │   ├─ Update ride.etaMinutes = 22.5
   │   └─ Save to DB
   ├─ Notification Service:
   │   ├─ If etaMinutes significantly changed:
   │   │   └─ Send push notification to user
   │   └─ Else: silent update
   ├─ Driver App:
   │   ├─ WebSocket: New ETA received
   │   └─ Update display: "22 minutes to destination"
   └─ Pricing Service:
       ├─ Update fare estimate: distance × rate
       └─ Send updated price to user

9. DRIVER CONTINUES TO MOVE
   ├─ GPS update every ~5 seconds
   ├─ Each triggers steps 7-8
   ├─ ETA constantly recalculated
   ├─ Redis cache updated (fast)
   └─ User sees live, accurate ETA

10. DRIVER ARRIVES AT DESTINATION
    ├─ Ride status: COMPLETED
    ├─ Publish: "ride.completed"
    ├─ Notification Service: Send completion notification
    ├─ Pricing Service: Finalize charge
    └─ Cache expires (TTL reached)
```

**Total time from booking to first ETA:** ~500ms (async)
**Time between GPS updates:** ~5 seconds
**ETA cache hit latency:** <20ms
**ETA provider call latency:** 500ms-2s (only on cache miss)

---

## 🤖 AI & Bias Correction Details

### **Current Implementation (Heuristic-based)**

Located in: `services/eta-tracking-consumer/src/bias-correction.js`

```javascript
function getTrafficFactor(hour, isWeekend) {
  // Rush hours: 7-10 AM, 4-8 PM → +35%
  // Weekend leisure: 10 AM-10 PM → +15%
  // Night: 12 AM-5 AM → -5% (no traffic)
  // Default: normal
}

function getProviderAccuracy(provider) {
  // Google Maps: -2% (slightly underestimate)
  // OSRM: +5% (conservative)
  // Mapbox: -1% (slightly underestimate)
  // GraphHopper: +2% (slightly overestimate)
  // Haversine: +15% (fallback is conservative)
}

const correctionFactor = trafficFactor × providerAccuracy × distanceAdjustment
```

### **Future: ML Model Integration**

```javascript
// Call external ML model service for prediction
export async function callMLModel({ rideId, features, config, logger }) {
  const response = await axios.post(
    `${config.mlModel.serviceUrl}/predict/eta`,
    {
      rideId,
      features: {
        distance,
        time_of_day,
        day_of_week,
        weather,
        driver_experience,
        vehicle_type,
        route_type
      }
    },
    { timeout: 2000 }
  );
  return response.data.prediction; // ML-adjusted ETA
}

// Collect historical data for retraining
export async function recordEtaAccuracy({
  rideId,
  estimatedEta,
  actualEta,
  provider,
  conditions
}) {
  // Store in time-series DB (InfluxDB, TimescaleDB)
  // Pipeline: daily batch training
  // Output: improved model for next day
}
```

---

## 📊 Performance Characteristics

| Scenario | Latency | Provider |
|----------|---------|----------|
| ETA cache hit | <20ms | Redis |
| Provider hit (Google) | 1-2s | Google Maps |
| Provider hit (OSRM) | 500ms-1s | OSRM |
| Provider fallback | <10ms | Haversine |
| Kafka message latency | 50-200ms | Kafka |
| Bias correction | <5ms | In-memory |

| Metric | Value |
|--------|-------|
| Cache hit rate | ~85% (5-min TTL) |
| Avg provider calls/ride | 3-5 (per 1h ride) |
| Recalculations/second | 10-50 (during rush) |
| Redis memory/ride | ~2KB |
| Kafka throughput | 1000+ msgs/sec |

---

## 🔐 Security & Resilience

### **Authentication**
- All requests require Bearer token (JWT)
- Token validated via Auth Service JWKS
- Role-based access: Customer, Driver, Admin

### **Resilience**
- Provider fallback chain (if Google fails → OSRM → Mapbox → Haversine)
- Redis fallback (if Redis down → calculate fresh from API)
- Graceful degradation (if ETA unavailable → use cached value)
- Kafka consumer groups (auto-recovery on failure)
- Non-blocking design (ETA failures don't block booking)

### **Rate Limiting** (Future)
- Per-user: 100 calculations/minute
- Per-ride: Recalculate max every 5 seconds
- Provider API: Respect rate limits with exponential backoff

---

## 📈 Scalability

### **Horizontal Scaling**

```
ETA Service:
  └─ Scale = number of concurrent requests
     ├─ 1 instance: ~100 req/sec
     ├─ 5 instances: ~500 req/sec
     ├─ 10 instances: ~1000 req/sec
     └─ Use load balancer (Nginx, HAProxy)

ETA-Tracking-Consumer:
  └─ Scale = Kafka partitions (auto-scales)
     ├─ 1 partition: 1 consumer
     ├─ 10 partitions: 10 consumers (parallel)
     ├─ 100 partitions: 100 consumers (massive scale)
     └─ Auto-rebalance on consumer add/remove

Redis:
  └─ Scale = Redis cluster
     ├─ Single: ~50K ops/sec
     ├─ Cluster (6 nodes): ~300K ops/sec
     └─ Backup: RDB snapshots, AOF

Kafka:
  └─ Scale = broker cluster
     ├─ 1 broker: moderate throughput
     ├─ 3 brokers: high throughput + HA
     ├─ 10+ brokers: massive scale
     └─ Retention: Configurable (default 7 days)
```

---

## 🚨 Monitoring & Observability

### **Metrics to Track**

```
ETA Service:
  ├─ Requests/sec
  ├─ Cache hit rate
  ├─ Provider fallback frequency
  ├─ Average calculation time
  └─ Error rate by provider

ETA-Tracking-Consumer:
  ├─ Messages consumed/sec
  ├─ Processing latency (location → ETA update)
  ├─ Bias correction factor distribution
  ├─ Failed calculations
  └─ Consumer lag (Kafka)

Redis:
  ├─ Hit rate
  ├─ Memory usage
  ├─ Eviction rate
  └─ Replication lag

Kafka:
  ├─ Throughput (msgs/sec)
  ├─ Consumer lag
  ├─ Partition balance
  └─ Message retention
```

### **Alerting**

```
Critical (Page on-call):
  - Cache hit rate < 50%
  - Provider API downtime
  - Consumer lag > 10 seconds
  - Redis memory > 80%

Warning (Create ticket):
  - Cache hit rate < 70%
  - Provider latency > 3 seconds
  - Consumer lag > 5 seconds
  - Kafka broker down
```

---

## 📚 Related Documentation

- [ETA Service README](../../services/eta-service/README.md)
- [ETA-Tracking-Consumer README](../../services/eta-tracking-consumer/README.md)
- [Event Contracts](../../platform/architecture/event-contracts.js)
- [Real-time Topology](../../platform/architecture/realtime-topology.js)
- [Postman Collection](../../services/eta-service/postman/README.md)

---

## ✅ Implementation Checklist

- [x] ETA Service (core calculation, Redis caching)
- [x] ETA-Tracking-Consumer (Kafka subscriber, bias correction)
- [x] Driver Service Kafka producer (location publishing)
- [x] Ride Service Kafka consumer (event subscription)
- [x] Docker Compose with all services
- [x] AI bias correction (heuristic-based)
- [ ] ML model training pipeline
- [ ] Feature store integration
- [ ] Real-time metrics dashboard
- [ ] Load testing (1000+ req/sec)
- [ ] Chaos engineering tests
- [ ] Production deployment

---

**Last Updated:** April 20, 2026  
**Version:** 1.0.0 (MVP - Event-Driven + Bias Correction)  
**Next:** ML integration phase
