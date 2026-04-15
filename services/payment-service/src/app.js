import express from 'express';
import paymentRoutes from './routes/paymentRoutes.js';
import { requestMeta } from './middlewares/requestMeta.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { architectureInfo, healthCheck } from './controllers/paymentController.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(requestMeta);

  app.get('/health', healthCheck);
  app.get('/architecture', architectureInfo);
  app.use('/api/v1/payments', paymentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
