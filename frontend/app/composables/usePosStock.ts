import {
  buildStockMap,
  canAddToCart as canAddToCartFn,
  getAvailableQty as getAvailableQtyFn,
  isOutOfStock as isOutOfStockFn,
  maxCartQty as maxCartQtyFn,
  validateCartItems as validateCartItemsFn,
  type StockShortage,
} from "~/lib/stock";
import type { CartItem, Product } from "~/lib/types";

export type { StockShortage };

export function usePosStock() {
  const { inventoryItems, fetchInventory } = useInventory();

  const stockMap = computed(() => buildStockMap(inventoryItems.value));

  function getAvailableQty(productId: string): number {
    return getAvailableQtyFn(stockMap.value, productId);
  }

  function canAddToCart(product: Product, currentCartQty: number): boolean {
    return canAddToCartFn(product, currentCartQty, stockMap.value);
  }

  function maxCartQty(product: Product): number {
    return maxCartQtyFn(product, stockMap.value);
  }

  function isOutOfStock(product: Product): boolean {
    return isOutOfStockFn(product, stockMap.value);
  }

  function validateCartItems(items: CartItem[]): StockShortage[] {
    return validateCartItemsFn(items, stockMap.value);
  }

  return {
    stockMap,
    fetchInventory,
    getAvailableQty,
    canAddToCart,
    maxCartQty,
    isOutOfStock,
    validateCartItems,
  };
}
