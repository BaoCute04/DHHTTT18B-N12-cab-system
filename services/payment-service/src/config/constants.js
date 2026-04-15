export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
};

export const ALLOWED_METHODS = ['cash', 'card', 'wallet', 'momo', 'vnpay'];
export const DEFAULT_CURRENCY = 'VND';
export const SERVICE_NAME = 'payment-service';
export const DEFAULT_PORT = 3102;
