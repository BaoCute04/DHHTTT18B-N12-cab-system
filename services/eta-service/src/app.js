import express from "express";
import dotenv from "dotenv";
import { loadEtaConfig } from "./config.js";
import { createEtaRedisClient, checkEtaRedisHealth } from "./infra/redis.js";
import { createEtaAuthVerifier, extractBearerToken } from "./security/auth.js";
import { createEtaProviderResolver } from "./infra/providers.js";
import { createEtaService } from "./services/eta.service.js";
import { createEtaRouter } from "./routes/index.js";

dotenv.config();

export async function createEtaApp({ env = process.env, logger = console } = {}) {
  const config = loadEtaConfig(env);
  const redisClient = createEtaRedisClient(config.redis);
  if (redisClient.status === "wait") {
    await redisClient.connect();
  }

  const authVerifier = createEtaAuthVerifier(config.auth);
  const providerResolver = createEtaProviderResolver({ providers: config.providers, logger });
  const etaService = createEtaService({ redisClient, providerResolver, config, logger });

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", async (_request, response) => {
    const redisHealth = await checkEtaRedisHealth(redisClient).then(
      () => ({ status: "ok" }),
      (error) => ({ status: "down", error: error.message })
    );

    response.json({
      service: config.serviceName,
      status: redisHealth.status === "ok" && authVerifier.configured ? "ok" : "degraded",
      redis: redisHealth,
      authConfigured: authVerifier.configured,
      providerChain: config.providers.chain
    });
  });

  app.get("/ready", async (_request, response) => {
    const redisReady = await checkEtaRedisHealth(redisClient).then(
      () => true,
      () => false
    );

    response.status(redisReady && authVerifier.configured ? 200 : 503).json({
      service: config.serviceName,
      ready: redisReady && authVerifier.configured
    });
  });

  app.use("/internal/eta", async (request, _response, next) => {
    try {
      if (request.method === "GET" && request.path === "/") {
        return next();
      }

      const internalToken =
        typeof request.headers["x-internal-token"] === "string"
          ? request.headers["x-internal-token"]
          : "";

      if (config.internalAuth.token && internalToken === config.internalAuth.token) {
        request.principal = {
          subjectId: "eta-internal-service",
          roles: ["Admin"]
        };
        return next();
      }

      const token = extractBearerToken(request.headers.authorization);
      if (!token) {
        const error = new Error("Bearer token is required");
        error.statusCode = 401;
        error.code = "UNAUTHORIZED";
        throw error;
      }

      const principal = await authVerifier.verifyAccessToken(token);
      request.principal = principal;

      if (!hasAllowedRole(principal.roles, config.access.allowedRoles)) {
        const error = new Error("You do not have permission to access this resource");
        error.statusCode = 403;
        error.code = "FORBIDDEN";
        throw error;
      }

      return next();
    } catch (error) {
      return next(error);
    }
  });

  app.use("/internal/eta", createEtaRouter({ etaService }));

  app.use((error, _request, response, _next) => {
    const status = error.statusCode || error.status || 500;
    response.status(status).json({
      success: false,
      code: error.code || "ETA_SERVICE_ERROR",
      message: error.message || "ETA service failed"
    });
  });

  const server = app.listen(config.port, () => {
    logger.log?.(`[${config.serviceName}] listening on port ${config.port}`);
  });

  async function shutdown() {
    await redisClient.quit();

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

  process.on("SIGINT", async () => {
    await shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await shutdown();
    process.exit(0);
  });

  return {
    app,
    config,
    redisClient,
    authVerifier,
    providerResolver,
    etaService,
    shutdown
  };
}

function hasAllowedRole(userRoles, allowedRoles) {
  const roles = Array.isArray(userRoles) ? userRoles : [];
  return roles.some((role) => allowedRoles.includes(role));
}