# ETA Service Postman Collection Guide

## 📋 Mô tả (Description)

Bộ sưu tập Postman này cung cấp kiểm thử end-to-end hoàn chỉnh cho ETA Service - dịch vụ tính toán thời gian dự kiến đến (Estimated Time of Arrival) với bộ nhớ cache Redis và xác thực JWT.

This Postman collection provides complete end-to-end testing for ETA Service - a microservice that calculates Estimated Time of Arrival with Redis caching and JWT authentication.

---

## 🚀 Quick Start

### 1. Prerequisites

Đảm bảo các dịch vụ sau đang chạy (Ensure these services are running):

```bash
# From workspace root
docker compose -f infra/docker-compose/docker-compose.local.yml up -d auth-service auth-redis eta-redis
npm run dev:eta
```

**Verify services are healthy:**
- Auth Service: `http://localhost:3104/api/v1/auth/health` → 200 OK
- ETA Service: `http://localhost:3110/internal/eta/health` → 200 OK
- Redis: Running on localhost:6379

### 2. Import Files vào Postman (Import into Postman)

**a) Import Environment:**
- Open Postman → Environments (left sidebar) → Import
- Select: `eta-service-local.postman_environment.json`
- Verify: 13 variables loaded (authBaseUrl, etaBaseUrl, otpCode, accessToken, etc.)

**b) Import Collection:**
- Open Postman → Collections (left sidebar) → Import
- Select: `eta-service-e2e.postman_collection.json`
- Verify: 3 folders with 9 requests loaded

### 3. Select Environment

**Critical Step - Chọn đúng environment:**
- Dropdown phía trên cùng bên phải Postman
- Select: `eta-service-local` (next to the Send button)
- If environment is NOT selected, variables like `{{accessToken}}` won't be available

---

## 📁 Collection Structure

### Folder 1: **00 Health** (Smoke Tests)

Verify all services are accessible and responding.

| Request | Method | URL | Purpose |
|---------|--------|-----|---------|
| Auth Service Health | GET | `{{authBaseUrl}}/api/v1/auth/health` | Check auth-service is running |
| ETA Service Health | GET | `{{etaBaseUrl}}/internal/eta/health` | Check eta-service is running |
| ETA Service Ready | GET | `{{etaBaseUrl}}/internal/eta/ready` | Verify Redis connectivity |

**Expected Results:**
- All 3 requests return **200 OK**
- Auth response: `{ status: "ok" }`
- ETA health response: `{ status: "ok", redis: "ok" }`
- ETA ready response: `{ ready: true }`

**Troubleshooting:**
- If any fails with 502/503: Services not running. Check `docker compose ps` and `npm run dev:eta`
- If Redis health is "error": Redis container not running. Restart: `docker compose -f infra/docker-compose/docker-compose.local.yml up -d eta-redis`

---

### Folder 2: **01 Auth Token Bootstrap** (Token Generation)

Generate an access token required for all subsequent ETA API calls.

#### Request 2a: **OTP Request**
```
POST {{authBaseUrl}}/api/v1/auth/login/otp/request
```

**Body:**
```json
{
  "destination": "{{otpDestination}}",
  "role": "{{otpRole}}",
  "channel": "{{otpChannel}}"
}
```

**Default Values (from environment):**
- `otpDestination`: `+84901234567`
- `otpRole`: `customer`
- `otpChannel`: `sms`

**Pre-request Script Actions:**
- Auto-populated from environment (nothing for you to do)

**Test Script Actions (Automatic):**
- ✅ Captures debug OTP code: `{{otpCode}}`
- ✅ Sets it in environment automatically
- Response example: `{ debugOtpCode: "659722" }`

**Expected Result:** 
- Status: **202 Accepted**
- Response: `{ debugOtpCode: "XXXXXX" }`

---

#### Request 2b: **OTP Verify + Save Access Token**
```
POST {{authBaseUrl}}/api/v1/auth/login/otp/verify
```

**Body:**
```json
{
  "destination": "{{otpDestination}}",
  "role": "{{otpRole}}",
  "code": "{{otpCode}}"
}
```

**Pre-request Script Actions:**
- Uses auto-captured OTP code from Request 2a

**Test Script Actions (Automatic):**
- ✅ Validates response status is **200 OK**
- ✅ Extracts: `response.data.accessToken`
- ✅ Saves to environment as `{{accessToken}}`

**Expected Result:**
- Status: **200 OK**
- Response contains: `{ data: { accessToken: "eyJhbGc..." } }`
- `{{accessToken}}` now ready for ETA API requests

**⚠️ Important:** 
Run these 2 requests **BEFORE** any ETA API requests. The access token from Request 2b is required for all requests in Folder 3.

---

### Folder 3: **02 ETA Internal APIs** (Core Functionality)

Test all 6 ETA service endpoints. **All requests require Bearer token from Folder 2.**

Each request includes:
```
Authorization: Bearer {{accessToken}}
```

#### Request 3a: **GET / - Service Running Check**
```
GET {{etaBaseUrl}}/internal/eta/
```

**Expected Result:** 
- Status: **200 OK**
- Response: `{ running: true }`

---

#### Request 3b: **POST /estimate - Calculate ETA**
```
POST {{etaBaseUrl}}/internal/eta/estimate
```

**Body (Example - Hà Nội to TP.HCM):**
```json
{
  "origin": {
    "latitude": 21.0285,
    "longitude": 105.8542
  },
  "destination": {
    "latitude": 10.7769,
    "longitude": 106.7009
  },
  "vehicleType": "car",
  "optionalRideId": null
}
```

**Key Parameters:**
- `origin`, `destination`: Required objects with latitude/longitude
- `vehicleType`: Optional (`bike`, `car`, `car_plus`). Default: `car`
- `optionalRideId`: Optional UUID. If provided, result is cached in Redis

**Response Example:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "etaSeconds": 197,
    "etaMinutes": 3.28,
    "distanceMeters": 1200,
    "durationSeconds": 150,
    "provider": "osrm",
    "routeLabel": "Primary Route via OSRM"
  }
}
```

---

#### Request 3c: **POST /active-rides - Cache Active Ride**
```
POST {{etaBaseUrl}}/internal/eta/active-rides
```

**Body:**
```json
{
  "rideId": "{{rideId}}",
  "driverId": "{{driverId}}",
  "origin": {
    "latitude": 21.0285,
    "longitude": 105.8542
  },
  "destination": {
    "latitude": 10.7769,
    "longitude": 106.7009
  },
  "vehicleType": "car",
  "status": "accepted"
}
```

**Default Values (from environment):**
- `rideId`: UUID v4 (pre-generated in environment)
- `driverId`: UUID v4 (pre-generated in environment)

**Purpose:** 
Store ride info in Redis with 24-hour TTL for quick lookups.

**Expected Result:**
- Status: **200 OK**
- Response: `{ success: true, rideId: "..." }`

---

#### Request 3d: **GET /active-rides - List All Cached Rides**
```
GET {{etaBaseUrl}}/internal/eta/active-rides
```

**Purpose:** 
Retrieve all active rides currently in Redis cache.

**Expected Result:**
- Status: **200 OK**
- Response: `{ success: true, data: [ { rideId, driverId, origin, destination, ... }, ... ] }`

---

#### Request 3e: **GET /active-rides/{rideId} - Get Specific Ride**
```
GET {{etaBaseUrl}}/internal/eta/active-rides/{{rideId}}
```

**Purpose:** 
Fetch cached data for a specific ride by its ID.

**Expected Result:**
- Status: **200 OK**
- Response: `{ success: true, data: { rideId, driverId, origin, destination, vehicleType, status, ... } }`

---

#### Request 3f: **GET /{rideId} - Get Cached ETA Estimate**
```
GET {{etaBaseUrl}}/internal/eta/{{rideId}}
```

**Purpose:** 
Retrieve previously calculated ETA estimate for a ride (if cached).

**Prerequisites:**
- Ride must exist in cache (use Request 3b with optionalRideId or Request 3c first)

**Expected Result:**
- Status: **200 OK** (if found) or **404 Not Found** (if expired/not cached)
- Response: `{ success: true, data: { etaSeconds, etaMinutes, distanceMeters, provider, ... } }`

---

## 🔄 Workflow: Run Complete Test

**Sequential Steps (recommended execution order):**

1. **Folder 00 - Health:**
   - ✅ Run "Auth Service Health" (verify auth-service connectivity)
   - ✅ Run "ETA Service Health" (verify eta-service connectivity)
   - ✅ Run "ETA Service Ready" (verify Redis is accessible)

2. **Folder 01 - Auth Bootstrap:**
   - ✅ Run "OTP Request" (gets OTP code, stored in {{otpCode}})
   - ✅ Run "OTP Verify" (gets token, stored in {{accessToken}})

3. **Folder 02 - ETA APIs:**
   - ✅ Run "GET / - Service Check" (smoke test)
   - ✅ Run "POST /estimate" (calculate ETA, no caching)
   - ✅ Run "POST /active-rides" (cache active ride)
   - ✅ Run "GET /active-rides" (list all rides)
   - ✅ Run "GET /active-rides/{rideId}" (get specific ride)
   - ✅ Run "GET /{rideId}" (retrieve cached ETA)

**Quick Execution:**
- In Postman: Right-click on any folder → "Run folder" → Run all 9 requests sequentially

---

## 🔐 Authentication Details

### How It Works (Cách hoạt động)

1. **OTP Request** (Request 2a):
   - Sends phone number + role (customer/driver/admin)
   - Auth service returns debug OTP code (for testing only)
   - ✅ Pre-request script auto-captures code into `{{otpCode}}`

2. **OTP Verify** (Request 2b):
   - Sends phone number + OTP code + role
   - Auth service returns JWT access token
   - ✅ Test script auto-captures token into `{{accessToken}}`

3. **All ETA Requests** (Folder 3):
   - Include header: `Authorization: Bearer {{accessToken}}`
   - ETA service validates JWT via auth-service JWKS
   - If invalid/expired: 401 Unauthorized response

### Token Expiration

- Default token TTL: **1 hour**
- If you get 401 error after ~60 minutes: Re-run Request 2a + 2b to get new token

---

## ⚙️ Environment Variables Reference

| Variable | Default Value | Purpose |
|----------|---------------|---------|
| `authBaseUrl` | `http://localhost:3104` | Auth service endpoint |
| `etaBaseUrl` | `http://localhost:3110` | ETA service endpoint |
| `otpDestination` | `+84901234567` | Test phone number for OTP |
| `otpRole` | `customer` | Role for OTP (customer/driver/admin) |
| `otpChannel` | `sms` | OTP delivery channel (sms/email) |
| `otpCode` | (auto-filled) | Captured from OTP Request response |
| `accessToken` | (auto-filled) | Captured from OTP Verify response |
| `rideId` | (UUID) | Test ride identifier |
| `driverId` | (UUID) | Test driver identifier |
| `originLat` | `21.0285` | Origin latitude (Hà Nội) |
| `originLng` | `105.8542` | Origin longitude (Hà Nội) |
| `destinationLat` | `10.7769` | Destination latitude (TP.HCM) |
| `destinationLng` | `106.7009` | Destination longitude (TP.HCM) |

**To modify:** Click on environment name in top-right → "Edit" → update values as needed

---

## 🐛 Troubleshooting

### Issue: "Cannot GET /internal/eta/health" - 404 Not Found

**Cause:** ETA service is not running on port 3110

**Solution:**
```bash
# Terminal 1: Check if eta-service is running
docker compose -f infra/docker-compose/docker-compose.local.yml ps

# Terminal 2: If not running, start it
npm run dev:eta
# Or
node services/eta-service/src/index.js
```

---

### Issue: "ERROR: ECONNREFUSED 127.0.0.1:6379" in ETA logs

**Cause:** Redis (eta-redis) is not running

**Solution:**
```bash
docker compose -f infra/docker-compose/docker-compose.local.yml up -d eta-redis
```

**Verify:**
```bash
docker compose -f infra/docker-compose/docker-compose.local.yml ps eta-redis
```

---

### Issue: "Unauthorized" - 401 response on ETA API requests

**Cause:** Access token is missing, invalid, or expired

**Solution:**
1. Verify environment is set to `eta-service-local` (dropdown top-right)
2. Re-run Request 2a (OTP Request)
3. Re-run Request 2b (OTP Verify) - this generates new token
4. Retry ETA request

---

### Issue: "Address already in use" / "Port 3110 already bound"

**Cause:** Another process is using port 3110

**Solution (Windows PowerShell):**
```powershell
Get-NetTCPConnection -LocalPort 3110
Stop-Process -Id <PID> -Force
```

**Solution (Linux/Mac):**
```bash
lsof -i :3110
kill -9 <PID>
```

---

### Issue: OTP Request returns 500 error

**Cause:** Auth service or database is down

**Solution:**
```bash
# Check auth-service health
curl http://localhost:3104/api/v1/auth/health

# If not healthy, restart
docker compose -f infra/docker-compose/docker-compose.local.yml restart auth-service
```

---

### Issue: ETA estimate request returns 400 Bad Request

**Cause:** Invalid coordinates or missing required fields

**Verify Request Body:**
```json
{
  "origin": { "latitude": 21.0285, "longitude": 105.8542 },
  "destination": { "latitude": 10.7769, "longitude": 106.7009 }
}
```

- Both `origin` and `destination` must be objects with `latitude` and `longitude`
- Coordinates must be valid numbers (not strings)
- Latitude range: `-90` to `90`
- Longitude range: `-180` to `180`

---

## 📊 Expected Response Times

| Endpoint | Typical Time | Notes |
|----------|--------------|-------|
| Health checks | <50ms | Local requests |
| OTP Request | 100-500ms | Auth service |
| OTP Verify | 200-800ms | Auth service + DB |
| ETA Estimate (Google Maps) | 1-2s | External API call |
| ETA Estimate (OSRM) | 500-1000ms | Open-source routing |
| ETA Estimate (Cached) | <20ms | Redis hit |
| Active rides GET | <50ms | Redis list query |

**Note:** First ETA request is slow due to external API calls. Subsequent requests with same rideId use cache and are much faster.

---

## 🔌 API Response Format

### Success Response (2xx)
```json
{
  "success": true,
  "code": 200,
  "data": { ... }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "code": 401,
  "message": "Unauthorized - Invalid or missing access token"
}
```

### Common Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Request succeeded |
| 202 | Accepted | OTP request sent (async operation) |
| 400 | Bad Request | Invalid request body (check coordinates, fields) |
| 401 | Unauthorized | Missing/invalid Bearer token - re-authenticate |
| 404 | Not Found | Resource not found (e.g., ride not in cache) |
| 500 | Server Error | ETA service error - check logs |
| 503 | Service Unavailable | Redis unavailable - restart eta-redis |

---

## 📝 Custom Testing

### Test with Different Coordinates

**Edit Request 3b (POST /estimate):**
```json
{
  "origin": {
    "latitude": YOUR_START_LAT,
    "longitude": YOUR_START_LNG
  },
  "destination": {
    "latitude": YOUR_END_LAT,
    "longitude": YOUR_END_LNG
  },
  "vehicleType": "car"
}
```

**Popular Test Locations:**
- Hà Nội City Center: `21.0285, 105.8542`
- TP.HCM City Center: `10.7769, 106.7009`
- Hà Nội - TP.HCM route: From above coords
- Bến Thành Market: `10.7725, 106.6984`

### Test with Different Roles

**Edit environment `otpRole`:**
- `customer` - Regular user placing ride
- `driver` - Driver accepting ride
- `admin` - Administrative access

Then re-run Request 2a + 2b to get new token for that role.

---

## ✅ Validation Checklist

Before reporting issues, verify:

- [ ] All 3 services running: `docker compose ps` shows auth-service, eta-service, eta-redis (green)
- [ ] Environment selected: Dropdown shows `eta-service-local`
- [ ] Requests ordered correctly: Folder 00 → Folder 01 → Folder 02
- [ ] OTP captured: After Request 2a, check if `{{otpCode}}` has a value (right-click environment → preview)
- [ ] Token captured: After Request 2b, check if `{{accessToken}}` starts with `eyJ`
- [ ] Health checks pass: All 3 in Folder 00 return 200 OK
- [ ] No network issues: `curl localhost:3104` and `curl localhost:3110` work
- [ ] Redis healthy: `docker compose exec eta-redis redis-cli PING` returns PONG

---

## 📞 Support

**For issues related to:**
- ETA service code: Check `services/eta-service/src/`
- Docker setup: Check `infra/docker-compose/docker-compose.local.yml`
- Auth integration: See `services/eta-service/src/security/auth.js`
- Redis cache: See `services/eta-service/src/infra/redis.js`

---

**Last Updated:** April 20, 2026  
**Collection Version:** 1.0.0  
**ETA Service Version:** 1.0.0
