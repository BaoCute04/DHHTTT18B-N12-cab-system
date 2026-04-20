import dotenv from "dotenv";
import { createEtaTrackingConsumer } from "./consumer.js";
import { loadConsumerConfig } from "./config.js";
import { createLogger } from "./logger.js";

dotenv.config();

const logger = createLogger("ETA-Tracking-Consumer");

async function startConsumer() {
  try {
    logger.info("Starting ETA Tracking Consumer...");
    const config = loadConsumerConfig(process.env);
    
    const consumer = await createEtaTrackingConsumer(config, logger);
    
    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down gracefully...");
      await consumer.disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Termination signal received...");
      await consumer.disconnect();
      process.exit(0);
    });

    logger.info("✅ ETA Tracking Consumer running");
  } catch (error) {
    logger.error("Fatal error:", error);
    process.exit(1);
  }
}

startConsumer();
