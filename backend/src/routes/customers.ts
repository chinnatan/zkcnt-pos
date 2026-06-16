import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { customers } from "../db/schema";
import { generateId } from "../lib/id";
import { mapCustomer } from "../lib/mappers";
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

export const customerRoutes = new Hono<{ Variables: Vars }>();

customerRoutes.get(
  "/:storeId/customers",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.store, storeId))
      .orderBy(asc(customers.name));

    return c.json(rows.map(mapCustomer));
  },
);

customerRoutes.post(
  "/:storeId/customers",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();
    const id = generateId();

    await db.insert(customers).values({
      id,
      store: storeId,
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      address: String(body.address ?? ""),
      note: String(body.note ?? ""),
      totalSpent: Number(body.total_spent ?? 0),
      visitCount: Number(body.visit_count ?? 0),
      created: now,
      updated: now,
    });

    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return c.json(mapCustomer(rows[0]!), 201);
  },
);

customerRoutes.patch(
  "/:storeId/customers/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const updates: Partial<typeof customers.$inferInsert> = { updated: now };
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.phone !== undefined) updates.phone = String(body.phone);
    if (body.email !== undefined) updates.email = String(body.email);
    if (body.address !== undefined) updates.address = String(body.address);
    if (body.note !== undefined) updates.note = String(body.note);
    if (body.total_spent !== undefined) updates.totalSpent = Number(body.total_spent);
    if (body.visit_count !== undefined) updates.visitCount = Number(body.visit_count);

    await db
      .update(customers)
      .set(updates)
      .where(and(eq(customers.id, id), eq(customers.store, storeId)));

    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!rows[0]) throw new HTTPException(404, { message: "Not found" });
    return c.json(mapCustomer(rows[0]));
  },
);

customerRoutes.delete(
  "/:storeId/customers/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");

    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.store, storeId)));

    return c.json({ success: true });
  },
);
