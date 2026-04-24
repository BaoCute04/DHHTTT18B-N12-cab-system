export function getEnv() {
  const kafkaBrokers = String(process.env.KAFKA_BROKERS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const kafkaEnabled =
    process.env.KAFKA_ENABLED == null
      ? kafkaBrokers.length > 0
      : String(process.env.KAFKA_ENABLED || 'false').toLowerCase() === 'true';

  return {
    port: Number.parseInt(process.env.PORT || '3109', 10),
    serviceName: 'ride-service',
    kafkaEnabled,
    kafkaClientId: process.env.KAFKA_CLIENT_ID || 'ride-service',
    kafkaGroupId: process.env.KAFKA_GROUP_ID || 'ride-service-group',
    kafkaBrokers,
    paymentTopic: process.env.KAFKA_PAYMENT_TOPIC || 'payment-events',
    assignmentTopics: String(process.env.KAFKA_ASSIGNMENT_TOPICS || 'ride.assigned,driver.assigned')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  };
}
