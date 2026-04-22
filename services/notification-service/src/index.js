import { createNotificationApp } from "./app.js";
import { loadNotificationEnv } from "./load-env.js";
import { startRealtimeRelay } from "./realtime-relay.js";

loadNotificationEnv();

const runtime = await createNotificationApp({
  logger: console
});

const port = Number.parseInt(process.env.PORT || "3108", 10);
const server = runtime.app.listen(port, () => {
  console.log(`[notification-service] listening on port ${port}`);
});

let realtimeRelay = await startRealtimeRelay({
  logger: console
}).catch((error) => {
  console.error("[notification-service] failed to start realtime relay", error);
  return null;
});

async function shutdown(signal) {
  console.log(`[notification-service] received ${signal}, shutting down...`);

  if (realtimeRelay) {
    await realtimeRelay.close();
  }

  await runtime.close();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
