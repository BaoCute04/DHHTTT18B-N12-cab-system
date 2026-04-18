import express from "express";
import { bootstrapBroker } from "../../../platform/node/broker.js";
import { getServiceManifest } from "../../../platform/architecture/service-manifests.js";
import { serviceConfig } from "./config.js";
import { requestContextMiddleware } from "./lib/request-context.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createUserRepository } from "./repositories/create-user-repository.js";
import { createUserRoutes } from "./routes/user-routes.js";
import { createUserDomainService } from "./services/user-domain-service.js";

export async function createApp() {
  const manifest = getServiceManifest("user-service");
  const repository = await createUserRepository(serviceConfig);
  const broker = await bootstrapBroker(manifest);
  const userDomainService = createUserDomainService(repository);
  const app = express();

  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use(createUserRoutes({
    broker,
    repository,
    userDomainService
  }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    manifest,
    broker,
    repository
  };
}
