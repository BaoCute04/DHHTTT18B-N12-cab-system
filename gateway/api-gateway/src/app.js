import express from "express";
import { createErrorHandlerMiddleware } from "./middleware/error-handler.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createAuthorizationMiddleware } from "./middleware/authorization.js";
import { createIdempotencyMiddleware } from "./middleware/idempotency.js";
import { createRateLimitMiddleware } from "./middleware/rate-limit.js";
import { createRequestContextMiddleware } from "./middleware/request-context.js";
import { createResponseNormalizationMiddleware } from "./middleware/response-normalization.js";
import { createRoutingMiddleware } from "./middleware/routing.js";
import { createValidationMiddleware } from "./middleware/validation.js";
import { sendNormalizedResponse } from "./http-response.js";
import { createLogger } from "./logger.js";
import { createGatewayMetrics } from "./metrics.js";
import { createRouteRegistry } from "./route-registry.js";
import { createJwtService } from "./security/jwt-service.js";
import { createProxyClient } from "./services/proxy-client.js";
import { createGatewayStore } from "./stores/index.js";

export async function createGatewayApp(options = {}) {
  const env = options.env || process.env;
  const logger = options.logger || createLogger();
  const metrics = options.metrics || createGatewayMetrics();
  const store = options.store || createGatewayStore({ env, mode: options.storeMode });
  const routeRegistry = options.routeRegistry || createRouteRegistry({
    env,
    upstreamTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS || 5000)
  });
  const jwtService = options.jwtService || createJwtService({
    secret: env.JWT_ACCESS_SECRET,
    publicKey: env.JWT_PUBLIC_KEY,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
  const proxyClient =
    options.proxyClient ||
    createProxyClient({
      fetchImpl: options.fetchImpl || globalThis.fetch,
      logger,
      defaultTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS || 5000),
      failureThreshold: Number(env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || 5),
      resetTimeoutMs: Number(env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS || 30_000)
    });

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(createRequestContextMiddleware({ routeRegistry, logger, metrics }));

  app.get("/health", (request, response) => {
    sendNormalizedResponse(
      response,
      200,
      {
        message: "Gateway is healthy",
        data: {
          service: "api-gateway",
          status: "ok"
        }
      },
      request.context
    );
  });

  app.get("/api/v1/health", (request, response) => {
    response.redirect("/health");
  });

  app.get("/ready", async (request, response) => {
    const storeReady = await store.isReady();
    const ready = storeReady && jwtService.configured;

    sendNormalizedResponse(
      response,
      ready ? 200 : 503,
      {
        message: ready ? "Gateway is ready" : "Gateway is not ready",
        data: {
          status: ready ? "ready" : "degraded",
          dependencies: {
            jwtConfigured: jwtService.configured,
            store: store.mode,
            storeReady
          }
        }
      },
      request.context
    );
  });

  app.get("/metrics", async (_request, response) => {
    response.setHeader("content-type", metrics.registry.contentType);
    response.status(200).send(await metrics.registry.metrics());
  });

  const apiPipeline = [
    createAuthMiddleware({ jwtService }),
    createAuthorizationMiddleware(),
    createRateLimitMiddleware({ store }),
    createValidationMiddleware(),
    createIdempotencyMiddleware({ store }),
    createRoutingMiddleware({ proxyClient }),
    createResponseNormalizationMiddleware({ store })
  ];

  app.use(apiPipeline);

  app.use((request, response, next) => {
    if (response.headersSent) {
      return next();
    }

    return sendNormalizedResponse(
      response,
      404,
      {
        error: "NOT_FOUND",
        message: "Route not found"
      },
      request.context
    );
  });

  app.use(createErrorHandlerMiddleware({ logger }));

  return {
    app,
    dependencies: {
      env,
      logger,
      metrics,
      store,
      routeRegistry,
      jwtService,
      proxyClient
    },
    async close() {
      await store.disconnect();
    }
  };
}
