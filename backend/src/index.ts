import { createApp } from "./app";
import { initBunDb } from "./db/client.bun";
import { runMigrate } from "./db/migrate";
import { initRuntimeConfig } from "./env";
import { bunEnv, createBunRuntimeConfig, env } from "./env.bun";
import { initFilesystemUploads } from "./lib/uploads.bun";
import { log } from "./lib/logger";

initRuntimeConfig(createBunRuntimeConfig());

initBunDb(bunEnv.dbPath);
initFilesystemUploads(bunEnv.uploadsDir);
runMigrate();

const app = createApp();

log.info(`API listening on http://0.0.0.0:${env.port}`);

export default {
  port: env.port,
  fetch: app.fetch,
};
