import { startService } from "../../../platform/node/create-service-app.js";
import { disconnectKafkaProducer, initializeKafkaProducer } from "./infra/kafka.js";

<<<<<<< Updated upstream
startService("driver-service").catch((error) => {
  console.error(error);
  process.exit(1);
});
=======
// Load environment variables from .env file
dotenv.config({ path: new URL(".env", import.meta.url).pathname });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cab-booking";
const PORT = process.env.PORT || 3107;

async function initializeService() {
  try {
    // Connect to MongoDB
    console.log(`[driver-service] Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("[driver-service] MongoDB connected successfully");

    try {
      await initializeKafkaProducer({
        brokers: process.env.KAFKA_BROKERS || "kafka:9092"
      });
    } catch (error) {
      console.warn("[driver-service] Kafka producer unavailable, continuing without event publishing:", error.message);
    }

    // Start the service
    process.env.PORT = PORT;
    await startService("driver-service");
  } catch (error) {
    console.error("[driver-service] Initialization failed:", error.message);
    if (error.name === "MongoServerError" || error.name === "MongoNetworkError") {
      console.error("[driver-service] MongoDB connection failed. Make sure MongoDB is running at:", MONGO_URI);
    }
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await disconnectKafkaProducer();
});

process.on("SIGTERM", async () => {
  await disconnectKafkaProducer();
});

initializeService();

>>>>>>> Stashed changes
