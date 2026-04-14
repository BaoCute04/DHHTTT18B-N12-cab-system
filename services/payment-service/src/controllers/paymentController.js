import { confirmPayment, createPayment, getPaymentById, refundPayment } from '../services/paymentService.js';
import { sendError, sendSuccess } from '../utils/response.js';

export function healthCheck(request, response) {
  return sendSuccess(response, request, 'Payment service is healthy', {
    service: 'payment-service',
    status: 'ok'
  });
}

export function architectureInfo(request, response) {
  return sendSuccess(response, request, 'Payment service architecture', {
    service: 'payment-service',
    responsibility: 'Thanh toán, retry, saga pattern giả lập, chống double charge',
    endpoints: [
      'POST /api/v1/payments',
      'GET /api/v1/payments/:paymentId',
      'POST /api/v1/payments/:paymentId/confirm',
      'POST /api/v1/payments/:paymentId/refund'
    ],
    notes: [
      'Dùng MongoDB riêng cho payment-service',
      'Hỗ trợ Idempotency-Key cho create payment',
      'Response public bám đúng mẫu Word/PDF'
    ]
  });
}

export async function createPaymentHandler(request, response, next) {
  try {
    const result = await createPayment(request.body, request.requestMeta?.idempotencyKey || null);
    const message = result.reused ? 'Payment returned from idempotency cache' : 'Payment created';
    const statusCode = result.reused ? 200 : 201;
    return sendSuccess(response, request, message, result.payment, statusCode);
  } catch (error) {
    return next(error);
  }
}

export async function getPaymentHandler(request, response, next) {
  try {
    const payment = await getPaymentById(request.params.paymentId);
    return sendSuccess(response, request, 'Payment fetched', payment);
  } catch (error) {
    return next(error);
  }
}

export async function confirmPaymentHandler(request, response, next) {
  try {
    const payment = await confirmPayment(request.params.paymentId, request.body || {});
    return sendSuccess(response, request, 'Payment confirmed', payment);
  } catch (error) {
    return next(error);
  }
}

export async function refundPaymentHandler(request, response, next) {
  try {
    const payment = await refundPayment(request.params.paymentId, request.body || {});
    return sendSuccess(response, request, 'Payment refunded', payment);
  } catch (error) {
    return next(error);
  }
}

export function routeNotAllowed(request, response) {
  return sendError(response, request, 'Method not allowed', 405);
}
