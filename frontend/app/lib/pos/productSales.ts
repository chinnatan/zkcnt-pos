import { db } from "~/lib/db";
import type { Order, OrderItem } from "~/lib/types";

export function buildProductSalesMap(
  orders: Pick<Order, "id" | "status">[],
  orderItems: Pick<OrderItem, "order" | "product" | "quantity">[],
): Map<string, number> {
  const completedOrderIds = new Set(
    orders.filter((order) => order.status === "completed").map((order) => order.id),
  );
  const sales = new Map<string, number>();

  for (const item of orderItems) {
    if (!completedOrderIds.has(item.order)) continue;
    sales.set(item.product, (sales.get(item.product) ?? 0) + item.quantity);
  }

  return sales;
}

export async function fetchProductSales(storeId: string): Promise<Map<string, number>> {
  const [orders, orderItems] = await Promise.all([
    db.orders.where("store").equals(storeId).toArray(),
    db.orderItems.toArray(),
  ]);

  return buildProductSalesMap(orders, orderItems);
}
