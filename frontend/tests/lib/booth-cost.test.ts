import { describe, expect, test } from "vitest";
import {
  boothBreakEven,
  boothCostPerPiece,
  boothDayCount,
  estimatedProfitIfSoldOut,
  isBoothEnded,
  productEconomics,
  seedBoothProducts,
  totalBoothCost,
} from "~/lib/booths/cost";
import type { Product } from "~/lib/types";

describe("booth cost", () => {
  const booth = {
    booth_fee: 1500,
    extra_costs: [
      { name: "travel", amount: 300 },
      { name: "print", amount: 200 },
    ],
  };

  test("total includes extra costs", () => {
    expect(totalBoothCost(booth)).toBe(2000);
    expect(totalBoothCost({ booth_fee: 0, extra_costs: [] })).toBe(0);
  });

  test("per piece divides by total pieces, never by zero", () => {
    expect(boothCostPerPiece(booth, [{ qty_brought: 30 }, { qty_brought: 70 }])).toBe(20);
    expect(boothCostPerPiece(booth, [])).toBe(0);
    expect(boothCostPerPiece(booth, [{ qty_brought: 0 }])).toBe(0);
  });

  test("economics adds booth share to production cost", () => {
    expect(productEconomics({ price: 50, cost: 20 }, 10)).toEqual({ unitCost: 30, profit: 20 });
  });

  test("seed keeps only active, non-deleted products with stock", () => {
    const p = (id: string, extra: Partial<Product> = {}) =>
      ({ id, is_active: true, deleted_at: null, ...extra }) as Product;
    const seed = seedBoothProducts(
      [p("a"), p("b"), p("c", { is_active: false }), p("d", { deleted_at: "x" }), p("e")],
      [
        { product: "a", quantity: 5 },
        { product: "b", quantity: 0 },
        { product: "c", quantity: 9 },
        { product: "d", quantity: 9 },
      ],
    );
    expect(seed).toEqual([{ product: "a", qty_brought: 5 }]);
  });

  test("day count is inclusive and 0 for bad ranges", () => {
    expect(boothDayCount("2026-10-03", "2026-10-04")).toBe(2);
    expect(boothDayCount("2026-10-03", "2026-10-03")).toBe(1);
    expect(boothDayCount("2026-10-04", "2026-10-03")).toBe(0);
    expect(boothDayCount("", "2026-10-03")).toBe(0);
  });

  test("booth ends when closed, deleted or past end date; not before start", () => {
    const b = { closed_at: "", end_date: "2026-10-04", deleted_at: null };
    expect(isBoothEnded(b, "2026-10-04")).toBe(false);
    expect(isBoothEnded(b, "2026-10-05")).toBe(true);
    expect(isBoothEnded(b, "2026-09-01")).toBe(false);
    expect(isBoothEnded({ ...b, closed_at: "x" }, "2026-10-03")).toBe(true);
    expect(isBoothEnded({ ...b, end_date: "" }, "2030-01-01")).toBe(false);
  });

  test("break-even percent and shortfall", () => {
    expect(boothBreakEven({ revenue: 500, cogs: 300, fixedCost: 700 })).toEqual({ pct: 50, shortfall: 500, reached: false });
    expect(boothBreakEven({ revenue: 1200, cogs: 300, fixedCost: 700 }).reached).toBe(true);
    expect(boothBreakEven({ revenue: 0, cogs: 0, fixedCost: 0 }).pct).toBe(0);
  });

  test("estimated profit if everything sells out", () => {
    const products = [
      { id: "a", price: 50, cost: 20 },
      { id: "b", price: 100, cost: 40 },
    ];
    const rows = [
      { product: "a", qty_brought: 10 },
      { product: "b", qty_brought: 5 },
      { product: "gone", qty_brought: 99 },
    ];
    // margins: 10×30 + 5×60 = 600, minus booth cost 2000
    expect(estimatedProfitIfSoldOut(booth, rows, products)).toBe(600 - 2000);
    expect(estimatedProfitIfSoldOut({ booth_fee: 0, extra_costs: [] }, [], products)).toBe(0);
  });
});
