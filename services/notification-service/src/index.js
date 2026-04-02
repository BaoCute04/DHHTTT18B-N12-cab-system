import { startService } from "../../../platform/node/create-service-app.js";

startService("notification-service").catch((error) => {
  console.error(error);
  process.exit(1);
});
