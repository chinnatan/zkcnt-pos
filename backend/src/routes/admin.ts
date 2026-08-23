import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logAuditEvent } from "../lib/audit";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import {
  requirePlatformAdmin,
  type PlatformAdminVariables,
} from "../middleware/platform-admin";
import {
  getAdminHealth,
  getAdminOverview,
  getAdminStoreDetail,
  getAdminUserDetail,
  listAdminAudit,
  listAdminStores,
  listAdminUsers,
  listClientSessions,
  updateStoreActive,
  updateStoreFeatureFlags,
  updateUserActive,
} from "../services/admin.service";

type Vars = AuthVariables & PlatformAdminVariables;

export const adminRoutes = new Hono<{ Variables: Vars }>();

adminRoutes.use("*", authMiddleware);
adminRoutes.use("*", requirePlatformAdmin);

adminRoutes.get("/overview", async (c) => {
  const overview = await getAdminOverview();
  return c.json(overview);
});

adminRoutes.get("/stores", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);
  const search = c.req.query("search")?.trim();
  const result = await listAdminStores({ limit, offset, search });
  return c.json(result);
});

adminRoutes.get("/stores/:storeId", async (c) => {
  const detail = await getAdminStoreDetail(c.req.param("storeId"));
  if (!detail) {
    throw new HTTPException(404, { message: "Store not found" });
  }
  return c.json(detail);
});

adminRoutes.patch("/stores/:storeId", async (c) => {
  const storeId = c.req.param("storeId");
  const body = await c.req.json<{
    is_active?: boolean;
    feature_flags?: Record<string, boolean>;
  }>();

  const detail = await getAdminStoreDetail(storeId);
  if (!detail) {
    throw new HTTPException(404, { message: "Store not found" });
  }

  const actorId = c.get("userId");

  if (typeof body.is_active === "boolean") {
    await updateStoreActive(storeId, body.is_active);
    logAuditEvent(c, {
      actor: actorId,
      store: storeId,
      action: body.is_active ? "admin.store_activate" : "admin.store_deactivate",
      entityType: "store",
      entityId: storeId,
      summary: body.is_active
        ? `Platform admin activated store ${detail.store.name}`
        : `Platform admin deactivated store ${detail.store.name}`,
    });
  }

  if (body.feature_flags) {
    await updateStoreFeatureFlags(storeId, body.feature_flags);
    logAuditEvent(c, {
      actor: actorId,
      store: storeId,
      action: "admin.feature_flags_update",
      entityType: "store",
      entityId: storeId,
      summary: `Platform admin updated feature flags for ${detail.store.name}`,
      metadata: { feature_flags: body.feature_flags },
    });
  }

  const updated = await getAdminStoreDetail(storeId);
  return c.json(updated);
});

adminRoutes.get("/users", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);
  const search = c.req.query("search")?.trim();
  const result = await listAdminUsers({ limit, offset, search });
  return c.json(result);
});

adminRoutes.get("/users/:userId", async (c) => {
  const detail = await getAdminUserDetail(c.req.param("userId"));
  if (!detail) {
    throw new HTTPException(404, { message: "User not found" });
  }
  return c.json(detail);
});

adminRoutes.patch("/users/:userId", async (c) => {
  const userId = c.req.param("userId");
  const body = await c.req.json<{ is_active?: boolean }>();

  const detail = await getAdminUserDetail(userId);
  if (!detail) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (typeof body.is_active !== "boolean") {
    throw new HTTPException(400, { message: "is_active required" });
  }

  if (detail.user.is_platform_admin && !body.is_active) {
    throw new HTTPException(400, { message: "Cannot disable platform admin" });
  }

  await updateUserActive(userId, body.is_active);

  logAuditEvent(c, {
    actor: c.get("userId"),
    action: body.is_active ? "admin.user_enable" : "admin.user_disable",
    entityType: "user",
    entityId: userId,
    summary: body.is_active
      ? `Platform admin enabled user ${detail.user.email}`
      : `Platform admin disabled user ${detail.user.email}`,
  });

  const updated = await getAdminUserDetail(userId);
  return c.json(updated);
});

adminRoutes.get("/audit", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);
  const result = await listAdminAudit({
    limit,
    offset,
    since: c.req.query("since"),
    until: c.req.query("until"),
    action: c.req.query("action"),
    store: c.req.query("store"),
    actor: c.req.query("actor"),
  });
  return c.json(result);
});

adminRoutes.get("/audit/export.csv", async (c) => {
  const result = await listAdminAudit({
    limit: 5000,
    offset: 0,
    since: c.req.query("since"),
    until: c.req.query("until"),
    action: c.req.query("action"),
    store: c.req.query("store"),
    actor: c.req.query("actor"),
  });

  const header =
    "created,store,actor_name,action,entity_type,entity_id,summary";
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = result.items.map((e) =>
    [
      escape(e.created),
      escape(e.store ?? ""),
      escape(e.actor_name ?? ""),
      escape(e.action),
      escape(e.entity_type),
      escape(e.entity_id),
      escape(e.summary),
    ].join(","),
  );

  const csv = [header, ...lines].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="platform-audit.csv"',
    },
  });
});

adminRoutes.get("/health", async (c) => {
  const r2Available = !!(c.env as { UPLOADS?: R2Bucket } | undefined)?.UPLOADS;
  const health = await getAdminHealth(r2Available);
  return c.json(health);
});

adminRoutes.get("/devices", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);
  const store = c.req.query("store");
  const result = await listClientSessions({ limit, offset, store });
  return c.json(result);
});
