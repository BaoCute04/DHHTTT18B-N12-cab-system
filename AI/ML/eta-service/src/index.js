import dotenv from "dotenv";
import express from "express";
import { loadConfig } from "./config.js";
import { createRedisStore } from "./infra/redis.js";
import { createEtaService } from "./services/eta.service.js";
import { createEtaRouter } from "./routes/index.js";

dotenv.config();

const config = loadConfig();
const redisStore = await createRedisStore(config);
const etaService = createEtaService({ config, redisStore });
const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    service: "eta-service",
    status: "ok",
    cacheConnected: redisStore.connected,
    timestamp: new Date().toISOString()
  });
});

app.get("/ready", (_request, response) => {
  response.json({
    service: "eta-service",
    ready: true
  });
});

app.use("/internal/eta", createEtaRouter({ etaService, config }));

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.listen(config.port, () => {
  console.log(`[eta-service] listening on port ${config.port}`);
});

async function shutdown() {
  await redisStore.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
