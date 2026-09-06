import { describe, expect, test } from "vitest";
import { validateCartItems } from "~/lib/stock";
import type { CartItem, Product } from "~/lib/types";

function makeProduct(id: string, name: string, track = true): Product {
  return {
    id,
    store: "s1",
    name,
    sku: id,
    barcode: "",
    description: "",
    price: 100,
    cost: 0,
    category: "",
    image: "",
    unit: "",
    track_inventory: track,
    is_active: true,
    created: "",
    updated: "",
  };
}

function makeLine(
  product: Product,
  quantity: number,
  note = "",
): CartItem {
  return {
    line_id: `${product.id}-${note}-${quantity}`,
    product,
    quantity,
    discount: 0,
    free_quantity: 0,
    promotion_id: "",
    note,
  };
}

describe("validateCartItems", () => {
  test("aggregates split lines for the same product before stock check", () => {
    const product = makeProduct("p1", "Coffee");
    const stockMap = new Map([["p1", 2]]);

    const shortages = validateCartItems(
      [
        makeLine(product, 1, "no sugar"),
        makeLine(product, 2, "less sweet"),
      ],
      stockMap,
    );

    expect(shortages).toHaveLength(1);
    expect(shortages[0]).toMatchObject({
      productId: "p1",
      available: 2,
      requested: 3,
    });
  });

  test("passes when aggregated qty is within stock", () => {
    const product = makeProduct("p1", "Coffee");
    const stockMap = new Map([["p1", 3]]);

    const shortages = validateCartItems(
      [makeLine(product, 1, "a"), makeLine(product, 2, "b")],
      stockMap,
    );

    expect(shortages).toHaveLength(0);
  });
});
