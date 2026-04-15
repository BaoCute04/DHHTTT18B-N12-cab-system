import { MongoClient } from 'mongodb';
import { getEnv } from '../config/env.js';

let client;
let database;
let paymentsCollection;

export async function connectMongo() {
  if (paymentsCollection) {
    return paymentsCollection;
  }

  const { mongoUri, mongoDbName, mongoCollectionName } = getEnv();
  client = new MongoClient(mongoUri);
  await client.connect();

  database = client.db(mongoDbName);
  paymentsCollection = database.collection(mongoCollectionName);

  await paymentsCollection.createIndex({ paymentId: 1 }, { unique: true });
  await paymentsCollection.createIndex({ idempotencyKey: 1 }, {
    unique: true,
    sparse: true
  });

  return paymentsCollection;
}

export function getPaymentsCollection() {
  if (!paymentsCollection) {
    throw new Error('MongoDB is not connected yet');
  }

  return paymentsCollection;
}

export async function closeMongo() {
  if (client) {
    await client.close();
  }

  client = null;
  database = null;
  paymentsCollection = null;
}
