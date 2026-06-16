import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { discounts } from "../db/schema";
import { generateId } from "../lib/id";
import { mapDiscount } from "../lib/mappers";
import { nowIso } from "../lib/timestamps";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  requireStoreMember,
  type StoreAccessVariables,
} from "../middleware/store-access";

type Vars = AuthVariables & StoreAccessVariables;

export const discountRoutes = new Hono<{ Variables: Vars }>();

discountRoutes.get(
  "/:storeId/discounts",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const rows = await db
      .select()
      .from(discounts)
      .where(eq(discounts.store, storeId))
      .orderBy(asc(discounts.name));

    return c.json(rows.map(mapDiscount));
  },
);

discountRoutes.post(
  "/:storeId/discounts",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();
    const id = generateId();

    await db.insert(discounts).values({
      id,
      store: storeId,
      name: String(body.name ?? ""),
      type: (body.type as "percent" | "fixed") ?? "fixed",
      value: Number(body.value ?? 0),
      minPurchase: Number(body.min_purchase ?? 0),
      startDate: String(body.start_date ?? ""),
      endDate: String(body.end_date ?? ""),
      isActive: body.is_active !== false,
      created: now,
      updated: now,
    });

    const rows = await db.select().from(discounts).where(eq(discounts.id, id)).limit(1);
    return c.json(mapDiscount(rows[0]!), 201);
  },
);

discountRoutes.patch(
  "/:storeId/discounts/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const updates: Partial<typeof discounts.$inferInsert> = { updated: now };
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.type !== undefined) updates.type = body.type as "percent" | "fixed";
    if (body.value !== undefined) updates.value = Number(body.value);
    if (body.min_purchase !== undefined) updates.minPurchase = Number(body.min_purchase);
    if (body.start_date !== undefined) updates.startDate = String(body.start_date);
    if (body.end_date !== undefined) updates.endDate = String(body.end_date);
    if (body.is_active !== undefined) updates.isActive = Boolean(body.is_active);

    await db
      .update(discounts)
      .set(updates)
      .where(and(eq(discounts.id, id), eq(discounts.store, storeId)));

    const rows = await db.select().from(discounts).where(eq(discounts.id, id)).limit(1);
    if (!rows[0]) throw new HTTPException(404, { message: "Not found" });
    return c.json(mapDiscount(rows[0]));
  },
);

discountRoutes.delete(
  "/:storeId/discounts/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");

    await db
      .delete(discounts)
      .where(and(eq(discounts.id, id), eq(discounts.store, storeId)));

    return c.json({ success: true });
  },
);
