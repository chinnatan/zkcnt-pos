import { beforeEach, describe, expect, test } from "vitest";
import { db } from "~/lib/db";
import { getTodayStats } from "~/lib/dashboard";
import { getBangkokStartOfDay } from "~/lib/timezone";
import type { Order } from "~/lib/types";

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
});
