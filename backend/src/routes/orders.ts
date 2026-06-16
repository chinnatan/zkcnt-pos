import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import {
  inventory,
  inventoryTransactions,
  orderItems,
  orders,
  products,
} from "../db/schema";
import { generateId } from "../lib/id";
import { mapOrder, mapOrderItem } from "../lib/mappers";
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

export const orderRoutes = new Hono<{ Variables: Vars }>();

orderRoutes.get(
  "/:storeId/orders",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const limit = Number(c.req.query("limit") ?? 50);

    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.store, storeId))
      .orderBy(desc(orders.created))
      .limit(limit);

    return c.json({ items: rows.map(mapOrder), totalItems: rows.length });
  },
);

orderRoutes.get(
  "/:storeId/orders/:orderId/items",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const orderId = c.req.param("orderId");
    const rows = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.order, orderId));

    return c.json(rows.map(mapOrderItem));
  },
);

orderRoutes.post(
  "/:storeId/orders",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const body = await c.req.json<{
      order?: Record<string, unknown>;
      items?: Array<Record<string, unknown>>;
    }>();

    const orderData: Record<string, unknown> =
      body.order ?? (body as Record<string, unknown>);
    const items = body.items ?? [];

    const now = nowIso();
    const orderId = generateId();

    await db.insert(orders).values({
      id: orderId,
      store: storeId,
      orderNumber: String(orderData.order_number ?? `ORD-${Date.now()}`),
      clientId: String(orderData.client_id ?? generateId()),
      customer: orderData.customer ? String(orderData.customer) : null,
      cashier: String(orderData.cashier ?? userId),
      subtotal: Number(orderData.subtotal ?? 0),
      discountAmount: Number(orderData.discount_amount ?? 0),
      discountType: String(orderData.discount_type ?? ""),
      taxAmount: Number(orderData.tax_amount ?? 0),
      total: Number(orderData.total ?? 0),
      paymentMethod: (orderData.payment_method as "cash" | "qr") ?? "cash",
      paymentReceived: Number(orderData.payment_received ?? 0),
      changeAmount: Number(orderData.change_amount ?? 0),
      status: (orderData.status as "completed" | "voided" | "refunded") ?? "completed",
      note: String(orderData.note ?? ""),
      syncedAt: String(orderData.synced_at ?? now),
      created: now,
      updated: now,
    });

    for (const item of items) {
      const itemId = generateId();
      const productId = String(item.product ?? item.product_id ?? "");

      await db.insert(orderItems).values({
        id: itemId,
        order: orderId,
        product: productId,
        productName: String(item.product_name ?? ""),
        productPrice: Number(item.product_price ?? 0),
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unit_price ?? 0),
        discount: Number(item.discount ?? 0),
        total: Number(item.total ?? 0),
        created: now,
        updated: now,
      });

      // Update inventory for tracked products
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (productRows[0]?.trackInventory) {
        const invRows = await db
          .select()
          .from(inventory)
          .where(
            and(eq(inventory.store, storeId), eq(inventory.product, productId)),
          )
          .limit(1);

        const beforeQty = invRows[0]?.quantity ?? 0;
        const afterQty = beforeQty - Number(item.quantity ?? 0);

        if (invRows[0]) {
          await db
            .update(inventory)
            .set({ quantity: afterQty, updated: now })
            .where(eq(inventory.id, invRows[0].id));
        }

        await db.insert(inventoryTransactions).values({
          id: generateId(),
          store: storeId,
          product: productId,
          type: "sale",
          quantity: Number(item.quantity ?? 0),
          beforeQty,
          afterQty,
          reference: orderId,
          note: "",
          createdBy: userId,
          created: now,
          updated: now,
        });
      }
    }

    const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    return c.json(mapOrder(rows[0]!), 201);
  },
);

// Single order item create (for offline sync)
orderRoutes.post(
  "/:storeId/order-items",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();
    const id = generateId();
    const orderId = String(body.order ?? "");

    // Verify order belongs to store
    const orderRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.store, storeId)))
      .limit(1);

    if (!orderRows[0]) {
      throw new HTTPException(400, { message: "Order not found" });
    }

    await db.insert(orderItems).values({
      id,
      order: orderId,
      product: String(body.product ?? ""),
      productName: String(body.product_name ?? ""),
      productPrice: Number(body.product_price ?? 0),
      quantity: Number(body.quantity ?? 1),
      unitPrice: Number(body.unit_price ?? 0),
      discount: Number(body.discount ?? 0),
      total: Number(body.total ?? 0),
      created: now,
      updated: now,
    });

    const rows = await db.select().from(orderItems).where(eq(orderItems.id, id)).limit(1);
    return c.json(mapOrderItem(rows[0]!), 201);
  },
);
