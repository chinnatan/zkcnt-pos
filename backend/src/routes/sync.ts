import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import {
  categories,
  customers,
  discounts,
  inventory,
  inventoryTransactions,
  orderItems,
  orders,
  products,
} from "../db/schema";
import {
  mapCategory,
  mapCustomer,
  mapDiscount,
  mapInventory,
  mapInventoryTransaction,
  mapOrder,
  mapOrderItem,
  mapProduct,
} from "../lib/mappers";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  requireStoreMember,
  type StoreAccessVariables,
} from "../middleware/store-access";

type Vars = AuthVariables & StoreAccessVariables;

export const syncRoutes = new Hono<{ Variables: Vars }>();

syncRoutes.get(
  "/:storeId/sync",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const since = c.req.query("since") ?? "1970-01-01T00:00:00.000Z";

    const [catRows, prodRows, custRows, invRows, discRows, orderRows, itemRows, txRows] =
      await Promise.all([
        db
          .select()
          .from(categories)
          .where(
            and(eq(categories.store, storeId), gt(categories.updated, since)),
          ),
        db
          .select()
          .from(products)
          .where(and(eq(products.store, storeId), gt(products.updated, since))),
        db
          .select()
          .from(customers)
          .where(
            and(eq(customers.store, storeId), gt(customers.updated, since)),
          ),
        db
          .select()
          .from(inventory)
          .where(
            and(eq(inventory.store, storeId), gt(inventory.updated, since)),
          ),
        db
          .select()
          .from(discounts)
          .where(
            and(eq(discounts.store, storeId), gt(discounts.updated, since)),
          ),
        db
          .select()
          .from(orders)
          .where(and(eq(orders.store, storeId), gt(orders.updated, since))),
        db
          .select()
          .from(orderItems)
          .where(gt(orderItems.updated, since)),
        db
          .select()
          .from(inventoryTransactions)
          .where(
            and(
              eq(inventoryTransactions.store, storeId),
              gt(inventoryTransactions.updated, since),
            ),
          ),
      ]);

    // Filter order items to this store's orders
    const storeOrderIds = new Set(orderRows.map((o) => o.id));
    const filteredItems = itemRows.filter((i) => storeOrderIds.has(i.order));

    return c.json({
      categories: catRows.map(mapCategory),
      products: prodRows.map(mapProduct),
      customers: custRows.map(mapCustomer),
      inventory: invRows.map(mapInventory),
      discounts: discRows.map(mapDiscount),
      orders: orderRows.map(mapOrder),
      order_items: filteredItems.map(mapOrderItem),
      inventory_transactions: txRows.map(mapInventoryTransaction),
    });
  },
);

// Generic sync push for offline queue
const COLLECTION_HANDLERS: Record<
  string,
  { table: keyof typeof import("../db/schema").schema; storeField?: string }
> = {
  categories: { table: "categories", storeField: "store" },
  products: { table: "products", storeField: "store" },
  customers: { table: "customers", storeField: "store" },
  discounts: { table: "discounts", storeField: "store" },
  inventory: { table: "inventory", storeField: "store" },
  orders: { table: "orders", storeField: "store" },
  order_items: { table: "orderItems" },
  inventory_transactions: { table: "inventoryTransactions", storeField: "store" },
};

export const collectionSyncRoutes = new Hono<{ Variables: Vars }>();

collectionSyncRoutes.post(
  "/:storeId/collections/:collection",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const collection = c.req.param("collection");
    const body = await c.req.json<Record<string, unknown>>();

    // Delegate to specific route handlers via internal logic
    throw new HTTPException(501, {
      message: `Use specific endpoints for ${collection}`,
    });
  },
);
