import { createApp } from "./app.js";
import { serviceConfig } from "./config.js";

createApp().then(({ app, manifest }) => {
  app.listen(serviceConfig.port, () => {
    console.log(`[${manifest.key}] listening on port ${serviceConfig.port}`);
  });
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
