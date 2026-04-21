/**
 * Ride Service - Entry Point
 * Main server setup and initialization
 */

require('dotenv').config();

const http = require('http');
const { createApp } = require('./src/app');
const { connectMongo } = require('./src/database/mongoose');

// Create Express app
const app = createApp();

// Create HTTP server
const server = http.createServer(app);

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
  } catch (error) {
    console.warn('[Kafka] Connection skipped or failed:', error.message);
  }

  const port = process.env.PORT || 3109;

  server.listen(port, () => {
    console.log(`\n🚖 Ride Service Started`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Port: ${port}`);
    console.log(`REST API: http://localhost:${port}/api/v1/rides`);
    console.log(`Health: http://localhost:${port}/health`);
    console.log(`Realtime events: Kafka -> notification-service`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });
}

startServer();
