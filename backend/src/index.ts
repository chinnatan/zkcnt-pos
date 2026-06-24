import { runMigrate } from "./db/migrate";
import { createApp } from "./app";
import { env } from "./env";
import { log } from "./lib/logger";

runMigrate();

const app = createApp();

log.info(`API listening on http://0.0.0.0:${env.port}`);

export default {
  port: env.port,
  fetch: app.fetch,
};
