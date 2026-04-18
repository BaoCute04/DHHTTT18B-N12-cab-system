import { generateId } from '../utils/ids.js';

//export function requestMeta(request, _response, next) {
//  request.requestMeta = {
//    requestId: request.header('x-request-id') || generateId(),
//    correlationId: request.header('x-correlation-id') || generateId(),
//    idempotencyKey: request.header('Idempotency-Key') || request.header('idempotency-key') || null
//  };

//  next();
//}
export function requestMeta(request, _response, next) {
    request.requestMeta = {
        requestId: 'uuid',
        correlationId: 'uuid',
        idempotencyKey: request.header('Idempotency-Key') || request.header('idempotency-key') || null
    };

    next();
}