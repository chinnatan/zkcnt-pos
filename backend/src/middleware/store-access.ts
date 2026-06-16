import { and, eq, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { storeMembers, stores } from "../db/schema";
import type { AuthVariables } from "./auth";

export type StoreAccessVariables = AuthVariables & {
  storeId: string;
  memberRole?: "owner" | "manager" | "cashier";
};

async function getMembership(userId: string, storeId: string) {
  const rows = await db
    .select()
    .from(storeMembers)
    .where(
      and(
        eq(storeMembers.store, storeId),
        eq(storeMembers.user, userId),
        eq(storeMembers.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export const requireStoreMember = createMiddleware<{
  Variables: StoreAccessVariables;
}>(async (c, next) => {
  const userId = c.get("userId");
  const storeId = c.req.param("storeId");
  if (!storeId) {
    throw new HTTPException(400, { message: "storeId required" });
  }

  const membership = await getMembership(userId, storeId);
  if (!membership) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  c.set("storeId", storeId);
  c.set("memberRole", membership.role);
  await next();
});

export const requireStoreManager = createMiddleware<{
  Variables: StoreAccessVariables;
}>(async (c, next) => {
  const userId = c.get("userId");
  const storeId = c.req.param("storeId");
  if (!storeId) {
    throw new HTTPException(400, { message: "storeId required" });
  }

  const membership = await getMembership(userId, storeId);
  if (
    !membership ||
    (membership.role !== "owner" && membership.role !== "manager")
  ) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  c.set("storeId", storeId);
  c.set("memberRole", membership.role);
  await next();
});

export const requireStoreOwner = createMiddleware<{
  Variables: StoreAccessVariables;
}>(async (c, next) => {
  const userId = c.get("userId");
  const storeId = c.req.param("storeId");
  if (!storeId) {
    throw new HTTPException(400, { message: "storeId required" });
  }

  const membership = await getMembership(userId, storeId);
  if (!membership || membership.role !== "owner") {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  c.set("storeId", storeId);
  c.set("memberRole", membership.role);
  await next();
});

export async function assertStoreManagerByStoreId(
  userId: string,
  storeId: string,
) {
  const membership = await getMembership(userId, storeId);
  if (
    !membership ||
    (membership.role !== "owner" && membership.role !== "manager")
  ) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return membership;
}

export async function assertStoreMemberByStoreId(
  userId: string,
  storeId: string,
) {
  const membership = await getMembership(userId, storeId);
  if (!membership) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return membership;
}

export async function getStoreSettings(storeId: string) {
  const row = await db
    .select({ settings: stores.settings })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return (row[0]?.settings ?? {}) as Record<string, unknown>;
}
