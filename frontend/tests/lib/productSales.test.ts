import { describe, expect, test } from "vitest";
import { buildProductSalesMap } from "~/lib/pos/productSales";

describe("buildProductSalesMap", () => {
  test("counts only completed orders", () => {
    const sales = buildProductSalesMap(
      [
        { id: "completed", status: "completed" },
        { id: "voided", status: "voided" },
        { id: "other-store", status: "completed" },
      ],
      [
        { order: "completed", product: "a", quantity: 3 },
        { order: "voided", product: "a", quantity: 10 },
        { order: "other-store", product: "b", quantity: 4 },
      ],
    );

    expect([...sales.entries()]).toEqual([["a", 3], ["b", 4]]);
  });

  test("combines multiple items for a product", () => {
    const sales = buildProductSalesMap(
      [{ id: "order", status: "completed" }],
      [
        { order: "order", product: "a", quantity: 2 },
        { order: "order", product: "a", quantity: 3 },
      ],
    );

    expect(sales.get("a")).toBe(5);
  });
});
