import type { Product } from "~/lib/types";

export type PickerFilter = "all" | "selected" | "unselected" | "outOfStock";

/** Stock of a product, or null when the product does not track inventory. */
export function stockOf(product: Pick<Product, "id" | "track_inventory">, stock: Map<string, number>): number | null {
  return product.track_inventory ? (stock.get(product.id) ?? 0) : null;
}

export function filterProducts(
  products: Product[],
  opts: { search: string; filter: PickerFilter; selected: Set<string>; stock: Map<string, number> },
): Product[] {
  const q = opts.search.trim().toLowerCase();
  return products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false;
    if (opts.filter === "selected") return opts.selected.has(p.id);
    if (opts.filter === "unselected") return !opts.selected.has(p.id);
    if (opts.filter === "outOfStock") return (stockOf(p, opts.stock) ?? 1) <= 0;
    return true;
  });
}

export interface ProductGroup {
  id: string;
  name: string;
  products: Product[];
}

/** Groups by category in the given category order; products without a category go last. */
export function groupByCategory(
  products: Product[],
  categories: Array<{ id: string; name: string }>,
  uncategorizedLabel: string,
): ProductGroup[] {
  const byCat = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.category || "";
    byCat.set(key, [...(byCat.get(key) ?? []), p]);
  }
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return [...categories.map((c) => c.id), ""]
    .filter((id) => byCat.has(id))
    .map((id) => ({ id, name: names.get(id) ?? uncategorizedLabel, products: byCat.get(id)! }));
}

/** state of a category checkbox: none / some (indeterminate) / all selected */
export function selectionState(products: Product[], selected: Set<string>): "none" | "some" | "all" {
  const n = products.filter((p) => selected.has(p.id)).length;
  return n === 0 ? "none" : n === products.length ? "all" : "some";
}

/** true when more pieces are brought than the stock on hand (never for untracked products) */
export function exceedsStock(qty: number, stock: number | null): boolean {
  return stock !== null && qty > stock;
}
