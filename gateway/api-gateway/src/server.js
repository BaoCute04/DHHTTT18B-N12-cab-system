import http from "node:http";
import { createGatewayApp } from "./app.js";
import { createRealtimeHub } from "./realtime/hub.js";

export async function createGatewayServer(options = {}) {
  const runtime = await createGatewayApp(options);
  const server = http.createServer(runtime.app);
  const realtimeHub = createRealtimeHub({
    endpoint: options.realtimeEndpoint || "/realtime",
    jwtService: runtime.dependencies.jwtService,
    store: runtime.dependencies.store,
    logger: runtime.dependencies.logger,
    metrics: runtime.dependencies.metrics,
    rideServiceUrl: runtime.dependencies.env.RIDE_SERVICE_URL,
    fetchImpl: options.fetchImpl || globalThis.fetch,
    upstreamTimeoutMs: Number(runtime.dependencies.env.UPSTREAM_TIMEOUT_MS || 5000),
    forwardDriverLocationUpdate: options.forwardDriverLocationUpdate
  });

  runtime.dependencies.realtimePublisher.publish = (userIds, event) => {
    const targets = Array.isArray(userIds) ? userIds : [userIds];
    return targets.reduce(
      (deliveredCount, userId) => deliveredCount + realtimeHub.publishToUser(String(userId), event),
      0
    );
  };

  realtimeHub.attach(server);

  return {
    ...runtime,
    server,
    realtimeHub,
    async close() {
      realtimeHub.close();

      if (server.listening) {
        await new Promise((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      }

      await runtime.close();
    }
  };
}

export async function startGatewayServer(options = {}) {
  const runtime = await createGatewayServer(options);
  const port = Number((options.env || process.env).PORT || 3000);

  await new Promise((resolve, reject) => {
    runtime.server.listen(port, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  runtime.dependencies.logger.info({
    event: "gateway.started",
    port
  });

  return runtime;
}
