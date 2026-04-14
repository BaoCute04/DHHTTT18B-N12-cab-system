import { sendError } from '../utils/response.js';

export function errorHandler(error, request, response, _next) {
  console.error('[payment-service]', error);

  const statusCode = error.statusCode || 500;
  return sendError(
    response,
    request,
    error.message || 'Internal server error',
    statusCode,
    error.details || null
  );
}
