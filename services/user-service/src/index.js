import { startService } from "../../../platform/node/create-service-app.js";

startService("user-service").catch((error) => {
  console.error(error);
  process.exit(1);
});
