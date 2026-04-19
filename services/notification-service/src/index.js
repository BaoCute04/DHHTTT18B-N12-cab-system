import express from 'express';
import { getEnv } from './config/env.js';
import { listNotifications } from './store/notificationStore.js';
import { startNotificationConsumer, stopNotificationConsumer } from './events/paymentConsumer.js';

const env = getEnv();
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Notification service is healthy',
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
    message: 'Notification service choreography role',
    data: {
      service: env.serviceName,
      responsibility: 'Consume payment events and create user-facing notifications for choreography flow 9.5/9.5.1',
      consumedTopics: [
        'payment.completed',
        'payment.failed',
        'payment.refunded',
        'notification.payment.completed',
        'notification.payment.failed',
        'notification.payment.refunded'
      ]
    }
  });
});

app.get('/api/v1/notifications', (req, res) => {
  const userId = req.query.userId || null;
  res.json({ success: true, message: 'Notifications fetched', data: listNotifications(userId) });
});

const server = app.listen(env.port, async () => {
  console.log(`[notification-service] listening on port ${env.port}`);
  try {
    await startNotificationConsumer(env);
  } catch (error) {
    console.error('[notification-service] failed to start payment consumer', error);
  }
});

async function shutdown(signal) {
  console.log(`[notification-service] received ${signal}, shutting down...`);
  await stopNotificationConsumer();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
