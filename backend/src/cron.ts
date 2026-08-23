import { and, count, eq, gte } from "drizzle-orm";
import { createDbFromD1, initDb } from "./db/client";
import { auditEvents } from "./db/schema";
import { sendAdminAlertEmail } from "./lib/email";
import { createLogger } from "./lib/logger";
import { getSystemMeta, setSystemMeta, setSystemMetaJson } from "./lib/system-meta";
import type { WorkerBindings } from "./types/bindings";

const logger = createLogger("cron");

const LOGIN_FAILED_ALERT_THRESHOLD = 10;
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function handleScheduled(
  event: ScheduledEvent,
  bindings: WorkerBindings,
): Promise<void> {
  initDb(createDbFromD1(bindings.DB), "d1");

  const cron = event.cron;

  if (cron === "0 1 * * *") {
    await backupD1ToR2(bindings);
    await recordDailyMetrics();
    return;
  }

  if (cron === "45 1 * * *") {
    await warmHealthCheck(bindings);
    await checkLoginFailedAlert(bindings);
  }
}

async function backupD1ToR2(bindings: WorkerBindings): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const key = `backups/d1-${date}.sql`;
    const existing = await bindings.UPLOADS.head(key);
    if (existing) {
      logger.info(`backup skipped — already exists key=${key}`);
      await setSystemMeta("cron.backup.last_run", new Date().toISOString());
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
    await setSystemMeta("cron.backup.last_run", new Date().toISOString());
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
    await setSystemMeta("cron.health_warmup.last_run", new Date().toISOString());
    logger.info(`warm-up health status=${response.status} url=${healthUrl}`);
  } catch (error) {
    logger.warn("warm-up health check failed", error);
  }
}

async function recordDailyMetrics(): Promise<void> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { db } = await import("./db/client");

  const [loginFailed, loginSuccess, registrations] = await Promise.all([
    db
      .select({ count: count() })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, "auth.login_failed"),
          gte(auditEvents.created, since24h),
        ),
      ),
    db
      .select({ count: count() })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, "auth.login"),
          gte(auditEvents.created, since24h),
        ),
      ),
    db
      .select({ count: count() })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, "auth.register"),
          gte(auditEvents.created, since24h),
        ),
      ),
  ]);

  await setSystemMetaJson("metrics.daily", {
    recorded_at: new Date().toISOString(),
    period_hours: 24,
    login_failed: loginFailed[0]?.count ?? 0,
    login_success: loginSuccess[0]?.count ?? 0,
    registrations: registrations[0]?.count ?? 0,
  });
}

async function checkLoginFailedAlert(bindings: WorkerBindings): Promise<void> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { db } = await import("./db/client");

  const failed = await db
    .select({ count: count() })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "auth.login_failed"),
        gte(auditEvents.created, since24h),
      ),
    );

  const failedCount = failed[0]?.count ?? 0;
  if (failedCount < LOGIN_FAILED_ALERT_THRESHOLD) {
    return;
  }

  const lastSent = await getSystemMeta("alert.login_failed.last_sent");
  if (lastSent) {
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed < ALERT_COOLDOWN_MS) {
      return;
    }
  }

  const adminEmail = bindings.PLATFORM_ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    logger.warn(
      `login failed spike (${failedCount}) — PLATFORM_ADMIN_EMAIL not configured`,
    );
    return;
  }

  try {
    await sendAdminAlertEmail(
      adminEmail,
      "Login failure spike detected",
      `<p>There were <strong>${failedCount}</strong> failed login attempts in the last 24 hours on zKCNT POS.</p>`,
    );
    await setSystemMeta("alert.login_failed.last_sent", new Date().toISOString());
    logger.info(`login failed alert sent to=${adminEmail} count=${failedCount}`);
  } catch (error) {
    logger.error("login failed alert email failed", error);
  }
}
