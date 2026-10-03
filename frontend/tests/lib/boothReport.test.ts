import { describe, expect, test } from "vitest";
import { buildBoothReport, sellThroughAdvice } from "~/lib/reports/booth";
import type { Booth, BoothProduct, Category, Order, OrderItem, Product } from "~/lib/types";

const booth = (id: string, extra: Partial<Booth> = {}) =>
  ({
    id, store: "s", name: id, location: "", start_date: "2026-10-03", end_date: "2026-10-04",
    booth_fee: 1000, extra_costs: [{ name: "travel", amount: 200 }], image: "", closed_at: "",
    is_active: true, deleted_at: null, created: "", updated: "", ...extra,
  }) as Booth;
const product = (id: string, category: string, cost: number) =>
  ({ id, name: `P-${id}`, category, cost, price: 100 }) as Product;
const bp = (b: string, p: string, brought: number, left: number | null = null) =>
  ({ id: `${b}${p}`, booth: b, product: p, qty_brought: brought, qty_left: left, deleted_at: null }) as BoothProduct;
const order = (id: string, b: string, total: number, status: Order["status"] = "completed") =>
  ({ id, booth: b, total, status }) as Order;
const item = (o: string, p: string, quantity: number, total: number) =>
  ({ id: `${o}${p}`, order: o, product: p, product_name: `P-${p}`, quantity, total }) as OrderItem;

const base = {
  products: [product("a", "c1", 20), product("b", "c1", 10), product("c", "c2", 5)],
  categories: [{ id: "c1", name: "Stickers" }, { id: "c2", name: "Cards" }] as Category[],
  uncategorizedLabel: "None",
};

describe("booth report", () => {
  test("profit = revenue − production cost − booth cost; voided orders ignored", () => {
    const r = buildBoothReport({
      ...base,
      booths: [booth("x")],
      boothProducts: [bp("x", "a", 10), bp("x", "b", 10)],
      orders: [order("o1", "x", 300), order("o2", "x", 999, "voided"), order("o3", "other", 500)],
      orderItems: [item("o1", "a", 2, 200), item("o1", "b", 1, 100), item("o2", "a", 9, 999)],
    });
    const b = r.booths[0]!;
    expect(b.revenue).toBe(300);
    expect(b.cogs).toBe(2 * 20 + 10);
    expect(b.fixedCost).toBe(1200);
    expect(b.profit).toBe(300 - 50 - 1200);
    expect(b.days).toBe(2);
    expect(b.revenuePerDay).toBe(150);
    expect(b.orderCount).toBe(1);
  });

  test("sell-through uses brought−left when closed, else sold; advice thresholds", () => {
    const r = buildBoothReport({
      ...base,
      booths: [booth("x")],
      boothProducts: [bp("x", "a", 10, 1), bp("x", "b", 10), bp("x", "c", 10)],
      orders: [order("o1", "x", 100)],
      orderItems: [item("o1", "b", 2, 100)],
    });
    const rows = new Map(r.booths[0]!.products.map((p) => [p.productId, p]));
    expect(rows.get("a")!.sellThrough).toBe(0.9);
    expect(rows.get("a")!.advice).toBe("produceMore");
    expect(rows.get("b")!.sellThrough).toBe(0.2);
    expect(rows.get("b")!.advice).toBe("produceLess");
    expect(rows.get("c")!.sellThrough).toBe(0);
    expect(rows.get("c")!.advice).toBe("produceLess");
  });

  test("category summary across booths; unknown category labelled", () => {
    const r = buildBoothReport({
      ...base,
      products: [...base.products, product("d", "", 0)],
      booths: [booth("x"), booth("y")],
      boothProducts: [bp("x", "a", 10), bp("y", "b", 10), bp("y", "d", 5)],
      orders: [order("o1", "x", 100), order("o2", "y", 100)],
      orderItems: [item("o1", "a", 4, 100), item("o2", "b", 6, 100)],
    });
    const c1 = r.categories.find((c) => c.categoryId === "c1")!;
    expect(c1).toMatchObject({ name: "Stickers", sold: 10, brought: 20, sellThrough: 0.5 });
    expect(r.categories.find((c) => c.categoryId === "")!.name).toBe("None");
  });

  test("no brought quantity → no sell-through", () => {
    expect(sellThroughAdvice(null)).toBeNull();
    const r = buildBoothReport({
      ...base,
      booths: [booth("x")],
      boothProducts: [],
      orders: [order("o1", "x", 100)],
      orderItems: [item("o1", "a", 1, 100)],
    });
    expect(r.booths[0]!.products[0]!.sellThrough).toBeNull();
  });
});
