import { DEFAULT_PORT } from './constants.js';

export function getEnv() {
  return {
    port: Number(process.env.PORT || DEFAULT_PORT),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    mongoDbName: process.env.MONGODB_DB_NAME || 'cab_payment_service',
    mongoCollectionName: process.env.MONGODB_COLLECTION_NAME || 'payments'
  };
}
