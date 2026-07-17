import { createApp } from "./app";
import { createDbFromD1, initDb } from "./db/client";
import { initRuntimeConfigFromWorker } from "./env";
import { initR2Uploads } from "./lib/uploads";
import { handleScheduled } from "./cron";
import type { WorkerBindings } from "./types/bindings";

const app = createApp();

export default {
  async fetch(
    request: Request,
    bindings: WorkerBindings,
    ctx: ExecutionContext,
  ): Promise<Response> {
    initRuntimeConfigFromWorker(bindings);
    initDb(createDbFromD1(bindings.DB), "d1");
    initR2Uploads(bindings.UPLOADS);
    return app.fetch(request, bindings, ctx);
  },

  async scheduled(
    event: ScheduledEvent,
    bindings: WorkerBindings,
    ctx: ExecutionContext,
  ): Promise<void> {
    initRuntimeConfigFromWorker(bindings);
    initDb(createDbFromD1(bindings.DB), "d1");
    initR2Uploads(bindings.UPLOADS);
    ctx.waitUntil(handleScheduled(event, bindings));
  },
};
