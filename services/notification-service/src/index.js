import { loadNotificationEnv } from "./load-env.js";
import { createNotificationApp } from "./app.js";

loadNotificationEnv();

async function main() {
  const runtime = await createNotificationApp();
  const port = Number(process.env.PORT || runtime.manifest.port);

  const server = runtime.app.listen(port, () => {
    console.log(`[${runtime.manifest.key}] listening on port ${port}`);
  });

  async function shutdown() {
    await runtime.close();

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  process.on("SIGINT", async () => {
    await shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await shutdown();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
