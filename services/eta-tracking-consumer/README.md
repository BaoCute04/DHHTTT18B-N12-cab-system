# ETA Tracking Consumer

Real-time ETA calculation service that consumes driver location events from Kafka and recalculates ETAs with bias correction.

## 🎯 Purpose

- **Consume** `driver.location.updated` events from Kafka
- **Calculate** updated ETAs as drivers move toward destination
- **Apply** AI bias correction based on historical data & time patterns
- **Publish** `traffic.updates` events for real-time propagation

## 🏗️ Architecture

```
Kafka Topic: driver.location.updated
    ↓
ETA Tracking Consumer (this service)
    ├─→ Get active ride & destination
    ├─→ Call ETA Service with new driver location
    ├─→ Apply bias correction (if enabled)
    └─→ Publish to Kafka: traffic.updates
    ↓
Kafka Topic: traffic.updates
    ├─→ Ride Service (update ride ETA)
    ├─→ Notification Service (notify user)
    └─→ Driver App (show updated ETA)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- Kafka broker running (kafka:29092 by default)
- ETA Service running (localhost:3110 or http://eta-service:3110)
- Auth Service running (for token validation)

### Installation

```bash
npm install
```

### Configuration

Set environment variables in `.env.docker` or pass via docker:

```bash
KAFKA_BROKERS=kafka:29092
ETA_SERVICE_URL=http://eta-service:3110
ENABLE_BIAS_CORRECTION=true
```

### Run Locally

```bash
npm run dev
```

### Run with Docker

```bash
docker build -t cab-eta-tracking-consumer .
docker run -e KAFKA_BROKERS=kafka:29092 cab-eta-tracking-consumer
```

## 📡 Event Schema

### Input: Driver Location Updated

```json
{
  "rideId": "uuid",
  "driverId": "uuid",
  "location": {
    "lat": 21.0285,
    "lng": 105.8542
  },
  "timestamp": "2026-04-20T10:30:00Z",
  "speed": 25.5,
  "heading": 180
}
```

### Output: Traffic Update

```json
{
  "rideId": "uuid",
  "driverId": "uuid",
  "timestamp": "2026-04-20T10:30:05Z",
  "location": { "lat": 21.0285, "lng": 105.8542 },
  "eta": {
    "estimatedSeconds": 1200,
    "estimatedMinutes": 20,
    "distanceMeters": 45000,
    "provider": "osrm",
    "routeLabel": "Primary Route"
  },
  "biasCorrection": {
    "trafficFactor": 1.35,
    "providerAccuracy": 0.98,
    "distanceAdj": 1.02,
    "appliedAt": "2026-04-20T10:30:05Z"
  },
  "eventId": "traffic-uuid-123456"
}
```

## 🤖 AI Bias Correction

Applies multiple factors to correct ETA estimates:

### Time-based Traffic Patterns

- **Rush Hour (7-10 AM, 4-8 PM)**: +35% (1.35x)
- **Off-peak Rush (5-7 AM, 10 AM-12 PM, 8-10 PM)**: +20% (1.20x)
- **Weekend Leisure (10 AM-10 PM)**: +15% (1.15x)
- **Night (12 AM-5 AM)**: -5% (0.95x, minimal traffic)
- **Default**: 1.0x

### Provider-specific Accuracy

Based on historical performance:
- **Google Maps**: 0.98 (2% underestimate)
- **OSRM**: 1.05 (5% overestimate)
- **Mapbox**: 0.99 (1% underestimate)
- **GraphHopper**: 1.02 (2% overestimate)
- **Haversine Fallback**: 1.15 (15% underestimate)

### Distance-based Adjustment

Accounts for higher variance in longer routes:
```
adjustment = 1.0 + (distance / 100000)
max = 1.15
```

### Combined Formula

```
correctedEta = originalEta × trafficFactor × providerAccuracy × distanceAdj
```

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `kafka:29092` | Kafka broker addresses |
| `KAFKA_CONSUMER_GROUP_ID` | `eta-tracking-group` | Consumer group |
| `ETA_SERVICE_URL` | `http://localhost:3110` | ETA service endpoint |
| `ENABLE_BIAS_CORRECTION` | `true` | Enable AI corrections |
| `ENABLE_AI_PREDICTION` | `false` | Use ML model (future) |
| `PUBLISH_TRAFFIC_UPDATES` | `true` | Publish events to Kafka |
| `LOG_LEVEL` | `info` | Logging level |

## 📊 Monitoring

### Logs

```
2026-04-20 10:30:05 [ETA-Tracking-Consumer] INFO: ✅ Kafka connected
2026-04-20 10:30:06 [ETA-Tracking-Consumer] INFO: 📡 Processing location update {rideId, lat, lng}
2026-04-20 10:30:07 [ETA-Tracking-Consumer] INFO: ✅ ETA updated {etaSeconds: 1200}
```

### Metrics to Track

- Events consumed/sec
- ETA calculations/sec
- Bias correction success rate
- Average latency (location → ETA update)
- Provider fallback frequency

## 🔮 Future Enhancements

1. **ML Model Integration**
   - Connect to model serving API
   - Real-time model predictions instead of heuristics
   - Online learning from actual ETAs

2. **Historical Data Collection**
   - Store estimated vs actual ETAs
   - Create training dataset
   - Improve model accuracy over time

3. **Weather Integration**
   - Include weather API data
   - Adjust ETAs for rain/fog/conditions

4. **Driver Experience**
   - Track driver-specific performance
   - Adjust ETAs by driver profile

5. **Route Characteristics**
   - Urban vs highway routes
   - Different correction factors by road type

## 🔐 Security

- Service-to-service authentication via JWT
- HTTPS for external API calls
- Input validation for all events
- Error handling without service crashes

## 📝 Development

### Testing

```bash
# Unit tests (future)
npm test

# Integration tests
npm run test:integration
```

### Debugging

```bash
LOG_LEVEL=debug npm run dev
```

## 📄 License

MIT
