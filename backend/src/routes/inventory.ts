import { and, desc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import {
  inventory,
  inventoryTransactions,
  products,
} from "../db/schema";
import { buildChanges, logAuditEvent } from "../lib/audit";
import { generateId } from "../lib/id";
import { mapInventory, mapInventoryTransaction, mapProduct } from "../lib/mappers";
import { notDeleted } from "../lib/soft-delete";
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

export const inventoryRoutes = new Hono<{ Variables: Vars }>();

inventoryRoutes.get(
  "/:storeId/inventory",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const expand = c.req.query("expand");

    const rows = await db
      .select()
      .from(inventory)
      .innerJoin(products, eq(inventory.product, products.id))
      .where(
        and(eq(inventory.store, storeId), notDeleted(products.deletedAt)),
      );

    if (expand === "product") {
      return c.json(
        rows.map((row) => ({
          ...mapInventory(row.inventory),
          expand: {
            product: mapProduct(row.products),
          },
        })),
      );
    }

    return c.json(rows.map((row) => mapInventory(row.inventory)));
  },
);

inventoryRoutes.patch(
  "/:storeId/inventory/:id",
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
      .from(inventory)
      .where(and(eq(inventory.id, id), eq(inventory.store, storeId)))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Not found" });

    const updates: Partial<typeof inventory.$inferInsert> = { updated: now };
    if (body.quantity !== undefined) updates.quantity = Number(body.quantity);
    if (body.low_stock_threshold !== undefined) {
      updates.lowStockThreshold = Number(body.low_stock_threshold);
    }

    await db
      .update(inventory)
      .set(updates)
      .where(and(eq(inventory.id, id), eq(inventory.store, storeId)));

    const rows = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);

    const changes = buildChanges(
      existing[0] as unknown as Record<string, unknown>,
      rows[0] as unknown as Record<string, unknown>,
      ["quantity", "lowStockThreshold"],
    );

    if (Object.keys(changes).length > 0) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "inventory.update",
        entityType: "inventory",
        entityId: id,
        summary: `ปรับสต็อกสินค้า (product: ${existing[0].product})`,
        changes,
        metadata: { product_id: existing[0].product },
      });
    }

    return c.json(mapInventory(rows[0]!));
  },
);

inventoryRoutes.post(
  "/:storeId/inventory",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();
    const id = generateId();
    const productId = String(body.product ?? "");

    await db.insert(inventory).values({
      id,
      store: storeId,
      product: productId,
      quantity: Number(body.quantity ?? 0),
      lowStockThreshold: Number(body.low_stock_threshold ?? 0),
      created: now,
      updated: now,
    });

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "inventory.create",
      entityType: "inventory",
      entityId: id,
      summary: `สร้างสต็อกสินค้า (product: ${productId})`,
      metadata: {
        product_id: productId,
        quantity: Number(body.quantity ?? 0),
      },
    });

    const rows = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);
    return c.json(mapInventory(rows[0]!), 201);
  },
);

inventoryRoutes.post(
  "/:storeId/inventory-transactions",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();
    const id = generateId();

    const productId = String(body.product ?? "");
    const txType =
      (body.type as "stock_in" | "stock_out" | "adjustment" | "sale") ??
      "adjustment";
    const afterQty = Number(body.after_qty ?? body.quantity ?? 0);

    await db.insert(inventoryTransactions).values({
      id,
      store: storeId,
      product: productId,
      type: txType,
      quantity: Number(body.quantity ?? 0),
      beforeQty: Number(body.before_qty ?? 0),
      afterQty,
      reference: String(body.reference ?? ""),
      note: String(body.note ?? ""),
      createdBy: userId,
      created: now,
      updated: now,
    });

    const existing = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.store, storeId), eq(inventory.product, productId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(inventory)
        .set({ quantity: afterQty, updated: now })
        .where(eq(inventory.id, existing[0].id));
    } else {
      await db.insert(inventory).values({
        id: generateId(),
        store: storeId,
        product: productId,
        quantity: afterQty,
        lowStockThreshold: 0,
        created: now,
        updated: now,
      });
    }

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "inventory_transaction.create",
      entityType: "inventory_transaction",
      entityId: id,
      summary: `บันทึกการเคลื่อนไหวสต็อก (${txType}) product: ${productId}`,
      metadata: {
        type: txType,
        product_id: productId,
        quantity: Number(body.quantity ?? 0),
        before_qty: Number(body.before_qty ?? 0),
        after_qty: afterQty,
        reference: String(body.reference ?? ""),
      },
    });

    const rows = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.id, id))
      .limit(1);

    return c.json(mapInventoryTransaction(rows[0]!), 201);
  },
);

inventoryRoutes.get(
  "/:storeId/inventory-transactions",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const rows = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.store, storeId))
      .orderBy(desc(inventoryTransactions.created));

    return c.json(rows.map(mapInventoryTransaction));
  },
);
