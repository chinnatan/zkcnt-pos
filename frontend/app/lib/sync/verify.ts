import { db } from "../db";
import type { SyncVerifyCollection } from "../api/client";

/**
 * Local aggregates mirroring GET /:storeId/sync/verify for the offline/online
 * self-check. Unsynced `temp_*` orders/items are excluded — they cannot exist
 * on the server yet, and would show as a false mismatch.
 */
export async function computeLocalVerify(
  storeId: string,
): Promise<Record<string, SyncVerifyCollection>> {
  const [categories, products, customers, inventory, promotions] =
    await Promise.all([
      db.categories.where("store").equals(storeId).count(),
      db.products.where("store").equals(storeId).count(),
      db.customers.where("store").equals(storeId).count(),
      db.inventory.where("store").equals(storeId).count(),
      db.promotions.where("store").equals(storeId).count(),
    ]);

  const localOrders = await db.orders
    .where("store")
    .equals(storeId)
    .toArray();
  const syncedOrders = localOrders.filter((o) => !o.id.startsWith("temp_"));
  const completedTotal = syncedOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);

  const orderIds = new Set(syncedOrders.map((o) => o.id));
  const orderItemCount = (await db.orderItems.toArray()).filter((i) =>
    orderIds.has(i.order),
  ).length;

  return {
    categories: { count: categories },
    products: { count: products },
    customers: { count: customers },
    inventory: { count: inventory },
    promotions: { count: promotions },
    orders: { count: syncedOrders.length, completed_total: completedTotal },
    order_items: { count: orderItemCount },
  };
}
