import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { connectMongo } from './db/mongoClient.js';

export async function startServer() {
  const { port, mongoUri, mongoDbName, mongoCollectionName } = getEnv();
  const app = createApp();

  await connectMongo();

  app.listen(port, () => {
    console.log(`[payment-service] listening on port ${port}`);
    console.log(`[payment-service] MongoDB connected: ${mongoUri}/${mongoDbName}.${mongoCollectionName}`);
  });
}
