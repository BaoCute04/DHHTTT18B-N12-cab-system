import { sendError } from '../utils/response.js';

export function errorHandler(error, request, response, _next) {
  console.error('[payment-service] Error:', error);

  if (error?.code === 11000) {
    return sendError(response, request, 'Duplicate idempotency key', 409, {
      keyPattern: error.keyPattern || null,
      keyValue: error.keyValue || null
    });
  }

  const statusCode = error?.statusCode || 500;
  const message = error?.message || 'Internal server error';
  const details = error?.details || null;

  return sendError(response, request, message, statusCode, details);
}
