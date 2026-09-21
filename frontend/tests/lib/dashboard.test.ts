import { beforeEach, describe, expect, test } from "vitest";
import { db } from "~/lib/db";
import { getTodayStats } from "~/lib/dashboard";
import { getBangkokStartOfDay } from "~/lib/timezone";
import type { Inventory, Order, OrderItem, Product } from "~/lib/types";

function makeOrder(
  id: string,
  total: number,
  created: string,
  status: Order["status"] = "completed",
  store = "s1",
): Order {
  return {
    id,
    store,
    order_number: `ORD-${id}`,
    client_id: id,
    customer: "",
    cashier: "u1",
    subtotal: total,
    discount_amount: 0,
    discount_type: "",
    tax_amount: 0,
    total,
    payment_method: "cash",
    payment_received: total,
    change_amount: 0,
    status,
    note: "",
    synced_at: "",
    coupon_code: "",
    created,
    updated: created,
  };
}

function makeProduct(
  id: string,
  options: Partial<Pick<Product, "track_inventory" | "is_active" | "deleted_at">> = {},
): Product {
  return {
    id,
    store: "s1",
    name: id,
    sku: id,
    barcode: "",
    description: "",
    price: 100,
    cost: 50,
    category: "",
    image: "",
    unit: "piece",
    track_inventory: true,
    is_active: true,
    ...options,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

function makeOrderItem(id: string, order: string, product: string, freeQuantity = 0): OrderItem {
  return {
    id,
    order,
    product,
    product_name: product,
    product_price: 100,
    quantity: 1,
    unit_price: freeQuantity ? 0 : 100,
    discount: 0,
    total: freeQuantity ? 0 : 100,
    promotion_id: freeQuantity ? "promo1" : "",
    free_quantity: freeQuantity,
    note: "",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

function makeInventory(product: string, quantity: number): Inventory {
  return {
    id: `inv-${product}`,
    store: "s1",
    product,
    quantity,
    low_stock_threshold: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

describe("getTodayStats", () => {
  let now: Date;
  let sinceIso: string;
  let prevDayIso: string;

  beforeEach(() => {
    now = new Date();
    const since = getBangkokStartOfDay(now);
    sinceIso = since.toISOString();
    prevDayIso = new Date(since.getTime() - 1000).toISOString();
  });

  test("sums all completed orders of the Bangkok day, not just the latest 10", async () => {
    const sinceMs = Date.parse(sinceIso);
    const rows: Order[] = [];
    for (let i = 0; i < 15; i += 1) {
      rows.push(makeOrder(`o${i}`, 100 + i, new Date(sinceMs + i * 60_000).toISOString()));
    }
    await db.orders.bulkPut(rows);

    const stats = await getTodayStats("s1", now);
    expect(stats.count).toBe(15);
    expect(stats.sales).toBe(100 * 15 + ((0 + 14) * 15) / 2);
  });

  test("excludes previous-day and voided/refunded orders", async () => {
    const todayIso = now.toISOString();
    await db.orders.bulkPut([
      makeOrder("t1", 50, todayIso),
      makeOrder("p1", 999, prevDayIso),
      makeOrder("v1", 777, todayIso, "voided"),
      makeOrder("r1", 888, todayIso, "refunded"),
      makeOrder("s2", 444, todayIso, "completed", "other-store"),
    ]);

    const stats = await getTodayStats("s1", now);
    expect(stats.count).toBe(1);
    expect(stats.sales).toBe(50);
  });

  test("counts unique products sold in completed orders, including free items", async () => {
    const todayIso = now.toISOString();
    await db.orders.bulkPut([
      makeOrder("completed", 50, todayIso),
      makeOrder("voided", 50, todayIso, "voided"),
      makeOrder("refunded", 50, todayIso, "refunded"),
    ]);
    await db.orderItems.bulkPut([
      makeOrderItem("item1", "completed", "p1"),
      makeOrderItem("item2", "completed", "p1"),
      makeOrderItem("item3", "completed", "p2", 1),
      makeOrderItem("item4", "voided", "p3"),
      makeOrderItem("item5", "refunded", "p4"),
    ]);

    const stats = await getTodayStats("s1", now);

    expect(stats.productsSoldToday).toBe(2);
  });

  test("counts only active, non-deleted products with stock", async () => {
    const todayIso = now.toISOString();
    await db.orders.put(makeOrder("completed", 50, todayIso));
    await db.products.bulkPut([
      makeProduct("tracked-in-stock"),
      makeProduct("untracked", { track_inventory: false }),
      makeProduct("tracked-empty"),
      makeProduct("inactive", { is_active: false }),
      makeProduct("deleted", { deleted_at: todayIso }),
    ]);
    await db.inventory.bulkPut([
      makeInventory("tracked-in-stock", 2),
      makeInventory("tracked-empty", 0),
      makeInventory("inactive", 10),
      makeInventory("deleted", 10),
    ]);

    const stats = await getTodayStats("s1", now);

    expect(stats.productsInStock).toBe(2);
  });
});
