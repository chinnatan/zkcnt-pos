import { describe, expect, test } from "vitest";
import { exceedsStock, filterProducts, groupByCategory, selectedCount, selectionState, stockOf } from "~/lib/booths/picker";
import type { Product } from "~/lib/types";

const p = (id: string, extra: Partial<Product> = {}) =>
  ({ id, name: `Item ${id}`, sku: `SKU-${id}`, category: "c1", track_inventory: true, ...extra }) as Product;

const products = [p("a"), p("b"), p("c", { category: "" }), p("d", { track_inventory: false })];
const stock = new Map([["a", 5], ["b", 0]]);

describe("booth product picker helpers", () => {
  test("stockOf: null for untracked, 0 for tracked without a row", () => {
    expect(stockOf(products[0]!, stock)).toBe(5);
    expect(stockOf(products[2]!, stock)).toBe(0);
    expect(stockOf(products[3]!, stock)).toBeNull();
  });

  test("filters: search, selected, unselected, out of stock", () => {
    const base = { search: "", filter: "all" as const, selected: new Set(["a"]), stock };
    expect(filterProducts(products, base)).toHaveLength(4);
    expect(filterProducts(products, { ...base, filter: "selected" }).map((x) => x.id)).toEqual(["a"]);
    expect(filterProducts(products, { ...base, filter: "unselected" }).map((x) => x.id)).toEqual(["b", "c", "d"]);
    // out of stock = tracked with no stock; untracked "d" never counts
    expect(filterProducts(products, { ...base, filter: "outOfStock" }).map((x) => x.id)).toEqual(["b", "c"]);
    expect(filterProducts(products, { ...base, search: "sku-b" }).map((x) => x.id)).toEqual(["b"]);
  });

  test("grouping keeps category order, uncategorized last", () => {
    const groups = groupByCategory(products, [{ id: "c1", name: "Stickers" }, { id: "c2", name: "Empty" }], "None");
    expect(groups.map((g) => g.name)).toEqual(["Stickers", "None"]);
    expect(groups[0]!.products.map((x) => x.id)).toEqual(["a", "b", "d"]);
  });

  test("selection state of a group", () => {
    expect(selectionState(products, new Set())).toBe("none");
    expect(selectionState(products, new Set(["a"]))).toBe("some");
    expect(selectionState(products, new Set(["a", "b", "c", "d"]))).toBe("all");
  });

  test("exceedsStock ignores untracked products", () => {
    expect(exceedsStock(6, 5)).toBe(true);
    expect(exceedsStock(5, 5)).toBe(false);
    expect(exceedsStock(999, null)).toBe(false);
  });

  test("products whose category no longer exists land in the uncategorized group", () => {
    const orphan = p("x", { category: "deleted-cat" });
    const groups = groupByCategory([p("a"), orphan], [{ id: "c1", name: "Stickers" }], "None");
    const shownIds = groups.flatMap((g) => g.products.map((x) => x.id));
    expect(shownIds.sort()).toEqual(["a", "x"]);
    expect(groups.at(-1)!.name).toBe("None");
  });

  test("selectedCount counts only products that are listed", () => {
    const listed = [p("a"), p("b")];
    // "z" belongs to a deactivated / deleted product, not in the list
    expect(selectedCount(listed, new Set(["a", "z"]))).toBe(1);
  });

  test("large mixed catalog: every product is reachable through some group", () => {
    const cats = [{ id: "c1", name: "A" }, { id: "c2", name: "B" }];
    const many = Array.from({ length: 60 }, (_, i) =>
      p(`p${i}`, { category: ["c1", "c2", "", "gone"][i % 4]!, track_inventory: i % 5 !== 0 }),
    );
    const groups = groupByCategory(many, cats, "None");
    expect(groups.flatMap((g) => g.products)).toHaveLength(60);
    const all = new Set(many.map((x) => x.id));
    expect(groups.every((g) => selectionState(g.products, all) === "all")).toBe(true);
  });
});
