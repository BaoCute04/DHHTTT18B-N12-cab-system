'use strict';

require('dotenv').config();

const { createApp } = require('./app');

const app = createApp();
const port = Number(process.env.PORT || 3110);

const server = app.listen(port, () => {
  console.log(`[eta-service] listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`[eta-service] received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
