import { getPaymentsCollection } from '../db/mongoClient.js';

function withoutMongoId(document) {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;
  return rest;
}

export async function createPaymentDocument(payment) {
  const collection = getPaymentsCollection();
  await collection.insertOne(payment);
  return payment;
}

export async function findPaymentById(paymentId) {
  const collection = getPaymentsCollection();
  const payment = await collection.findOne({ paymentId });
  return withoutMongoId(payment);
}

export async function findPaymentByIdempotencyKey(idempotencyKey) {
  const collection = getPaymentsCollection();
  const payment = await collection.findOne({ idempotencyKey });
  return withoutMongoId(payment);
}

export async function updatePaymentDocument(paymentId, updates) {
  const collection = getPaymentsCollection();

  await collection.updateOne(
    { paymentId },
    {
      $set: updates
    }
  );

  return findPaymentById(paymentId);
}
