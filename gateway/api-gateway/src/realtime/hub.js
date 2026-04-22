import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { GatewayError } from "../errors.js";
import { enforceDriverLocationAbac } from "../security/abac.js";
import { extractBearerToken } from "../security/jwt-service.js";
import { websocketSchemas } from "../validation-schemas.js";

export function createRealtimeHub({
  endpoint = "/realtime",
  jwtService,
  store,
  logger,
  metrics,
  rideServiceUrl,
  fetchImpl = globalThis.fetch,
  upstreamTimeoutMs = 5000,
  forwardDriverLocationUpdate
}) {
  const webSocketServer = new WebSocketServer({ noServer: true });
  const connectionsById = new Map();
  const userConnections = new Map();

  function addConnection(connection) {
    connectionsById.set(connection.connectionId, connection);
    if (!userConnections.has(connection.userId)) {
      userConnections.set(connection.userId, new Set());
    }

    userConnections.get(connection.userId).add(connection.connectionId);
    metrics.wsConnected();
  }

  function removeConnection(connectionId) {
    const connection = connectionsById.get(connectionId);
    if (!connection) {
      return;
    }

    connectionsById.delete(connectionId);
    const userSet = userConnections.get(connection.userId);
    if (userSet) {
      userSet.delete(connectionId);
      if (userSet.size === 0) {
        userConnections.delete(connection.userId);
      }
    }

    metrics.wsDisconnected();
  }

  webSocketServer.on("connection", (socket, request, auth) => {
    const connectionId = randomUUID();
    const connection = {
      connectionId,
      socket,
      userId: auth.userId,
      role: auth.role,
      clientType: auth.clientType
    };

    addConnection(connection);

    socket.send(
      JSON.stringify({
        type: "realtime.connected",
        connectionId,
        userId: auth.userId,
        role: auth.role,
        clientType: auth.clientType
      })
    );

    socket.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        if (message.type === "driver.location.update") {
          const rateLimitResult = await store.incrementCounter(`ws:driver.location:${connectionId}`, 1000);
          if (rateLimitResult.count > 5) {
            throw new GatewayError(429, "WS_RATE_LIMITED", "WebSocket rate limit exceeded");
          }

          const parsed = websocketSchemas.driverLocationUpdate.parse(message);
          enforceDriverLocationAbac(auth, parsed.payload);
          const forwardResult = await bridgeDriverLocationUpdate(parsed.payload);
          metrics.recordWsMessage(message.type, "accepted");
          socket.send(
            JSON.stringify({
              type: "ack",
              event: message.type,
              accepted: true,
              forwarded: !forwardResult?.skipped
            })
          );
          return;
        }

        metrics.recordWsMessage(message.type || "unknown", "ignored");
        socket.send(
          JSON.stringify({
            type: "ack",
            event: message.type || "unknown",
            accepted: false
          })
        );
      } catch (error) {
        metrics.recordWsMessage("driver.location.update", "rejected");
        socket.send(
          JSON.stringify({
            type: "error",
            message: error.message
          })
        );
      }
    });

    socket.on("close", () => {
      removeConnection(connectionId);
    });

    logger.info({
      event: "ws.connected",
      requestId: request.headers["x-request-id"] || null,
      connectionId,
      userId: auth.userId
    });
  });

  return {
    endpoint,
    attach(server) {
      server.on("upgrade", async (request, socket, head) => {
        const url = new URL(request.url, "http://gateway.local");
        if (url.pathname !== endpoint) {
          socket.destroy();
          return;
        }

        try {
          const token =
            extractBearerToken(request.headers.authorization) ||
            url.searchParams.get("token");

          const auth = await jwtService.verifyAccessToken(token, {
            requestId: request.headers["x-request-id"] || randomUUID(),
            correlationId: request.headers["x-correlation-id"] || randomUUID()
          });
          webSocketServer.handleUpgrade(request, socket, head, (clientSocket) => {
            webSocketServer.emit("connection", clientSocket, request, auth);
          });
        } catch {
          socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
          socket.destroy();
        }
      });
    },
    publishToUser(userId, event) {
      const connectionIds = userConnections.get(userId) || new Set();

      for (const connectionId of connectionIds) {
        const connection = connectionsById.get(connectionId);
        if (connection) {
          connection.socket.send(JSON.stringify(event));
        }
      }

      return connectionIds.size;
    },
    getConnectionSummary() {
      return {
        totalConnections: connectionsById.size,
        users: Array.from(userConnections.entries()).map(([userId, connectionIds]) => ({
          userId,
          connectionCount: connectionIds.size
        }))
      };
    },
    close() {
      for (const connection of connectionsById.values()) {
        connection.socket.close();
      }

      webSocketServer.close();
    }
  };

  async function bridgeDriverLocationUpdate(payload) {
    if (typeof forwardDriverLocationUpdate === "function") {
      return forwardDriverLocationUpdate(payload);
    }

    if (!rideServiceUrl || typeof fetchImpl !== "function") {
      logger.warn?.({
        event: "ws.driver.location.skipped",
        reason: "ride-service-unconfigured"
      });
      return { skipped: true };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs);

    try {
      const response = await fetchImpl(
        `${String(rideServiceUrl).replace(/\/$/, "")}/api/v1/rides/${payload.rideId}/location`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            driverId: payload.driverId,
            currentLocation: {
              lat: payload.latitude,
              lng: payload.longitude
            }
          }),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const body = await safeReadResponse(response);
        throw new GatewayError(
          502,
          "RIDE_LOCATION_FORWARD_FAILED",
          `Ride service rejected driver location update (${response.status})`,
          {
            body
          }
        );
      }

      return { skipped: false };
    } catch (error) {
      if (error instanceof GatewayError) {
        throw error;
      }

      throw new GatewayError(
        502,
        "RIDE_LOCATION_FORWARD_FAILED",
        `Failed to forward GPS update to ride service: ${error.message}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeReadResponse(response) {
  try {
    return await response.text();
  } catch {
    return null;
  }
}
