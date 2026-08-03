import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import { generateClientId } from "~/lib/sync/conflict";
import {
  buildStockMap,
  validateOrderItems,
  type StockShortage,
} from "~/lib/stock";
import type { Inventory, Order, OrderItem, Product } from "~/lib/types";

export class InsufficientStockError extends Error {
  shortages: StockShortage[];

  constructor(shortages: StockShortage[]) {
    super("insufficient_stock");
    this.name = "InsufficientStockError";
    this.shortages = shortages;
  }
}

async function loadStockContext(storeId: string) {
  const [inventory, products] = await Promise.all([
    db.inventory.where("store").equals(storeId).toArray(),
    db.products.where("store").equals(storeId).toArray(),
  ]);

  const stockMap = buildStockMap(inventory as Inventory[]);
  const trackInventoryByProduct = new Map<string, boolean>();
  for (const product of products as Product[]) {
    trackInventoryByProduct.set(product.id, product.track_inventory ?? false);
  }

  return { stockMap, trackInventoryByProduct, inventory: inventory as Inventory[] };
}

async function deductLocalInventory(
  storeId: string,
  items: Array<{ product_id: string; quantity: number }>,
  trackInventoryByProduct: Map<string, boolean>,
) {
  const now = new Date().toISOString();

  for (const item of items) {
    if (!trackInventoryByProduct.get(item.product_id)) continue;

    const inv = await db.inventory
      .where("[store+product]")
      .equals([storeId, item.product_id])
      .first();

    if (!inv) continue;

    const afterQty = inv.quantity - item.quantity;
    await db.inventory.update(inv.id, { quantity: afterQty, updated: now });
    await addToSyncQueue({
      collection: "inventory",
      action: "update",
      record_id: inv.id,
      data: { quantity: afterQty },
      store: storeId,
    });
  }
}

type OrderListItem = Order & { items?: OrderItem[] };

function stripOrderItems(order: OrderListItem): Order {
  const { items: _items, ...rest } = order;
  return rest;
}

async function loadLocalOrderItems(orderIds: string[]) {
  const byId: Record<string, OrderItem[]> = {};
  if (orderIds.length === 0) return byId;

  const allItems = await db.orderItems
    .where("order")
    .anyOf(orderIds)
    .toArray();

  for (const item of allItems as OrderItem[]) {
    const list = byId[item.order];
    if (list) list.push(item);
    else byId[item.order] = [item];
  }
  return byId;
}

function mergeItemsMaps(
  primary: Record<string, OrderItem[]>,
  fallback: Record<string, OrderItem[]>,
) {
  const merged: Record<string, OrderItem[]> = { ...primary };
  for (const [orderId, items] of Object.entries(fallback)) {
    if (!merged[orderId]?.length && items.length > 0) {
      merged[orderId] = items;
    }
  }
  return merged;
}

export function useOrders() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();
  const { authUser } = useAuth();

  const orders = ref<Order[]>([]);
  const orderItemsById = ref<Record<string, OrderItem[]>>({});
  const isLoading = ref(false);

  async function hydrateMissingOrderItems(orderIds: string[]) {
    if (!isOnline.value || !activeStoreId.value) return;
    const missing = orderIds.filter((id) => !orderItemsById.value[id]?.length);
    if (missing.length === 0) return;

    const results = await Promise.all(
      missing.map(async (orderId) => {
        try {
          const records = await $api.send<OrderItem[]>(
            `/stores/${activeStoreId.value}/orders/${orderId}/items`,
          );
          return [orderId, records] as const;
        } catch {
          return [orderId, [] as OrderItem[]] as const;
        }
      }),
    );

    const next = { ...orderItemsById.value };
    const toPut: OrderItem[] = [];
    for (const [orderId, records] of results) {
      if (records.length === 0) continue;
      next[orderId] = records;
      toPut.push(...records);
    }
    orderItemsById.value = next;
    if (toPut.length > 0) {
      await db.orderItems.bulkPut(toPut);
    }
  }

  async function fetchOrders(limit = 50) {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const result = await $api.send<{ items: OrderListItem[] }>(
          `/stores/${activeStoreId.value}/orders?limit=${limit}`,
        );
        const cleaned = result.items.map(stripOrderItems);
        const itemsMap: Record<string, OrderItem[]> = {};
        const allLineItems: OrderItem[] = [];
        let apiReturnedLineItems = false;

        for (const row of result.items) {
          // Only cache when API actually returned line items (avoid empty []
          // short-circuiting getOrderItems against an older backend).
          if (Array.isArray(row.items) && row.items.length > 0) {
            apiReturnedLineItems = true;
            itemsMap[row.id] = row.items as OrderItem[];
            allLineItems.push(...(row.items as OrderItem[]));
          }
        }

        const localItems = await loadLocalOrderItems(cleaned.map((o) => o.id));
        const merged = mergeItemsMaps(itemsMap, localItems);

        orders.value = cleaned;
        orderItemsById.value = merged;
        await db.orders.bulkPut(cleaned);
        if (allLineItems.length > 0) {
          await db.orderItems.bulkPut(allLineItems);
        }

        // Older API (no nested items) or empty Dexie — fill summaries via /items.
        if (!apiReturnedLineItems && cleaned.length > 0) {
          await hydrateMissingOrderItems(cleaned.map((o) => o.id));
        }
      } else {
        const local = await db.orders
          .where("store")
          .equals(activeStoreId.value)
          .reverse()
          .sortBy("created");
        const sliced = local.slice(0, limit) as Order[];
        orders.value = sliced;
        orderItemsById.value = await loadLocalOrderItems(
          sliced.map((o) => o.id),
        );
      }
    } catch {
      const local = await db.orders
        .where("store")
        .equals(activeStoreId.value)
        .reverse()
        .sortBy("created");
      const sliced = local.slice(0, limit) as Order[];
      orders.value = sliced;
      orderItemsById.value = await loadLocalOrderItems(
        sliced.map((o) => o.id),
      );
    } finally {
      isLoading.value = false;
    }
  }

  async function createOrder(orderData: {
    items: Array<{
      product_id: string;
      product_name: string;
      product_price: number;
      quantity: number;
      unit_price: number;
      discount: number;
      total: number;
      category_id?: string;
      promotion_id?: string;
      free_quantity?: number;
    }>;
    subtotal: number;
    discount_amount: number;
    discount_type: string;
    tax_amount: number;
    total: number;
    payment_method: string;
    payment_received: number;
    change_amount: number;
    customer?: string;
    note?: string;
    coupon_code?: string;
    applied_promotions?: Array<{
      promotion_id: string;
      name: string;
      amount: number;
      coupon_code?: string;
    }>;
  }): Promise<Order> {
    if (!activeStoreId.value || !authUser.value) {
      throw new Error("Not authenticated or no active store");
    }

    const clientId = generateClientId();
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const order = {
      store: activeStoreId.value,
      order_number: orderNumber,
      client_id: clientId,
      customer: orderData.customer || "",
      cashier: authUser.value.id,
      subtotal: orderData.subtotal,
      discount_amount: orderData.discount_amount,
      discount_type: orderData.discount_type || "",
      tax_amount: orderData.tax_amount,
      total: orderData.total,
      payment_method: orderData.payment_method,
      payment_received: orderData.payment_received,
      change_amount: orderData.change_amount,
      status: "completed",
      note: orderData.note || "",
      synced_at: isOnline.value ? now : "",
      coupon_code: orderData.coupon_code || "",
      applied_promotions: orderData.applied_promotions || [],
    };

    const items = orderData.items.map((item) => ({
      product: item.product_id,
      product_id: item.product_id,
      category_id: item.category_id || "",
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      total: item.total,
      promotion_id: item.promotion_id || "",
      free_quantity: item.free_quantity ?? 0,
    }));

    if (isOnline.value) {
      try {
        const record = await $api.send<Order>(
          `/stores/${activeStoreId.value}/orders`,
          { method: "POST", body: { order, items } },
        );
        await db.orders.put(record);

        const itemRecords = await $api.send<OrderItem[]>(
          `/stores/${activeStoreId.value}/orders/${record.id}/items`,
        );
        await db.orderItems.bulkPut(itemRecords);

        return record;
      } catch (err) {
        if (
          err instanceof Error &&
          err.message === "insufficient_stock"
        ) {
          throw new InsufficientStockError([]);
        }
        return await saveOrderOffline(order, orderData.items, clientId);
      }
    }

    return await saveOrderOffline(order, orderData.items, clientId);
  }

  async function saveOrderOffline(
    order: Record<string, unknown>,
    items: Array<{
      product_id: string;
      product_name: string;
      product_price: number;
      quantity: number;
      unit_price: number;
      discount: number;
      total: number;
      category_id?: string;
      promotion_id?: string;
      free_quantity?: number;
    }>,
    clientId: string,
  ) {
    const storeId = String(order.store);
    const { stockMap, trackInventoryByProduct } = await loadStockContext(storeId);

    const shortages = validateOrderItems(
      items,
      stockMap,
      trackInventoryByProduct,
    );
    if (shortages.length > 0) {
      throw new InsufficientStockError(shortages);
    }
    const orderId = `temp_${clientId}`;
    const now = new Date().toISOString();

    const localOrder = { ...order, id: orderId, created: now, updated: now };
    await db.orders.put(localOrder as Order);
    await addToSyncQueue({
      collection: "orders",
      action: "create",
      record_id: orderId,
      data: order,
      store: String(order.store),
    });

    for (const item of items) {
      const itemId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const orderItem = {
        id: itemId,
        order: orderId,
        product: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
        promotion_id: item.promotion_id || "",
        free_quantity: item.free_quantity ?? 0,
        created: now,
        updated: now,
      };
      await db.orderItems.put(orderItem as OrderItem);
      await addToSyncQueue({
        collection: "order_items",
        action: "create",
        record_id: itemId,
        data: {
          order: orderId,
          product: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          total: item.total,
          promotion_id: item.promotion_id || "",
          free_quantity: item.free_quantity ?? 0,
        },
        store: String(order.store),
      });
    }

    await deductLocalInventory(storeId, items, trackInventoryByProduct);

    return localOrder as Order;
  }

  function generateOrderNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${date}-${time}-${rand}`;
  }

  async function getOrderItems(orderId: string): Promise<OrderItem[]> {
    const cached = orderItemsById.value[orderId];
    if (cached && cached.length > 0) {
      return cached;
    }

    try {
      if (isOnline.value && activeStoreId.value && !orderId.startsWith("temp_")) {
        const records = await $api.send<OrderItem[]>(
          `/stores/${activeStoreId.value}/orders/${orderId}/items`,
        );
        orderItemsById.value = {
          ...orderItemsById.value,
          [orderId]: records,
        };
        if (records.length > 0) {
          await db.orderItems.bulkPut(records);
        }
        return records;
      }
    } catch {
      // fallback
    }
    const local = await db.orderItems.where("order").equals(orderId).toArray();
    const items = local as OrderItem[];
    orderItemsById.value = {
      ...orderItemsById.value,
      [orderId]: items,
    };
    return items;
  }

  async function updateOrderStatus(
    orderId: string,
    status: "voided" | "refunded",
    reason?: string,
  ): Promise<Order> {
    if (!activeStoreId.value) {
      throw new Error("No active store");
    }
    if (!isOnline.value) {
      throw new Error("Void/refund requires online connection");
    }

    const record = await $api.send<Order>(
      `/stores/${activeStoreId.value}/orders/${orderId}`,
      { method: "PATCH", body: { status, reason: reason ?? "" } },
    );
    await db.orders.put(record);
    const idx = orders.value.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      orders.value = [
        ...orders.value.slice(0, idx),
        record,
        ...orders.value.slice(idx + 1),
      ];
    }
    return record;
  }

  return {
    orders: readonly(orders),
    orderItemsById: readonly(orderItemsById),
    isLoading: readonly(isLoading),
    fetchOrders,
    createOrder,
    getOrderItems,
    updateOrderStatus,
  };
}
