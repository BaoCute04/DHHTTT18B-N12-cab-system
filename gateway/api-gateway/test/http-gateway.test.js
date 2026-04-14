import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import test from "node:test";
import { createSecretKey } from "node:crypto";
import request from "supertest";
import { SignJWT } from "jose";
import { createGatewayApp } from "../src/app.js";

const JWT_SECRET = "cab-booking-gateway-test-secret";
const VALID_BOOKING_PAYLOAD = {
  userId: "11111111-1111-4111-8111-111111111111",
  pickup: {
    lat: 10.762622,
    lng: 106.660172,
    address: "District 1"
  },
  destination: {
    lat: 10.77653,
    lng: 106.700981,
    address: "District 2"
  },
  vehicleType: "car",
  priceSnapshot: {
    amount: 125000,
    currency: "VND",
    surgeMultiplier: 1
  }
};

test("gateway injects tracing headers, proxies request, and normalizes upstream response", async (t) => {
  const upstream = await createUpstreamServer(({ req, json, sendJson }) => {
    sendJson(200, {
      receivedHeaders: req.headers,
      query: Object.fromEntries(new URL(req.url, "http://upstream.local").searchParams.entries()),
      body: json
    });
  });
  t.after(async () => upstream.close());

  const runtime = await createGatewayApp({
    env: createEnv({
      USER_SERVICE_URL: upstream.url
    }),
    storeMode: "memory"
  });
  t.after(async () => runtime.close());

  const token = await createToken({
    sub: "customer-1",
    userId: "customer-1",
    role: "Customer",
    clientType: "customer-app"
  });

  const response = await request(runtime.app)
    .get("/api/v1/users/profile?view=full")
    .set("Authorization", `Bearer ${token}`)
    .set("x-correlation-id", "corr-123")
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.correlationId, "corr-123");
  assert.ok(response.body.meta.requestId);
  assert.equal(response.body.data.query.view, "full");
  assert.equal(response.body.data.receivedHeaders["x-correlation-id"], "corr-123");
  assert.equal(response.body.data.receivedHeaders["x-request-id"], response.body.meta.requestId);
});

test("protected routes reject missing bearer token", async (t) => {
  const runtime = await createGatewayApp({
    env: createEnv(),
    storeMode: "memory"
  });
  t.after(async () => runtime.close());

  const response = await request(runtime.app).get("/api/v1/users/profile").expect(401);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Bearer token is required");
});

test("RBAC blocks drivers from creating bookings", async (t) => {
  const upstream = await createUpstreamServer(({ sendJson }) => {
    sendJson(201, {
      bookingId: "booking-1"
    });
  });
  t.after(async () => upstream.close());

  const runtime = await createGatewayApp({
    env: createEnv({
      BOOKING_SERVICE_URL: upstream.url
    }),
    storeMode: "memory"
  });
  t.after(async () => runtime.close());

  const token = await createToken({
    sub: "driver-1",
    userId: "driver-1",
    role: "Driver",
    clientType: "driver-app"
  });

  const response = await request(runtime.app)
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${token}`)
    .set("Idempotency-Key", "booking-key-1")
    .send(VALID_BOOKING_PAYLOAD)
    .expect(403);

  assert.equal(response.body.message, "You do not have permission to access this resource");
});

test("auth endpoints are rate limited at five requests per minute", async (t) => {
  const upstream = await createUpstreamServer(({ sendJson }) => {
    sendJson(200, {
      token: "ok"
    });
  });
  t.after(async () => upstream.close());

  const runtime = await createGatewayApp({
    env: createEnv({
      AUTH_SERVICE_URL: upstream.url
    }),
    storeMode: "memory"
  });
  t.after(async () => runtime.close());

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await request(runtime.app)
      .post("/api/v1/auth/login")
      .send({
        identifier: "demo@example.com",
        password: "password123"
      })
      .expect(200);
  }

  const blocked = await request(runtime.app)
    .post("/api/v1/auth/login")
    .send({
      identifier: "demo@example.com",
      password: "password123"
    })
    .expect(429);

  assert.equal(blocked.body.message, "Rate limit exceeded");
  assert.ok(blocked.headers["retry-after"]);
});

test("booking creation requires Idempotency-Key and valid schema", async (t) => {
  const runtime = await createGatewayApp({
    env: createEnv(),
    storeMode: "memory"
  });
  t.after(async () => runtime.close());

  const token = await createToken({
    sub: "customer-1",
    userId: "customer-1",
    role: "Customer",
    clientType: "customer-app"
  });

  const invalidSchemaResponse = await request(runtime.app)
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${token}`)
    .set("Idempotency-Key", "booking-key-2")
    .send({
      userId: "not-a-uuid"
    })
    .expect(400);

  assert.equal(invalidSchemaResponse.body.message, "Request validation failed");

  const missingIdempotencyResponse = await request(runtime.app)
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${token}`)
    .send(VALID_BOOKING_PAYLOAD)
    .expect(400);

  assert.equal(missingIdempotencyResponse.body.message, "Idempotency-Key header is required");
});

test("booking idempotency returns cached response and avoids duplicate upstream calls", async (t) => {
  let callCount = 0;
  const upstream = await createUpstreamServer(({ sendJson }) => {
    callCount += 1;
    sendJson(201, {
      bookingId: "booking-1",
      sequence: callCount
    });
  });
  t.after(async () => upstream.close());

  const runtime = await createGatewayApp({
    env: createEnv({
      BOOKING_SERVICE_URL: upstream.url
    }),
    storeMode: "memory"
  });
  t.after(async () => runtime.close());

  const token = await createToken({
    sub: "customer-1",
    userId: "customer-1",
    role: "Customer",
    clientType: "customer-app"
  });

  const first = await request(runtime.app)
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${token}`)
    .set("Idempotency-Key", "booking-key-3")
    .send(VALID_BOOKING_PAYLOAD)
    .expect(201);

  const second = await request(runtime.app)
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${token}`)
    .set("Idempotency-Key", "booking-key-3")
    .send(VALID_BOOKING_PAYLOAD)
    .expect(201);

  assert.equal(callCount, 1);
  assert.equal(first.body.data.sequence, 1);
  assert.equal(second.body.data.sequence, 1);
});

test("gateway returns timeout then opens circuit breaker for the upstream", async (t) => {
  let attempts = 0;
  const upstream = await createUpstreamServer(async ({ sendJson }) => {
    attempts += 1;
    await sleep(40);
    sendJson(200, {
      ok: true
    });
  });
  t.after(async () => upstream.close());

  const runtime = await createGatewayApp({
    env: createEnv(
      {
        USER_SERVICE_URL: upstream.url,
        UPSTREAM_TIMEOUT_MS: "10",
        CIRCUIT_BREAKER_FAILURE_THRESHOLD: "1",
        CIRCUIT_BREAKER_RESET_TIMEOUT_MS: "5000"
      }
    ),
    storeMode: "memory"
  });
  t.after(async () => runtime.close());

  const token = await createToken({
    sub: "customer-1",
    userId: "customer-1",
    role: "Customer",
    clientType: "customer-app"
  });

  const first = await request(runtime.app)
    .get("/api/v1/users/slow")
    .set("Authorization", `Bearer ${token}`)
    .expect(504);

  const second = await request(runtime.app)
    .get("/api/v1/users/slow")
    .set("Authorization", `Bearer ${token}`)
    .expect(503);

  assert.equal(first.body.message, "user-service timed out");
  assert.equal(second.body.message, "user-service is temporarily unavailable");
  assert.equal(attempts, 1);
});

function createEnv(overrides = {}) {
  return {
    JWT_ACCESS_SECRET: JWT_SECRET,
    UPSTREAM_TIMEOUT_MS: "5000",
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: "5",
    CIRCUIT_BREAKER_RESET_TIMEOUT_MS: "30000",
    ...overrides
  };
}

async function createToken(claims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(createSecretKey(Buffer.from(JWT_SECRET, "utf8")));
}

async function createUpstreamServer(handler) {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString("utf8");
    const json = rawBody ? JSON.parse(rawBody) : null;

    await handler({
      req,
      rawBody,
      json,
      sendJson(status, payload) {
        res.writeHead(status, {
          "content-type": "application/json"
        });
        res.end(JSON.stringify(payload));
      }
    });
  });

  server.listen(0);
  await once(server, "listening");
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}`,
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
