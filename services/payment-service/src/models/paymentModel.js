import { PAYMENT_STATUSES, DEFAULT_CURRENCY } from '../config/constants.js';
import { generateId } from '../utils/ids.js';
import { nowIso } from '../utils/time.js';

export class PaymentModel {
  constructor({ rideId, userId, amount, currency = DEFAULT_CURRENCY, method, provider = 'internal-mock', idempotencyKey = null }) {
    const timestamp = nowIso();

    this.paymentId = generateId();
    this.rideId = rideId;
    this.userId = userId;
    this.amount = amount;
    this.currency = currency;
    this.method = method;
    this.provider = provider;
    this.status = PAYMENT_STATUSES.PENDING;
    this.providerRef = null;
    this.failureReason = null;
    this.refundReason = null;
    this.retryCount = 0;
    this.retryHistory = [];
    this.confirmedAt = null;
    this.refundedAt = null;
    this.idempotencyKey = idempotencyKey;
    this.createdAt = timestamp;
    this.updatedAt = timestamp;
  }
}
