import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import { generateClientId } from "~/lib/sync/conflict";
import type { Order, OrderItem } from "~/lib/types";

export function useOrders() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();
  const { authUser } = useAuth();

  const orders = ref<Order[]>([]);
  const isLoading = ref(false);

  async function fetchOrders(limit = 50) {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const result = await $api.send<{ items: Order[] }>(
          `/stores/${activeStoreId.value}/orders?limit=${limit}`,
        );
        orders.value = result.items;
        await db.orders.bulkPut(result.items);
      } else {
        const local = await db.orders
          .where("store")
          .equals(activeStoreId.value)
          .reverse()
          .sortBy("created");
        orders.value = local.slice(0, limit) as Order[];
      }
    } catch {
      const local = await db.orders
        .where("store")
        .equals(activeStoreId.value)
        .reverse()
        .sortBy("created");
      orders.value = local.slice(0, limit) as Order[];
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
    };

    const items = orderData.items.map((item) => ({
      product: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      total: item.total,
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
      } catch {
        return await saveOrderOffline(order, orderData.items, clientId);
      }
    }

    return await saveOrderOffline(order, orderData.items, clientId);
  }

  async function saveOrderOffline(order: Record<string, unknown>, items: Array<Record<string, unknown>>, clientId: string) {
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
        },
        store: String(order.store),
      });
    }

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
    try {
      if (isOnline.value && activeStoreId.value && !orderId.startsWith("temp_")) {
        const records = await $api.send<OrderItem[]>(
          `/stores/${activeStoreId.value}/orders/${orderId}/items`,
        );
        return records;
      }
    } catch {
      // fallback
    }
    const local = await db.orderItems.where("order").equals(orderId).toArray();
    return local as OrderItem[];
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
    isLoading: readonly(isLoading),
    fetchOrders,
    createOrder,
    getOrderItems,
    updateOrderStatus,
  };
}
