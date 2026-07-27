import type { Product } from "~/lib/types";

export type PosProductSort =
  | "default"
  | "nameAsc"
  | "nameDesc"
  | "priceAsc"
  | "priceDesc";

export const POS_PRODUCT_SORT_OPTIONS: PosProductSort[] = [
  "default",
  "nameAsc",
  "nameDesc",
  "priceAsc",
  "priceDesc",
];

export function isPosProductSort(value: unknown): value is PosProductSort {
  return (
    typeof value === "string" &&
    (POS_PRODUCT_SORT_OPTIONS as string[]).includes(value)
  );
}

function compareName(a: Product, b: Product, locale: string): number {
  return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
}

export function comparePosProducts(
  a: Product,
  b: Product,
  sort: PosProductSort,
  locale: string,
): number {
  switch (sort) {
    case "nameDesc":
      return compareName(b, a, locale);
    case "priceAsc": {
      const byPrice = a.price - b.price;
      return byPrice !== 0 ? byPrice : compareName(a, b, locale);
    }
    case "priceDesc": {
      const byPrice = b.price - a.price;
      return byPrice !== 0 ? byPrice : compareName(a, b, locale);
    }
    case "default":
    case "nameAsc":
    default:
      return compareName(a, b, locale);
  }
}

export interface SortPosProductsOptions {
  sort: PosProductSort;
  stockFirst: boolean;
  locale: string;
  isOutOfStock: (product: Product) => boolean;
}

export function sortPosProducts(
  products: Product[],
  options: SortPosProductsOptions,
): Product[] {
  const { sort, stockFirst, locale, isOutOfStock } = options;
  const compare = (a: Product, b: Product) =>
    comparePosProducts(a, b, sort, locale);

  if (!stockFirst) {
    return [...products].sort(compare);
  }

  const inStock: Product[] = [];
  const outOfStock: Product[] = [];

  for (const product of products) {
    const available =
      !product.track_inventory || !isOutOfStock(product);
    if (available) {
      inStock.push(product);
    } else {
      outOfStock.push(product);
    }
  }

  inStock.sort(compare);
  outOfStock.sort(compare);
  return [...inStock, ...outOfStock];
}
