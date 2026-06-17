import type { CartItem, Inventory, Product } from "~/lib/types";

export interface StockShortage {
  productId: string;
  name: string;
  available: number;
  requested: number;
}

export function buildStockMap(
  inventory: ReadonlyArray<Pick<Inventory, "product" | "quantity">>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of inventory) {
    map.set(item.product, item.quantity);
  }
  return map;
}

export function getAvailableQty(
  stockMap: Map<string, number>,
  productId: string,
): number {
  return stockMap.get(productId) ?? 0;
}

export function canAddToCart(
  product: Product,
  currentCartQty: number,
  stockMap: Map<string, number>,
): boolean {
  if (!product.track_inventory) return true;
  return currentCartQty < getAvailableQty(stockMap, product.id);
}

export function maxCartQty(
  product: Product,
  stockMap: Map<string, number>,
): number {
  if (!product.track_inventory) return Infinity;
  return Math.max(0, getAvailableQty(stockMap, product.id));
}

export function isOutOfStock(
  product: Product,
  stockMap: Map<string, number>,
): boolean {
  if (!product.track_inventory) return false;
  return getAvailableQty(stockMap, product.id) <= 0;
}

export function validateCartItems(
  items: CartItem[],
  stockMap: Map<string, number>,
): StockShortage[] {
  const shortages: StockShortage[] = [];

  for (const item of items) {
    if (!item.product.track_inventory) continue;

    const available = getAvailableQty(stockMap, item.product.id);
    if (item.quantity > available) {
      shortages.push({
        productId: item.product.id,
        name: item.product.name,
        available,
        requested: item.quantity,
      });
    }
  }

  return shortages;
}

export function validateOrderItems(
  items: Array<{ product_id: string; product_name: string; quantity: number }>,
  stockMap: Map<string, number>,
  trackInventoryByProduct: Map<string, boolean>,
): StockShortage[] {
  const qtyByProduct = new Map<string, { name: string; quantity: number }>();

  for (const item of items) {
    const existing = qtyByProduct.get(item.product_id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      qtyByProduct.set(item.product_id, {
        name: item.product_name,
        quantity: item.quantity,
      });
    }
  }

  const shortages: StockShortage[] = [];

  for (const [productId, { name, quantity }] of qtyByProduct) {
    if (!trackInventoryByProduct.get(productId)) continue;

    const available = getAvailableQty(stockMap, productId);
    if (quantity > available) {
      shortages.push({
        productId,
        name,
        available,
        requested: quantity,
      });
    }
  }

  return shortages;
}
