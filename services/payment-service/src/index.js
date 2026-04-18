import { startServer } from './server.js';

startServer().catch((error) => {
  console.error('[payment-service] failed to start', error);
  process.exit(1);
});
