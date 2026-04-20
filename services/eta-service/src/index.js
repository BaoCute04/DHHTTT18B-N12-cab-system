import { createEtaApp } from "./app.js";

createEtaApp().catch((error) => {
  console.error(error);
  process.exit(1);
});