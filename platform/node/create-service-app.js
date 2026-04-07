import { getAiProfileForService } from "../architecture/ai-topology.js";
import express from "express";
import { brokerTopology } from "../architecture/event-contracts.js";
import { getRealtimeFlowsForService } from "../architecture/realtime-topology.js";
import { getResilienceProfileForService } from "../architecture/resilience-topology.js";
import { getSecurityProfileForService } from "../architecture/security-topology.js";
import { getServiceManifest } from "../architecture/service-manifests.js";
import { bootstrapBroker } from "./broker.js";

export async function startService(serviceKey, configureApp) {
  const manifest = getServiceManifest(serviceKey);

  if (!manifest) {
    throw new Error(`Unknown service manifest: ${serviceKey}`);
  }

  const app = express();
  const broker = await bootstrapBroker(manifest);
  const port = Number(process.env.PORT || manifest.port);
  const aiProfile = getAiProfileForService(manifest.key);
  const realtimeFlows = getRealtimeFlowsForService(manifest.key);
  const resilienceProfile = getResilienceProfileForService(manifest.key);
  const securityProfile = getSecurityProfileForService(manifest.key);

  app.use(express.json());

  if (typeof configureApp === 'function') {
    await configureApp(app, broker);
  }
  app.get("/health", (_request, response) => {
    response.json({
      service: manifest.key,
      status: "ok",
      port,
      brokerConnected: broker.connected
    });
  });

  app.get("/architecture", (_request, response) => {
    response.json({
      ...manifest,
      broker: {
        provider: brokerTopology.provider,
        brokersEnv: brokerTopology.brokersEnv,
        connected: broker.connected,
        mode: broker.mode,
        supportedEvents: broker.supportedEvents
      },
      aiProfile,
      realtimeFlows,
      resilienceProfile,
      securityProfile
    });
  });

  app.get(manifest.gatewayPath, (_request, response) => {
    response.json({
      service: manifest.key,
      displayName: manifest.displayName,
      gatewayPath: manifest.gatewayPath,
      protocols: manifest.protocols,
      dataStores: manifest.dataStores,
      producesEvents: manifest.publishes,
      consumesEvents: manifest.consumes,
      aiProfile,
      realtimeFlows,
      resilienceProfile,
      securityProfile,
      scope: "architecture-only"
    });
  });

  app.get(`${manifest.gatewayPath}/health`, (_request, response) => {
    response.json({
      service: manifest.key,
      message: `${manifest.displayName} is reachable through the overall architecture`
    });
  });


  // Bất kỳ route nào không khớp ở trên hoặc trong configureApp sẽ rơi vào 404
  app.use((_request, response) => {
    response.status(404).json({
      service: manifest.key,
      error: "Route not found"
    });
  });

  app.listen(port, () => {
    console.log(`[${manifest.key}] listening on port ${port}`);
  });
}
