import { ALLOWED_METHODS, PAYMENT_STATUSES } from '../config/constants.js';
import { PaymentModel } from '../models/paymentModel.js';
import { nowIso } from '../utils/time.js';
import { assertUuid } from '../utils/validation.js';
import {
  createPaymentDocument,
  findPaymentById,
  findPaymentByIdempotencyKey,
  updatePaymentDocument
} from '../repositories/paymentRepository.js';

function createHttpError(statusCode, message, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function ensureRequiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(400, `Field '${fieldName}' is required`);
  }
}

function ensurePositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw createHttpError(400, `Field '${fieldName}' must be a positive integer`);
  }
}

function sanitizeMethod(method) {
  const normalized = String(method || '').trim().toLowerCase();

  if (!ALLOWED_METHODS.includes(normalized)) {
    throw createHttpError(400, 'Unsupported payment method', { allowedMethods: ALLOWED_METHODS });
  }

  return normalized;
}

function inferProvider(method) {
  if (method === 'momo' || method === 'vnpay') {
    return `${method}-mock`;
  }

  return 'internal-mock';
}

function formatPayment(payment) {
  return {
    paymentId: payment.paymentId,
    rideId: payment.rideId,
    userId: payment.userId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    providerRef: payment.providerRef,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}

function buildRetryHistory(maxRetries, baseDelayMs, failureReason) {
  const retries = [];

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    retries.push({
      attempt,
      delayMs: baseDelayMs * 2 ** (attempt - 1),
      result: 'FAILED',
      reason: failureReason,
      timestamp: nowIso()
    });
  }

  return retries;
}

export async function createPayment(payload, idempotencyKey = null) {
  ensureRequiredString(payload?.rideId, 'rideId');
  ensureRequiredString(payload?.userId, 'userId');
  ensurePositiveInteger(payload?.amount, 'amount');

  const rideId = assertUuid(payload?.rideId, 'rideId', createHttpError);
  const userId = assertUuid(payload?.userId, 'userId', createHttpError);
  const method = sanitizeMethod(payload?.method);

  if (idempotencyKey) {
    const existing = await findPaymentByIdempotencyKey(idempotencyKey);
    if (existing) {
      return {
        payment: formatPayment(existing),
        reused: true
      };
    }
  }

  const payment = new PaymentModel({
    rideId,
    userId,
    amount: payload.amount,
    currency: payload.currency || 'VND',
    method,
    provider: inferProvider(method),
    idempotencyKey
  });

  await createPaymentDocument(payment);

  return {
    payment: formatPayment(payment),
    reused: false
  };
}

export async function getPaymentById(paymentId) {
  ensureRequiredString(paymentId, 'paymentId');
  const normalizedPaymentId = assertUuid(paymentId, 'paymentId', createHttpError);
  const payment = await findPaymentById(normalizedPaymentId);

  if (!payment) {
    throw createHttpError(404, 'Payment not found');
  }

  return formatPayment(payment);
}

export async function confirmPayment(paymentId, payload = {}) {
  const normalizedPaymentId = assertUuid(paymentId, 'paymentId', createHttpError);
  const payment = await findPaymentById(normalizedPaymentId);

  if (!payment) {
    throw createHttpError(404, 'Payment not found');
  }

  if ([PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.CANCELLED].includes(payment.status)) {
    throw createHttpError(409, `Cannot confirm payment in status '${payment.status}'`);
  }

  const outcome = String(payload.outcome || 'success').trim().toLowerCase();
  const providerRef = payload.providerRef || `MOCK-${payment.method.toUpperCase()}-${Date.now()}`;
  const updates = {
    providerRef,
    updatedAt: nowIso()
  };

  if (outcome === 'success') {
    updates.status = PAYMENT_STATUSES.COMPLETED;
    updates.failureReason = null;
    updates.confirmedAt = nowIso();
    updates.retryCount = payment.retryCount || 0;
    updates.retryHistory = payment.retryHistory || [];
  } else if (outcome === 'failed') {
    updates.status = PAYMENT_STATUSES.FAILED;
    updates.failureReason = payload.failureReason || 'Payment confirmation failed';
  } else if (outcome === 'timeout') {
    const maxRetries = Number.isInteger(payload.maxRetries) && payload.maxRetries > 0 ? payload.maxRetries : 3;
    const baseDelayMs = Number.isInteger(payload.baseDelayMs) && payload.baseDelayMs > 0 ? payload.baseDelayMs : 500;
    const failureReason = payload.failureReason || 'Gateway timeout';

    updates.status = PAYMENT_STATUSES.FAILED;
    updates.retryCount = maxRetries;
    updates.retryHistory = buildRetryHistory(maxRetries, baseDelayMs, failureReason);
    updates.failureReason = failureReason;
  } else {
    throw createHttpError(400, 'Unsupported confirm outcome', {
      allowedOutcomes: ['success', 'failed', 'timeout']
    });
  }

  const updatedPayment = await updatePaymentDocument(normalizedPaymentId, updates);
  return formatPayment(updatedPayment);
}

export async function refundPayment(paymentId, payload = {}) {
  const normalizedPaymentId = assertUuid(paymentId, 'paymentId', createHttpError);
  const payment = await findPaymentById(normalizedPaymentId);

  if (!payment) {
    throw createHttpError(404, 'Payment not found');
  }

  if (payment.status !== PAYMENT_STATUSES.COMPLETED) {
    throw createHttpError(409, 'Only completed payments can be refunded');
  }

  const updates = {
    status: PAYMENT_STATUSES.REFUNDED,
    refundReason: payload.reason || 'Refund requested',
    refundedAt: nowIso(),
    updatedAt: nowIso()
  };

  const updatedPayment = await updatePaymentDocument(normalizedPaymentId, updates);
  return formatPayment(updatedPayment);
}
