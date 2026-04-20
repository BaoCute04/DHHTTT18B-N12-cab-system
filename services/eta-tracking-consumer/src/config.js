export function loadConsumerConfig(env = process.env) {
  return {
    serviceName: "eta-tracking-consumer",
    
    kafka: {
      brokers: (env.KAFKA_BROKERS || "kafka:9092").split(",").map(b => b.trim()),
      groupId: env.KAFKA_CONSUMER_GROUP_ID || "eta-tracking-group",
      topics: {
        driverLocationUpdated: env.KAFKA_TOPIC_DRIVER_LOCATION_UPDATED || "driver.location.updated",
        trafficUpdates: env.KAFKA_TOPIC_TRAFFIC_UPDATES || "traffic.updates"
      },
      consumerConfig: {
        allowAutoTopicCreation: true,
        sessionTimeout: 30000,
        rebalanceTimeout: 60000
      }
    },

    eta: {
      serviceUrl: env.ETA_SERVICE_URL || "http://localhost:3110",
      timeout: 5000,
      internalAuthToken: env.ETA_INTERNAL_AUTH_TOKEN || ""
    },

    auth: {
      authServiceUrl: env.AUTH_SERVICE_URL || "http://localhost:3104",
      jwksUrl: env.AUTH_JWKS_URL || "",
      issuer: env.JWT_ISSUER || "cab-auth-service",
      audience: env.JWT_AUDIENCE || "cab-api",
      clientId: env.SERVICE_CLIENT_ID || "eta-tracking-consumer",
      clientSecret: env.SERVICE_CLIENT_SECRET || ""
    },

    processing: {
      batchSize: Number(env.BATCH_SIZE || 10),
      batchTimeout: Number(env.BATCH_TIMEOUT || 5000),
      maxRetries: Number(env.MAX_RETRIES || 3),
      retryDelayMs: Number(env.RETRY_DELAY_MS || 1000)
    },

    features: {
      enableBiasCorrection: env.ENABLE_BIAS_CORRECTION === "true",
      enableAiPrediction: env.ENABLE_AI_PREDICTION === "true",
      publishTrafficUpdates: env.PUBLISH_TRAFFIC_UPDATES !== "false"
    }
  };
}
