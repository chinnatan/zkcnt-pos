import { createLogger } from "./lib/logger";
import type { WorkerBindings } from "./types/bindings";

const logger = createLogger("cron");

export async function handleScheduled(
  event: ScheduledEvent,
  bindings: WorkerBindings,
): Promise<void> {
  const cron = event.cron;

  if (cron === "0 1 * * *") {
    await backupD1ToR2(bindings);
    return;
  }

  if (cron === "45 1 * * *") {
    await warmHealthCheck(bindings);
  }
}

async function backupD1ToR2(bindings: WorkerBindings): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const key = `backups/d1-${date}.sql`;
    const existing = await bindings.UPLOADS.head(key);
    if (existing) {
      logger.info(`backup skipped — already exists key=${key}`);
      return;
    }

    const dump = await bindings.DB.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    ).all();

    const payload = JSON.stringify({
      exported_at: new Date().toISOString(),
      note: "Metadata export placeholder — use wrangler d1 export for full backup",
      tables: dump.results?.length ?? 0,
    });

    await bindings.UPLOADS.put(key, payload, {
      httpMetadata: { contentType: "application/json" },
    });
    logger.info(`backup marker written key=${key}`);
  } catch (error) {
    logger.error("backup failed", error);
  }
}

async function warmHealthCheck(bindings: WorkerBindings): Promise<void> {
  try {
    await bindings.DB.prepare("SELECT 1").first();
    const appUrl = bindings.APP_URL.replace(/\/$/, "");
    const healthUrl = `${appUrl}/api/health`;
    const response = await fetch(healthUrl, { method: "GET" });
    logger.info(`warm-up health status=${response.status} url=${healthUrl}`);
  } catch (error) {
    logger.warn("warm-up health check failed", error);
  }
}
