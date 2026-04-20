import dotenv from "dotenv";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { createTrafficPublisher } from "./event-publisher.js";
import { startTrackingConsumer } from "./consumer.js";

dotenv.config();

const config = loadConfig();
const publisher = await createTrafficPublisher(config, logger);
const consumer = await startTrackingConsumer({
  config,
  logger,
  eventPublisher: publisher
});

logger.info("ETA tracking consumer started");

async function shutdown() {
  await consumer.disconnect();
  await publisher.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
