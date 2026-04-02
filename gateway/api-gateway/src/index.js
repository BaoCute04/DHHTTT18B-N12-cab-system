import cors from "cors";
import express from "express";
import http from "node:http";
import { topology } from "../../../platform/architecture/topology.js";
import { createAiLayer } from "../../../platform/node/ai-layer.js";
import { createResilienceLayer } from "../../../platform/node/resilience-layer.js";
import { createSecurityLayer } from "../../../platform/node/security-layer.js";
import { createRealtimeLayer } from "../../../platform/node/socket-layer.js";

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 3000);
const aiLayer = createAiLayer({
  gatewayKey: topology.gateway.key,
  aiTopology: topology.ai
});
const resilienceLayer = createResilienceLayer({
  gatewayKey: topology.gateway.key,
  resilienceTopology: topology.resilience
});
const securityLayer = createSecurityLayer({
  gatewayKey: topology.gateway.key,
  securityTopology: topology.security
});
const realtimeLayer = createRealtimeLayer({
  server,
  gatewayKey: topology.gateway.key,
  realtimeTopology: topology.realtime
});

app.use(cors());
app.use(express.json());
app.use(aiLayer.middleware);
app.use(resilienceLayer.middleware);
app.use(securityLayer.middleware);

app.get("/health", (_request, response) => {
  response.json({
    gateway: topology.gateway.key,
    status: "ok",
    upstreamCount: topology.gateway.upstreams.length
  });
});

app.get("/architecture", (_request, response) => {
  response.json(topology);
});

app.get("/architecture/ai", (_request, response) => {
  response.json(aiLayer.metadata);
});

app.get("/architecture/realtime", (_request, response) => {
  response.json(realtimeLayer);
});

app.get("/architecture/resilience", (_request, response) => {
  response.json(resilienceLayer.metadata);
});

app.get("/architecture/security", (_request, response) => {
  response.json(securityLayer.metadata);
});

for (const upstream of topology.gateway.upstreams) {
  app.use(upstream.path, async (request, response) => {
    const targetBaseUrl = process.env[buildTargetEnvName(upstream.service)] || upstream.target;
    const targetUrl = new URL(request.originalUrl, targetBaseUrl);

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === "string" && key.toLowerCase() !== "host") {
        headers.set(key, value);
      }
    }

    const canHaveBody = !["GET", "HEAD"].includes(request.method);
    const requestBody = canHaveBody ? JSON.stringify(request.body || {}) : undefined;
    if (canHaveBody && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    try {
      const upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: requestBody
      });

      const responseText = await upstreamResponse.text();
      const contentType = upstreamResponse.headers.get("content-type");
      if (contentType) {
        response.setHeader("content-type", contentType);
      }

      response.status(upstreamResponse.status).send(responseText);
    } catch (error) {
      response.status(502).json({
        gateway: topology.gateway.key,
        upstream: upstream.service,
        error: error.message
      });
    }
  });
}

server.listen(port, () => {
  console.log(`[api-gateway] listening on port ${port}`);
});

function buildTargetEnvName(serviceName) {
  return serviceName.toUpperCase().replace(/-/g, "_") + "_URL";
}
