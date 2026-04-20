/**
 * Kafka Producer Configuration
 * Publishes real-time traffic updates to message broker
 */

const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'ride-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
    multiplier: 2,
    randomizationFactor: 0.2,
  },
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
    mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD,
  } : undefined,
};

const kafka = new Kafka(kafkaConfig);
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});

let producerConnected = false;

// Event listeners
producer.on('producer.connect', () => {
  producerConnected = true;
  logger.info('Kafka producer connected');
});

producer.on('producer.disconnect', () => {
  producerConnected = false;
  logger.warn('Kafka producer disconnected');
});

producer.on('producer.network.request', ({ payload }) => {
  logger.debug('Kafka request:', payload);
});

producer.on('producer.network.request_timeout', (payload) => {
  logger.error('Kafka request timeout:', payload);
});

/**
 * Ensure producer is connected before sending
 */
async function ensureConnected() {
  if (!producerConnected) {
    await producer.connect();
  }
}

/**
 * Send traffic update to Kafka topic
 */
const kafkaProducer = {
  send: async (config) => {
    try {
      await ensureConnected();
      
      const result = await producer.send({
        topic: config.topic || process.env.KAFKA_TOPIC_TRAFFIC_UPDATES || 'traffic-updates',
        messages: config.messages || [],
        timeout: 30000,
        compression: 1, // Gzip compression
      });

      logger.info('Kafka message sent:', {
        topic: config.topic,
        partitions: result,
      });

      return result;
    } catch (error) {
      logger.error('Kafka send error:', error);
      throw error;
    }
  },

  connect: async () => {
    try {
      await producer.connect();
      logger.info('Kafka producer started');
    } catch (error) {
      logger.error('Kafka connect error:', error);
      throw error;
    }
  },

  disconnect: async () => {
    try {
      await producer.disconnect();
      logger.info('Kafka producer disconnected');
    } catch (error) {
      logger.error('Kafka disconnect error:', error);
    }
  },

  isConnected: () => producerConnected,
};

// Auto-connect on module load
kafkaProducer.connect().catch((error) => {
  logger.warn('Failed to connect Kafka on startup:', error.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await kafkaProducer.disconnect();
  process.exit(0);
});

module.exports = kafkaProducer;
