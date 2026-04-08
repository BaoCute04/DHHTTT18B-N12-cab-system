import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createSecretKey } from "node:crypto";
import { SignJWT } from "jose";
import WebSocket from "ws";
import { createGatewayServer } from "../src/server.js";

const JWT_SECRET = "cab-booking-gateway-test-secret";

test("websocket handshake rejects missing token", async (t) => {
  const runtime = await startRuntime(t);

  await assert.rejects(
    connectWebSocket(`${runtime.wsUrl}/realtime`),
    /Unexpected server response: 401/
  );
});

test("websocket authenticates, tracks connections, and supports outbound publish hook", async (t) => {
  const runtime = await startRuntime(t);
  const token = await createToken({
    sub: "driver-1",
    userId: "driver-1",
    role: "Driver",
    clientType: "driver-app"
  });

  const socket = await connectWebSocket(`${runtime.wsUrl}/realtime?token=${token}`);
  t.after(() => socket.client.close());

  const connectedMessage = await socket.nextMessage();
  assert.equal(connectedMessage.type, "realtime.connected");
  assert.equal(runtime.realtimeHub.getConnectionSummary().totalConnections, 1);

  const publishedCount = runtime.realtimeHub.publishToUser("driver-1", {
    type: "ride.assigned",
    payload: {
      rideId: "ride-1"
    }
  });
  assert.equal(publishedCount, 1);

  const pushedMessage = await socket.nextMessage();
  assert.equal(pushedMessage.type, "ride.assigned");

  socket.client.close();
  await once(socket.client, "close");
  await waitFor(() => runtime.realtimeHub.getConnectionSummary().totalConnections === 0);
  assert.equal(runtime.realtimeHub.getConnectionSummary().totalConnections, 0);
  assert.equal(connectedMessage.userId, "driver-1");
});

test("websocket rejects GPS updates from non-driver actors", async (t) => {
  const runtime = await startRuntime(t);
  const token = await createToken({
    sub: "customer-1",
    userId: "customer-1",
    role: "Customer",
    clientType: "customer-app"
  });

  const socket = await connectWebSocket(`${runtime.wsUrl}/realtime?token=${token}`);
  t.after(() => socket.client.close());
  await socket.nextMessage();

  socket.client.send(
    JSON.stringify({
      type: "driver.location.update",
      payload: {
        rideId: "11111111-1111-4111-8111-111111111111",
        driverId: "22222222-2222-4222-8222-222222222222",
        rideStatus: "ACTIVE",
        latitude: 10.77,
        longitude: 106.69,
        recordedAt: "2026-04-08T09:30:00.000Z"
      }
    })
  );

  const errorMessage = await socket.nextMessage();
  assert.equal(errorMessage.type, "error");
  assert.match(errorMessage.message, /Only drivers can publish GPS updates/);
});

test("websocket rate limits driver location updates", async (t) => {
  const runtime = await startRuntime(t);
  const token = await createToken({
    sub: "driver-1",
    userId: "driver-1",
    role: "Driver",
    clientType: "driver-app"
  });

  const socket = await connectWebSocket(`${runtime.wsUrl}/realtime?token=${token}`);
  t.after(() => socket.client.close());
  await socket.nextMessage();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    socket.client.send(JSON.stringify(buildDriverLocationUpdate()));
    const ack = await socket.nextMessage();
    assert.equal(ack.type, "ack");
    assert.equal(ack.accepted, true);
  }

  socket.client.send(JSON.stringify(buildDriverLocationUpdate()));
  const limited = await socket.nextMessage();
  assert.equal(limited.type, "error");
  assert.match(limited.message, /WebSocket rate limit exceeded/);
});

async function startRuntime(t) {
  const runtime = await createGatewayServer({
    env: {
      JWT_ACCESS_SECRET: JWT_SECRET
    },
    storeMode: "memory"
  });

  runtime.server.listen(0);
  await once(runtime.server, "listening");
  const address = runtime.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await runtime.close();
  });

  return {
    ...runtime,
    wsUrl: baseUrl.replace("http://", "ws://")
  };
}

async function createToken(claims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(createSecretKey(Buffer.from(JWT_SECRET, "utf8")));
}

function connectWebSocket(url) {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url);
    const queue = [];
    const waiters = [];

    client.on("message", (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage.toString());
        if (waiters.length > 0) {
          const waiter = waiters.shift();
          waiter(parsed);
          return;
        }

        queue.push(parsed);
      } catch (error) {
        reject(error);
      }
    });

    client.once("open", () =>
      resolve({
        client,
        nextMessage() {
          if (queue.length > 0) {
            return Promise.resolve(queue.shift());
          }

          return new Promise((resolveMessage) => {
            waiters.push(resolveMessage);
          });
        }
      })
    );
    client.once("error", reject);
    client.once("unexpected-response", (_request, response) => {
      reject(new Error(`Unexpected server response: ${response.statusCode}`));
    });
  });
}

function buildDriverLocationUpdate() {
  return {
    type: "driver.location.update",
    payload: {
      rideId: "11111111-1111-4111-8111-111111111111",
      driverId: "22222222-2222-4222-8222-222222222222",
      rideStatus: "ACTIVE",
      latitude: 10.77,
      longitude: 106.69,
      recordedAt: "2026-04-08T09:30:00.000Z"
    }
  };
}

async function waitFor(predicate, timeoutMs = 500) {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Condition was not met before timeout");
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
