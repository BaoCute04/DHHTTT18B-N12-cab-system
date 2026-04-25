import express from 'express';
import { getEnv } from './config/env.js';
import { getRideProjection, listRideProjections } from './store/rideProjectionStore.js';
import { startPaymentConsumer, stopPaymentConsumer } from './events/paymentConsumer.js';

const env = getEnv();
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Ride service is healthy',
    data: {
      service: env.serviceName,
      kafkaEnabled: env.kafkaEnabled,
      paymentTopic: env.paymentTopic
    }
  });
});

app.get('/architecture', (_req, res) => {
  res.json({
    success: true,
    message: 'Ride service choreography role',
    data: {
      service: env.serviceName,
      responsibility: 'Consume payment events and update ride projection for choreography flow 9.5/9.5.1',
      consumedTopics: [
        'payment.completed',
        'payment.failed',
        'payment.refunded',
        'ride.payment.completed',
        'ride.payment.failed',
        'ride.payment.refunded'
      ]
    }
  });
});

app.get('/api/v1/rides', (_req, res) => {
  res.json({ success: true, message: 'Ride projections fetched', data: listRideProjections() });
});

app.get('/api/v1/rides/:rideId', (req, res) => {
  const ride = getRideProjection(req.params.rideId);
  if (!ride) {
    return res.status(404).json({ success: false, message: 'Ride projection not found', data: null });
  }
  return res.json({ success: true, message: 'Ride projection fetched', data: ride });
});

const server = app.listen(env.port, async () => {
  console.log(`[ride-service] listening on port ${env.port}`);
  try {
    await startPaymentConsumer(env);
  } catch (error) {
    console.error('[ride-service] failed to start payment consumer', error);
  }
});

async function shutdown(signal) {
  console.log(`[ride-service] received ${signal}, shutting down...`);
  await stopPaymentConsumer();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
