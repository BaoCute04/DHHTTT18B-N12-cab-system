/**
 * Ride Service - Entry Point
 * Main server setup and initialization
 */

require('dotenv').config();

const { startServiceServers } = require('../../platform/node/start-servers.cjs');
const { createApp } = require('./src/app');
const { connectMongo } = require('./src/database/mongoose');

// Create Express app
const app = createApp();
let runtime = null;

async function startServer() {
  try {
    await connectMongo();
    console.log('[MongoDB] Connected');
  } catch (error) {
    console.warn('[MongoDB] Connection skipped or failed:', error.message);
  }

  try {
    const messageBroker = require('./src/utils/messageBroker');
    await messageBroker.connect();

    // START KAFKA CONSUMERS (Phase 1 & 3)
    try {
      const { getEnv } = require('./src/config/env.js');
      const { startPaymentConsumer } = require('./src/events/paymentConsumer.js');
      const { startBookingConsumer } = require('./src/events/bookingConsumer.js');
      const { startAssignmentConsumer } = require('./src/events/assignmentConsumer.js');
      const env = getEnv();
      await startPaymentConsumer(env);
      await startBookingConsumer(env);
      await startAssignmentConsumer(env);
      console.log('[Kafka] All consumers (Payment, Booking, Assignment) started');
    } catch (consumerError) {
      console.warn('[Kafka] Consumers failed to start:', consumerError.message);
    }
  } catch (error) {
    console.warn('[Kafka] Connection skipped or failed:', error.message);
  }

  const port = Number(process.env.PORT || 3109);
  runtime = await startServiceServers({
    app,
    env: process.env,
    publicPort: port,
    serviceName: 'ride-service',
    logger: console,
  });

  console.log(`\n🚖 Ride Service Started`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Port: ${port}`);
  console.log(`REST API: http://localhost:${port}/api/v1/rides`);
  console.log(`Health: http://localhost:${port}/health`);
  if (runtime.internalPort) {
    console.log(`Internal mTLS: https://ride-service:${runtime.internalPort}`);
  }
  console.log(`Realtime events: Kafka -> notification-service`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

async function shutdown(signal) {
  console.log(`[ride-service] received ${signal}, shutting down...`);
  if (runtime) {
    await runtime.close();
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((error) => {
  console.error('[ride-service] startup failed', error);
  process.exit(1);
});
