// Minimal event envelope helper
function createEvent({ eventType, producer, payload, version = 'v1', traceId }) {
  return {
    eventId: require('crypto').randomUUID(),
    eventType,
    occurredAt: new Date().toISOString(),
    traceId: traceId || null,
    producer,
    payload,
    version,
  };
}

module.exports = { createEvent };
