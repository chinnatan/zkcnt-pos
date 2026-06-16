import { and, desc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import {
  inventory,
  inventoryTransactions,
  products,
} from "../db/schema";
import { generateId } from "../lib/id";
import { mapInventory, mapInventoryTransaction, mapProduct } from "../lib/mappers";
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
      .where(eq(inventory.store, storeId));

    if (expand === "product") {
      const result = [];
      for (const row of rows) {
        const productRows = await db
          .select()
          .from(products)
          .where(eq(products.id, row.product))
          .limit(1);
        result.push({
          ...mapInventory(row),
          expand: {
            product: productRows[0] ? mapProduct(productRows[0]) : null,
          },
        });
      }
      return c.json(result);
    }

    return c.json(rows.map(mapInventory));
  },
);

inventoryRoutes.patch(
  "/:storeId/inventory/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const updates: Partial<typeof inventory.$inferInsert> = { updated: now };
    if (body.quantity !== undefined) updates.quantity = Number(body.quantity);
    if (body.low_stock_threshold !== undefined) {
      updates.lowStockThreshold = Number(body.low_stock_threshold);
    }

    await db
      .update(inventory)
      .set(updates)
      .where(and(eq(inventory.id, id), eq(inventory.store, storeId)));

    const rows = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
    if (!rows[0]) throw new HTTPException(404, { message: "Not found" });
    return c.json(mapInventory(rows[0]));
  },
);

inventoryRoutes.post(
  "/:storeId/inventory",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();
    const id = generateId();

    await db.insert(inventory).values({
      id,
      store: storeId,
      product: String(body.product ?? ""),
      quantity: Number(body.quantity ?? 0),
      lowStockThreshold: Number(body.low_stock_threshold ?? 0),
      created: now,
      updated: now,
    });

    const rows = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
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
    const afterQty = Number(body.after_qty ?? body.quantity ?? 0);

    await db.insert(inventoryTransactions).values({
      id,
      store: storeId,
      product: productId,
      type: (body.type as "stock_in" | "stock_out" | "adjustment" | "sale") ?? "adjustment",
      quantity: Number(body.quantity ?? 0),
      beforeQty: Number(body.before_qty ?? 0),
      afterQty,
      reference: String(body.reference ?? ""),
      note: String(body.note ?? ""),
      createdBy: userId,
      created: now,
      updated: now,
    });

    // Upsert inventory quantity
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
