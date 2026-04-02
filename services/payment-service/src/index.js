import { startService } from "../../../platform/node/create-service-app.js";

startService("payment-service").catch((error) => {
  console.error(error);
  process.exit(1);
});
