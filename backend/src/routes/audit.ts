import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client";
import { auditEvents, orders, users } from "../db/schema";
import { mapAuditEvent } from "../lib/mappers";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  requireStoreManager,
  type StoreAccessVariables,
} from "../middleware/store-access";

type Vars = AuthVariables & StoreAccessVariables;

export const auditRoutes = new Hono<{ Variables: Vars }>();

function buildAuditFilters(
  storeId: string,
  query: Record<string, string | undefined>,
) {
  const conditions = [eq(auditEvents.store, storeId)];

  if (query.since) {
    conditions.push(gte(auditEvents.created, query.since));
  }
  if (query.until) {
    conditions.push(lte(auditEvents.created, query.until));
  }
  if (query.action) {
    conditions.push(eq(auditEvents.action, query.action));
  }
  if (query.entity_type) {
    conditions.push(eq(auditEvents.entityType, query.entity_type));
  }
  if (query.entity_id) {
    conditions.push(eq(auditEvents.entityId, query.entity_id));
  }
  if (query.actor) {
    conditions.push(eq(auditEvents.actor, query.actor));
  }

  return and(...conditions);
}

async function enrichWithActorNames(
  rows: (typeof auditEvents.$inferSelect)[],
) {
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

auditRoutes.get(
  "/:storeId/audit-events/reconciliation",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const since =
      c.req.query("since") ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const until = c.req.query("until") ?? new Date().toISOString();

    const periodFilter = and(
      eq(orders.store, storeId),
      gte(orders.created, since),
      lte(orders.created, until),
    );

    const [completedRows, voidedRows, refundedRows, auditRows] =
      await Promise.all([
        db
          .select()
          .from(orders)
          .where(and(periodFilter, eq(orders.status, "completed"))),
        db
          .select()
          .from(orders)
          .where(and(periodFilter, eq(orders.status, "voided"))),
        db
          .select()
          .from(orders)
          .where(and(periodFilter, eq(orders.status, "refunded"))),
        db
          .select()
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.store, storeId),
              eq(auditEvents.action, "order.create"),
              gte(auditEvents.created, since),
              lte(auditEvents.created, until),
            ),
          ),
      ]);

    const ordersTotal = completedRows.reduce((s, o) => s + o.total, 0);
    const auditTotal = auditRows.reduce((s, a) => {
      const meta = a.metadata as Record<string, unknown>;
      return s + Number(meta.total ?? 0);
    }, 0);

    const match =
      completedRows.length === auditRows.length &&
      Math.abs(ordersTotal - auditTotal) < 0.01;

    return c.json({
      period: { since, until },
      orders: { count: completedRows.length, total: ordersTotal },
      audit_order_create: { count: auditRows.length, total: auditTotal },
      match,
      voided: {
        count: voidedRows.length,
        total: voidedRows.reduce((s, o) => s + o.total, 0),
      },
      refunded: {
        count: refundedRows.length,
        total: refundedRows.reduce((s, o) => s + o.total, 0),
      },
    });
  },
);

auditRoutes.get(
  "/:storeId/audit-events/export.csv",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const query = {
      since: c.req.query("since"),
      until: c.req.query("until"),
      action: c.req.query("action"),
      entity_type: c.req.query("entity_type"),
      entity_id: c.req.query("entity_id"),
      actor: c.req.query("actor"),
    };

    const rows = await db
      .select()
      .from(auditEvents)
      .where(buildAuditFilters(storeId, query)!)
      .orderBy(desc(auditEvents.created))
      .limit(5000);

    const enriched = await enrichWithActorNames(rows);

    const header =
      "created,actor_name,action,entity_type,entity_id,summary,changes,request_id,client_id";
    const lines = enriched.map((e) => {
      const meta = e.metadata as Record<string, unknown>;
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      return [
        escape(e.created),
        escape(e.actor_name ?? ""),
        escape(e.action),
        escape(e.entity_type),
        escape(e.entity_id),
        escape(e.summary),
        escape(JSON.stringify(e.changes)),
        escape(String(meta.request_id ?? "")),
        escape(String(meta.client_id ?? "")),
      ].join(",");
    });

    const csv = [header, ...lines].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-${storeId}.csv"`,
      },
    });
  },
);

auditRoutes.get(
  "/:storeId/audit-events",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
    const offset = Number(c.req.query("offset") ?? 0);
    const query = {
      since: c.req.query("since"),
      until: c.req.query("until"),
      action: c.req.query("action"),
      entity_type: c.req.query("entity_type"),
      entity_id: c.req.query("entity_id"),
      actor: c.req.query("actor"),
    };

    const where = buildAuditFilters(storeId, query);

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(auditEvents)
        .where(where)
        .orderBy(desc(auditEvents.created))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(auditEvents)
        .where(where),
    ]);

    const items = await enrichWithActorNames(rows);

    return c.json({
      items,
      totalItems: totalResult[0]?.count ?? 0,
    });
  },
);
