import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  clientSessions,
  orders,
  products,
  stores,
  systemMeta,
} from "../db/schema";
import { getSystemMeta, setSystemMeta } from "../lib/system-meta";

export async function getAdminOpsOverview() {
  const [storeRows, backupLastRun, highPendingSessions] = await Promise.all([
    db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        created: stores.created,
      })
      .from(stores)
      .where(eq(stores.isActive, true)),
    getSystemMeta("cron.backup.last_run"),
    db
      .select({
        id: clientSessions.id,
        user: clientSessions.user,
        store: clientSessions.store,
        pendingSyncCount: clientSessions.pendingSyncCount,
        lastSeenAt: clientSessions.lastSeenAt,
      })
      .from(clientSessions)
      .where(sql`${clientSessions.pendingSyncCount} >= 10`)
      .orderBy(sql`${clientSessions.pendingSyncCount} desc`)
      .limit(20),
  ]);

  const onboardingIssues: Array<{
    store_id: string;
    store_name: string;
    slug: string;
    issues: string[];
  }> = [];

  for (const store of storeRows) {
    const [productCount, orderCount] = await Promise.all([
      db
        .select({ count: count() })
        .from(products)
        .where(and(eq(products.store, store.id), eq(products.isActive, true))),
      db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.store, store.id)),
    ]);

    const issues: string[] = [];
    if ((productCount[0]?.count ?? 0) === 0) issues.push("no_products");
    if ((orderCount[0]?.count ?? 0) === 0) issues.push("no_orders");
    if (issues.length > 0) {
      onboardingIssues.push({
        store_id: store.id,
        store_name: store.name,
        slug: store.slug,
        issues,
      });
    }
  }

  const storeIds = [...new Set(highPendingSessions.map((s) => s.store))];
  const storeNames = new Map<string, string>();
  if (storeIds.length > 0) {
    const rows = await db
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(inArray(stores.id, storeIds));
    for (const row of rows) storeNames.set(row.id, row.name);
  }

  return {
    onboarding: onboardingIssues,
    backup_last_run: backupLastRun,
    sync_alerts: highPendingSessions.map((s) => ({
      id: s.id,
      user: s.user,
      store: s.store,
      store_name: storeNames.get(s.store) ?? s.store,
      pending_sync_count: s.pendingSyncCount,
      last_seen_at: s.lastSeenAt,
    })),
  };
}

export async function listPlatformConfigKeys() {
  const rows = await db.select().from(systemMeta);
  return rows.map((row) => ({
    key: row.key,
    value: row.value,
    updated: row.updated,
  }));
}

export async function upsertPlatformConfig(key: string, value: string) {
  await setSystemMeta(key, value);
  return { key, value, updated: new Date().toISOString() };
}
