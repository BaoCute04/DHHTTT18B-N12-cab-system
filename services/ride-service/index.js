/**
 * Ride Service - Entry Point
 * Main server setup and initialization
 */

require('dotenv').config();

const http = require('http');
const { createApp } = require('./src/app');
const { setupWebSocket } = require('./src/realtime/socket');
const { connectMongo } = require('./src/database/mongoose');

// Create Express app
const app = createApp();

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
const { wss } = setupWebSocket(server);

async function startServer() {
  try {
    await connectMongo();
    console.log('[MongoDB] Connected');
  } catch (error) {
    console.warn('[MongoDB] Connection skipped or failed:', error.message);
  }

  const port = process.env.PORT || 3109;

  server.listen(port, () => {
    console.log(`\n🚖 Ride Service Started`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Port: ${port}`);
    console.log(`REST API: http://localhost:${port}/api/v1/rides`);
    console.log(`Health: http://localhost:${port}/health`);
    console.log(`WebSocket: ws://localhost:${port}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });
}

startServer();
