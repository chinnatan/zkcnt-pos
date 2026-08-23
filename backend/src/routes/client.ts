import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { clientSessions, storeMembers } from "../db/schema";
import { generateId } from "../lib/id";
import { nowIso } from "../lib/timestamps";
import { authMiddleware, type AuthVariables } from "../middleware/auth";

export const clientRoutes = new Hono<{ Variables: AuthVariables }>();

clientRoutes.post("/heartbeat", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    store?: string;
    client_version?: string;
    client_build?: string;
    pending_sync_count?: number;
    last_sync_at?: string | null;
    user_agent?: string;
    platform?: string;
  }>();

  const storeId = body.store?.trim();
  if (!storeId) {
    throw new HTTPException(400, { message: "store required" });
  }

  const membership = await db
    .select({ id: storeMembers.id })
    .from(storeMembers)
    .where(
      and(
        eq(storeMembers.store, storeId),
        eq(storeMembers.user, userId),
        eq(storeMembers.isActive, true),
      ),
    )
    .limit(1);

  if (!membership[0]) {
    throw new HTTPException(403, { message: "Not a store member" });
  }

  const now = nowIso();
  const existing = await db
    .select({ id: clientSessions.id })
    .from(clientSessions)
    .where(
      and(eq(clientSessions.user, userId), eq(clientSessions.store, storeId)),
    )
    .limit(1);

  const payload = {
    clientVersion: body.client_version ?? "",
    clientBuild: body.client_build ?? "",
    pendingSyncCount: Math.max(0, Number(body.pending_sync_count ?? 0)),
    lastSyncAt: body.last_sync_at ?? null,
    lastSeenAt: now,
    userAgent: body.user_agent ?? c.req.header("User-Agent") ?? "",
    platform: body.platform ?? "",
    updated: now,
  };

  if (existing[0]) {
    await db
      .update(clientSessions)
      .set(payload)
      .where(eq(clientSessions.id, existing[0].id));
    return c.json({ ok: true, id: existing[0].id });
  }

  const id = generateId();
  await db.insert(clientSessions).values({
    id,
    user: userId,
    store: storeId,
    ...payload,
    created: now,
  });

  return c.json({ ok: true, id });
});
