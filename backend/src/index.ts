import { createApp } from "./app";
import { initBunDb } from "./db/client.bun";
import { runMigrate } from "./db/migrate";
import { bunEnv, env, initRuntimeConfig } from "./env.bun";
import { initFilesystemUploads } from "./lib/uploads.bun";
import { log } from "./lib/logger";

initRuntimeConfig({
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  appUrl: (process.env.APP_URL ?? "http://localhost:4000").replace(/\/$/, ""),
  logLevel: env.logLevel,
  allowedOrigin:
    process.env.ALLOWED_ORIGIN ??
    process.env.APP_URL ??
    "http://localhost:4000",
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.RESEND_FROM ?? "",
  },
  uploadsDir: bunEnv.uploadsDir,
});

initBunDb(bunEnv.dbPath);
initFilesystemUploads(bunEnv.uploadsDir);
runMigrate();

const app = createApp();

log.info(`API listening on http://0.0.0.0:${env.port}`);

export default {
  port: env.port,
  fetch: app.fetch,
};
