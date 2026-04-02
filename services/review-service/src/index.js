import { startService } from "../../../platform/node/create-service-app.js";

startService("review-service").catch((error) => {
  console.error(error);
  process.exit(1);
});
