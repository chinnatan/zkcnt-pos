import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { customers } from "../db/schema";
import { buildChanges, logAuditEvent } from "../lib/audit";
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
    const userId = c.get("userId");
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

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "customer.create",
      entityType: "customer",
      entityId: id,
      summary: `สร้างลูกค้า "${String(body.name ?? "")}"`,
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
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const existing = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.store, storeId)))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Not found" });

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

    const changes = buildChanges(
      existing[0] as unknown as Record<string, unknown>,
      rows[0] as unknown as Record<string, unknown>,
      ["name", "phone", "email", "address", "note"],
    );
    if (Object.keys(changes).length > 0) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "customer.update",
        entityType: "customer",
        entityId: id,
        summary: `แก้ไขลูกค้า "${rows[0].name}"`,
        changes,
      });
    }

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
    const userId = c.get("userId");

    const existing = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.store, storeId)))
      .limit(1);

    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.store, storeId)));

    if (existing[0]) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "customer.delete",
        entityType: "customer",
        entityId: id,
        summary: `ลบลูกค้า "${existing[0].name}"`,
      });
    }

    return c.json({ success: true });
  },
);
