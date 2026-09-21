import { db } from "~/lib/db";
import { getBangkokStartOfDay } from "~/lib/timezone";
import type { Inventory, Order, OrderItem, Product } from "~/lib/types";

export interface TodayStats {
  sales: number;
  count: number;
  productsSoldToday: number;
  productsInStock: number;
}

export async function getTodayStats(
  storeId: string,
  now: Date = new Date(),
): Promise<TodayStats> {
  const since = getBangkokStartOfDay(now);
  const until = new Date(since.getTime() + 86_400_000);
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();

  const rows = (await db.orders
    .where("[store+status]")
    .equals([storeId, "completed"])
    .toArray()) as Order[];

  const todayOrders = rows.filter((o) => o.created >= sinceIso && o.created < untilIso);
  const orderIds = todayOrders.map((o) => o.id);
  const [orderItems, products, inventory] = await Promise.all([
    orderIds.length
      ? db.orderItems.where("order").anyOf(orderIds).toArray()
      : Promise.resolve([] as OrderItem[]),
    db.products.where("store").equals(storeId).toArray(),
    db.inventory.where("store").equals(storeId).toArray(),
  ]);

  const inventoryByProduct = new Map(
    (inventory as Inventory[]).map((item) => [item.product, item.quantity]),
  );
  const soldProductIds = new Set(
    (orderItems as OrderItem[]).map((item) => item.product),
  );
  const productsInStock = (products as Product[]).filter(
    (product) =>
      product.is_active &&
      !product.deleted_at &&
      (!product.track_inventory || (inventoryByProduct.get(product.id) ?? 0) > 0),
  ).length;

  return {
    sales: todayOrders.reduce((sum, order) => sum + order.total, 0),
    count: todayOrders.length,
    productsSoldToday: soldProductIds.size,
    productsInStock,
  };
}
