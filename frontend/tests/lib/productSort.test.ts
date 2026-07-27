import { describe, expect, test } from "vitest";
import {
  comparePosProducts,
  sortPosProducts,
  type PosProductSort,
} from "~/lib/pos/productSort";
import type { Product } from "~/lib/types";

function product(partial: Partial<Product> & Pick<Product, "id" | "name" | "price">): Product {
  return {
    store: "store1",
    sku: "",
    barcode: "",
    description: "",
    cost: 0,
    category: "",
    image: "",
    unit: "pcs",
    track_inventory: true,
    is_active: true,
    created: "",
    updated: "",
    ...partial,
  };
}

describe("comparePosProducts", () => {
  const a = product({ id: "1", name: "แอปเปิล", price: 50 });
  const b = product({ id: "2", name: "กล้วย", price: 20 });
  const c = product({ id: "3", name: "Banana", price: 20 });

  test("default and nameAsc sort by Thai locale name", () => {
    // ก (กล้วย) comes before แ (แอปเปิล) in Thai collation
    expect(comparePosProducts(b, a, "default", "th")).toBeLessThan(0);
    expect(comparePosProducts(b, a, "nameAsc", "th")).toBeLessThan(0);
    expect(comparePosProducts(a, b, "nameAsc", "th")).toBeGreaterThan(0);
  });

  test("nameDesc reverses name order", () => {
    expect(comparePosProducts(b, a, "nameDesc", "th")).toBeGreaterThan(0);
  });

  test("priceAsc sorts by price then name", () => {
    expect(comparePosProducts(b, a, "priceAsc", "en")).toBeLessThan(0);
    expect(comparePosProducts(a, b, "priceAsc", "en")).toBeGreaterThan(0);
    const cheapA = product({ id: "x", name: "Alpha", price: 10 });
    const cheapB = product({ id: "y", name: "Beta", price: 10 });
    expect(comparePosProducts(cheapA, cheapB, "priceAsc", "en")).toBeLessThan(0);
  });

  test("priceDesc sorts high to low with name tie-break", () => {
    expect(comparePosProducts(a, b, "priceDesc", "en")).toBeLessThan(0);
    // same price: Banana before กล้วย with en localeCompare
    expect(comparePosProducts(c, b, "priceDesc", "en")).not.toBe(0);
  });
});

describe("sortPosProducts", () => {
  const products = [
    product({ id: "out", name: "Zebra", price: 5, track_inventory: true }),
    product({ id: "in1", name: "Apple", price: 30, track_inventory: true }),
    product({ id: "untracked", name: "Milk", price: 15, track_inventory: false }),
    product({ id: "in2", name: "Bread", price: 10, track_inventory: true }),
  ];

  const outOfStockIds = new Set(["out"]);

  function isOutOfStock(p: Product) {
    return outOfStockIds.has(p.id);
  }

  test("sorts by priceAsc without stockFirst", () => {
    const sorted = sortPosProducts(products, {
      sort: "priceAsc",
      stockFirst: false,
      locale: "en",
      isOutOfStock,
    });
    expect(sorted.map((p) => p.id)).toEqual([
      "out",
      "in2",
      "untracked",
      "in1",
    ]);
  });

  test("stockFirst puts available products before out-of-stock", () => {
    const sorted = sortPosProducts(products, {
      sort: "priceAsc",
      stockFirst: true,
      locale: "en",
      isOutOfStock,
    });
    expect(sorted.map((p) => p.id)).toEqual([
      "in2",
      "untracked",
      "in1",
      "out",
    ]);
  });

  test("stockFirst with nameAsc keeps groups sorted", () => {
    const sorted = sortPosProducts(products, {
      sort: "nameAsc" as PosProductSort,
      stockFirst: true,
      locale: "en",
      isOutOfStock,
    });
    expect(sorted.map((p) => p.id)).toEqual([
      "in1",
      "in2",
      "untracked",
      "out",
    ]);
  });

  test("does not mutate input array", () => {
    const copy = [...products];
    sortPosProducts(products, {
      sort: "priceDesc",
      stockFirst: true,
      locale: "en",
      isOutOfStock,
    });
    expect(products.map((p) => p.id)).toEqual(copy.map((p) => p.id));
  });
});
