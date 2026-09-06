import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  sum,
} from "drizzle-orm";
import { db } from "../db/client";
import {
  auditEvents,
  clientSessions,
  customers,
  orders,
  products,
  storeInvites,
  storeMembers,
  stores,
  supportTickets,
  users,
} from "../db/schema";
import { getRuntimeConfig } from "../env";
import { mapAuditEvent, mapStore, mapUser } from "../lib/mappers";
import { getSystemMeta } from "../lib/system-meta";
import { nowIso } from "../lib/timestamps";
import {
  countOpenSupportTickets,
  getStaleOpenTicketCount,
} from "./support.service";

const LOGIN_FAILED_THRESHOLD = 10;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getAdminOverview() {
  const since7d = daysAgoIso(7);
  const since24h = daysAgoIso(1);
  const todayStart = startOfTodayIso();

  const [
    storeStats,
    userStats,
    orderToday,
    order7d,
    loginFailed24h,
    pendingInvites,
    inactiveStores,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        active: sql<number>`sum(case when ${stores.isActive} = 1 then 1 else 0 end)`,
        new7d: sql<number>`sum(case when ${stores.created} >= ${since7d} then 1 else 0 end)`,
      })
      .from(stores),
    db
      .select({
        total: count(),
        new7d: sql<number>`sum(case when ${users.created} >= ${since7d} then 1 else 0 end)`,
      })
      .from(users),
    db
      .select({
        count: count(),
        gmv: sql<number>`coalesce(sum(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.created, todayStart),
          eq(orders.status, "completed"),
        ),
      ),
    db
      .select({
        count: count(),
        gmv: sql<number>`coalesce(sum(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.created, since7d),
          eq(orders.status, "completed"),
        ),
      ),
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
      .from(storeInvites)
      .where(
        and(
          eq(storeInvites.status, "pending"),
          gte(storeInvites.expires, new Date().toISOString()),
          lte(storeInvites.expires, daysAgoIso(-3)),
        ),
      ),
    getInactiveStoreCount(since7d),
  ]);

  const alerts: Array<{ type: string; message: string; severity: "warning" | "info" }> = [];

  const failedCount = loginFailed24h[0]?.count ?? 0;
  if (failedCount >= LOGIN_FAILED_THRESHOLD) {
    alerts.push({
      type: "login_failed_spike",
      message: `Login failures in last 24h: ${failedCount}`,
      severity: "warning",
    });
  }

  const inviteCount = pendingInvites[0]?.count ?? 0;
  if (inviteCount > 0) {
    alerts.push({
      type: "expiring_invites",
      message: `Pending invites expiring soon: ${inviteCount}`,
      severity: "info",
    });
  }

  if (inactiveStores > 0) {
    alerts.push({
      type: "inactive_stores",
      message: `Stores with no orders in 7+ days: ${inactiveStores}`,
      severity: "info",
    });
  }

  const inactiveStoreRows = await db
    .select({ count: count() })
    .from(stores)
    .where(eq(stores.isActive, false));
  const deactivatedCount = inactiveStoreRows[0]?.count ?? 0;
  if (deactivatedCount > 0) {
    alerts.push({
      type: "deactivated_stores",
      message: `Deactivated stores: ${deactivatedCount}`,
      severity: "info",
    });
  }

  const [openTickets, staleTickets] = await Promise.all([
    countOpenSupportTickets(),
    getStaleOpenTicketCount(3),
  ]);
  if (openTickets > 0) {
    alerts.push({
      type: "open_support_tickets",
      message: `Open support tickets: ${openTickets}`,
      severity: "warning",
    });
  }
  if (staleTickets > 0) {
    alerts.push({
      type: "stale_support_tickets",
      message: `Support tickets open 3+ days without update: ${staleTickets}`,
      severity: "warning",
    });
  }

  return {
    stores: {
      total: storeStats[0]?.total ?? 0,
      active: Number(storeStats[0]?.active ?? 0),
      new_7d: Number(storeStats[0]?.new7d ?? 0),
    },
    users: {
      total: userStats[0]?.total ?? 0,
      new_7d: Number(userStats[0]?.new7d ?? 0),
    },
    orders_today: {
      count: orderToday[0]?.count ?? 0,
      gmv: Number(orderToday[0]?.gmv ?? 0),
    },
    orders_7d: {
      count: order7d[0]?.count ?? 0,
      gmv: Number(order7d[0]?.gmv ?? 0),
    },
    inactive_stores_7d: inactiveStores,
    open_support_tickets: openTickets,
    alerts,
  };
}

async function getInactiveStoreCount(since7d: string): Promise<number> {
  const allStores = await db.select({ id: stores.id }).from(stores);
  if (allStores.length === 0) return 0;

  const recentOrders = await db
    .select({ store: orders.store })
    .from(orders)
    .where(gte(orders.created, since7d))
    .groupBy(orders.store);

  const activeStoreIds = new Set(recentOrders.map((r) => r.store));
  return allStores.filter((s) => !activeStoreIds.has(s.id)).length;
}

export async function listAdminStores(options: {
  limit: number;
  offset: number;
  search?: string;
}) {
  const { limit, offset, search } = options;

  const storeRows = await db
    .select()
    .from(stores)
    .orderBy(desc(stores.created))
    .limit(500);

  const ownerIds = [...new Set(storeRows.map((s) => s.owner))];
  const ownerMap = new Map<string, string>();
  if (ownerIds.length > 0) {
    const ownerRows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.id, ownerIds));
    for (const o of ownerRows) {
      ownerMap.set(o.id, o.email);
    }
  }

  const memberCounts = await db
    .select({ store: storeMembers.store, count: count() })
    .from(storeMembers)
    .where(eq(storeMembers.isActive, true))
    .groupBy(storeMembers.store);

  const memberCountMap = new Map(
    memberCounts.map((m) => [m.store, m.count]),
  );

  const lastOrders = await db
    .select({
      store: orders.store,
      lastOrder: sql<string>`max(${orders.created})`,
    })
    .from(orders)
    .groupBy(orders.store);

  const lastOrderMap = new Map(
    lastOrders.map((o) => [o.store, o.lastOrder]),
  );

  let items = storeRows.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    owner_email: ownerMap.get(s.owner) ?? "",
    member_count: memberCountMap.get(s.id) ?? 0,
    last_order_at: lastOrderMap.get(s.id) ?? null,
    is_active: s.isActive,
    created: s.created,
  }));

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.owner_email.toLowerCase().includes(q),
    );
  }

  const totalItems = items.length;
  items = items.slice(offset, offset + limit);

  return { items, totalItems };
}

export async function getAdminStoreDetail(storeId: string) {
  const storeRows = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  const storeRow = storeRows[0];
  if (!storeRow) return null;

  const ownerRows = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, storeRow.owner))
    .limit(1);

  const members = await db
    .select({
      id: storeMembers.id,
      user: storeMembers.user,
      role: storeMembers.role,
      isActive: storeMembers.isActive,
      name: users.name,
      email: users.email,
    })
    .from(storeMembers)
    .innerJoin(users, eq(storeMembers.user, users.id))
    .where(eq(storeMembers.store, storeId));

  const [orderStats, productStats, customerStats, recentAudit] =
    await Promise.all([
      db
        .select({ count: count(), gmv: sum(orders.total) })
        .from(orders)
        .where(
          and(eq(orders.store, storeId), eq(orders.status, "completed")),
        ),
      db
        .select({ count: count() })
        .from(products)
        .where(eq(products.store, storeId)),
      db
        .select({ count: count() })
        .from(customers)
        .where(eq(customers.store, storeId)),
      db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.store, storeId))
        .orderBy(desc(auditEvents.created))
        .limit(20),
    ]);

  const settings = storeRow.settings as Record<string, unknown>;
  const featureFlags =
    (settings.feature_flags as Record<string, boolean> | undefined) ?? {};

  return {
    store: mapStore(storeRow),
    owner: ownerRows[0] ?? null,
    members: members.map((m) => ({
      id: m.id,
      user: m.user,
      role: m.role,
      is_active: m.isActive,
      name: m.name,
      email: m.email,
    })),
    stats: {
      orders: orderStats[0]?.count ?? 0,
      gmv: Number(orderStats[0]?.gmv ?? 0),
      products: productStats[0]?.count ?? 0,
      customers: customerStats[0]?.count ?? 0,
    },
    feature_flags: featureFlags,
    recent_audit: await enrichAuditRows(recentAudit),
  };
}

export async function listAdminUsers(options: {
  limit: number;
  offset: number;
  search?: string;
}) {
  const { limit, offset, search } = options;

  const userRows = await db.select().from(users).orderBy(desc(users.created));

  const membershipCounts = await db
    .select({ user: storeMembers.user, count: count() })
    .from(storeMembers)
    .where(eq(storeMembers.isActive, true))
    .groupBy(storeMembers.user);

  const membershipMap = new Map(
    membershipCounts.map((m) => [m.user, m.count]),
  );

  let items = userRows.map((u) => ({
    ...mapUser(u),
    store_count: membershipMap.get(u.id) ?? 0,
  }));

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }

  const totalItems = items.length;
  items = items.slice(offset, offset + limit);

  return { items, totalItems };
}

export async function getAdminUserDetail(userId: string) {
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const userRow = userRows[0];
  if (!userRow) return null;

  const memberships = await db
    .select({
      id: storeMembers.id,
      store: storeMembers.store,
      role: storeMembers.role,
      isActive: storeMembers.isActive,
      storeName: stores.name,
    })
    .from(storeMembers)
    .innerJoin(stores, eq(storeMembers.store, stores.id))
    .where(eq(storeMembers.user, userId));

  const authEvents = await db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.actor, userId),
        inArray(auditEvents.action, [
          "auth.login",
          "auth.login_failed",
          "auth.register",
          "auth.password_reset_requested",
          "auth.password_reset_completed",
        ]),
      ),
    )
    .orderBy(desc(auditEvents.created))
    .limit(50);

  return {
    user: mapUser(userRow),
    memberships: memberships.map((m) => ({
      id: m.id,
      store: m.store,
      store_name: m.storeName,
      role: m.role,
      is_active: m.isActive,
    })),
    auth_events: await enrichAuditRows(authEvents),
  };
}

async function enrichAuditRows(rows: (typeof auditEvents.$inferSelect)[]) {
  const actorIds = [...new Set(rows.map((r) => r.actor).filter(Boolean))] as string[];
  const nameMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, actorIds));
    for (const u of userRows) {
      nameMap.set(u.id, u.name);
    }
  }
  return rows.map((row) =>
    mapAuditEvent({
      ...row,
      actorName: row.actor ? nameMap.get(row.actor) ?? null : null,
    }),
  );
}

export async function listAdminAudit(options: {
  limit: number;
  offset: number;
  since?: string;
  until?: string;
  action?: string;
  store?: string;
  actor?: string;
}) {
  const conditions = [];
  if (options.since) conditions.push(gte(auditEvents.created, options.since));
  if (options.until) conditions.push(lte(auditEvents.created, options.until));
  if (options.action) conditions.push(eq(auditEvents.action, options.action));
  if (options.store) conditions.push(eq(auditEvents.store, options.store));
  if (options.actor) conditions.push(eq(auditEvents.actor, options.actor));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(auditEvents)
      .where(where)
      .orderBy(desc(auditEvents.created))
      .limit(options.limit)
      .offset(options.offset),
    db.select({ count: count() }).from(auditEvents).where(where),
  ]);

  return {
    items: await enrichAuditRows(rows),
    totalItems: totalResult[0]?.count ?? 0,
  };
}

export async function getAdminHealth(_r2Available: boolean) {
  const start = Date.now();
  await db.select({ one: sql<number>`1` }).from(users).limit(1);
  const dbLatencyMs = Date.now() - start;

  const countTables = [
    ["users", users],
    ["stores", stores],
    ["store_members", storeMembers],
    ["orders", orders],
    ["products", products],
    ["audit_events", auditEvents],
    ["client_sessions", clientSessions],
    ["support_tickets", supportTickets],
  ] as const;

  const rowCounts: Record<string, number> = {};
  for (const [name, table] of countTables) {
    const result = await db.select({ count: count() }).from(table);
    rowCounts[name] = result[0]?.count ?? 0;
  }

  const { appVersion, buildId } = getRuntimeConfig();

  const [cronBackup, cronHealth, dailyMetrics, lastAlert] = await Promise.all([
    getSystemMeta("cron.backup.last_run"),
    getSystemMeta("cron.health_warmup.last_run"),
    getSystemMeta("metrics.daily"),
    getSystemMeta("alert.login_failed.last_sent"),
  ]);

  return {
    status: "ok",
    version: appVersion,
    build: buildId,
    db: {
      connected: true,
      latency_ms: dbLatencyMs,
      row_counts: rowCounts,
    },
    r2: {
      available: _r2Available,
    },
    cron: {
      backup_last_run: cronBackup,
      health_warmup_last_run: cronHealth,
    },
    metrics: dailyMetrics ? JSON.parse(dailyMetrics) : null,
    alerts: {
      login_failed_last_sent: lastAlert,
    },
  };
}

export async function listClientSessions(options: {
  limit: number;
  offset: number;
  store?: string;
}) {
  const conditions = [];
  if (options.store) {
    conditions.push(eq(clientSessions.store, options.store));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        session: clientSessions,
        userName: users.name,
        userEmail: users.email,
        storeName: stores.name,
      })
      .from(clientSessions)
      .innerJoin(users, eq(clientSessions.user, users.id))
      .innerJoin(stores, eq(clientSessions.store, stores.id))
      .where(where)
      .orderBy(desc(clientSessions.lastSeenAt))
      .limit(options.limit)
      .offset(options.offset),
    db.select({ count: count() }).from(clientSessions).where(where),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.session.id,
      user: r.session.user,
      user_name: r.userName,
      user_email: r.userEmail,
      store: r.session.store,
      store_name: r.storeName,
      client_version: r.session.clientVersion,
      client_build: r.session.clientBuild,
      pending_sync_count: r.session.pendingSyncCount,
      last_sync_at: r.session.lastSyncAt,
      last_seen_at: r.session.lastSeenAt,
      user_agent: r.session.userAgent,
      platform: r.session.platform,
    })),
    totalItems: totalResult[0]?.count ?? 0,
  };
}

export async function updateStoreActive(
  storeId: string,
  isActive: boolean,
) {
  const now = nowIso();
  await db
    .update(stores)
    .set({ isActive, updated: now })
    .where(eq(stores.id, storeId));
}

export async function updateUserActive(userId: string, isActive: boolean) {
  const now = nowIso();
  await db
    .update(users)
    .set({ isActive, updated: now })
    .where(eq(users.id, userId));
}

export async function updateStoreFeatureFlags(
  storeId: string,
  featureFlags: Record<string, boolean>,
) {
  const storeRows = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  const storeRow = storeRows[0];
  if (!storeRow) return null;

  const settings = {
    ...(storeRow.settings as Record<string, unknown>),
    feature_flags: featureFlags,
  };
  const now = nowIso();
  await db
    .update(stores)
    .set({ settings, updated: now })
    .where(eq(stores.id, storeId));

  return settings;
}
