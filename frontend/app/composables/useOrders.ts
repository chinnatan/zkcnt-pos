import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import { generateClientId } from "~/lib/sync/conflict";
import type { Order, OrderItem } from "~/lib/types";

export function useOrders() {
  const { $pb } = useNuxtApp();
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
        const records = await $pb.collection("orders").getList(1, limit, {
          filter: `store = "${activeStoreId.value}"`,
          sort: "-created",
        });
        orders.value = records.items as unknown as Order[];
        await db.orders.bulkPut(records.items);
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
  }) {
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

    if (isOnline.value) {
      try {
        const record = await $pb.collection("orders").create(order);
        await db.orders.put(record);

        // Create order items
        for (const item of orderData.items) {
          const orderItem = {
            order: record.id,
            product: item.product_id,
            product_name: item.product_name,
            product_price: item.product_price,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            total: item.total,
          };
          const itemRecord = await $pb.collection("order_items").create(orderItem);
          await db.orderItems.put(itemRecord);
        }

        return record;
      } catch {
        // Fallback to offline mode
        return await saveOrderOffline(order, orderData.items, clientId);
      }
    } else {
      return await saveOrderOffline(order, orderData.items, clientId);
    }
  }

  async function saveOrderOffline(
    order: any,
    items: any[],
    clientId: string
  ) {
    const orderId = `temp_${clientId}`;
    const now = new Date().toISOString();

    const localOrder = { ...order, id: orderId, created: now, updated: now };
    await db.orders.put(localOrder);
    await addToSyncQueue({
      collection: "orders",
      action: "create",
      record_id: orderId,
      data: order,
      store: order.store,
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
      await db.orderItems.put(orderItem);
      await addToSyncQueue({
        collection: "order_items",
        action: "create",
        record_id: itemId,
        data: { ...orderItem, id: undefined, order: orderId },
        store: order.store,
      });
    }

    return localOrder;
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
      if (isOnline.value) {
        const records = await $pb.collection("order_items").getFullList({
          filter: `order = "${orderId}"`,
        });
        return records as unknown as OrderItem[];
      }
    } catch {
      // fallback
    }
    const local = await db.orderItems.where("order").equals(orderId).toArray();
    return local as OrderItem[];
  }

  return {
    orders: readonly(orders),
    isLoading: readonly(isLoading),
    fetchOrders,
    createOrder,
    getOrderItems,
  };
}
