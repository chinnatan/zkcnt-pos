import { describe, expect, test, vi } from "vitest";
import { db } from "~/lib/db";
import { SyncEngine } from "~/lib/sync/engine";
import { addToSyncQueue } from "~/lib/sync/queue";

describe("SyncEngine offline order sync", () => {
  test("remaps temp_ order ID after drainSyncQueue", async () => {
    const storeId = "store-1";
    const tempId = "temp_order_1";
    const realId = "real-order-id";
    const now = new Date().toISOString();

    await db.orders.add({
      id: tempId,
      store: storeId,
      order_number: "OFF-001",
      status: "completed",
      subtotal: 100,
      discount: 0,
      tax: 0,
      total: 100,
      payment_method: "cash",
      payment_received: 100,
      change_amount: 0,
      customer: "",
      cashier: "user-1",
      note: "",
      client_id: "client-1",
      applied_promotions: "[]",
      created: now,
      updated: now,
    });

    await addToSyncQueue({
      store: storeId,
      collection: "orders",
      record_id: tempId,
      action: "create",
      data: {
        store: storeId,
        order_number: "OFF-001",
        status: "completed",
        total: 100,
        client_id: "client-1",
      },
    });

    const mockApi = {
      collectionCreate: vi.fn(async (_storeId: string, collection: string) => {
        if (collection === "orders") {
          return { id: realId, store: storeId, total: 100, updated: now };
        }
        return {};
      }),
      syncDelta: vi.fn().mockResolvedValue({}),
    };

    const engine = new SyncEngine(mockApi as never, storeId);
    await engine.drainSyncQueue();

    expect(mockApi.collectionCreate).toHaveBeenCalledWith(
      storeId,
      "orders",
      expect.objectContaining({ client_id: "client-1" }),
    );

    expect(await db.orders.get(realId)).toBeDefined();
    expect(await db.orders.get(tempId)).toBeUndefined();

    const pending = await db.syncQueue.where("status").equals("pending").count();
    expect(pending).toBe(0);
  });

  test("remaps order_items order field when order was temp_", async () => {
    const storeId = "store-1";
    const tempOrderId = "temp_order_2";
    const realOrderId = "real-order-2";
    const now = new Date().toISOString();

    await db.orders.add({
      id: tempOrderId,
      store: storeId,
      order_number: "OFF-002",
      status: "completed",
      subtotal: 50,
      discount: 0,
      tax: 0,
      total: 50,
      payment_method: "cash",
      payment_received: 50,
      change_amount: 0,
      customer: "",
      cashier: "user-1",
      note: "",
      client_id: "client-2",
      applied_promotions: "[]",
      created: now,
      updated: now,
    });

    await addToSyncQueue({
      store: storeId,
      collection: "orders",
      record_id: tempOrderId,
      action: "create",
      data: { store: storeId, client_id: "client-2", total: 50 },
    });

    await addToSyncQueue({
      store: storeId,
      collection: "order_items",
      record_id: "temp_item_1",
      action: "create",
      data: {
        order: tempOrderId,
        product: "prod-1",
        quantity: 1,
        price: 50,
        discount: 0,
      },
    });

    const mockApi = {
      collectionCreate: vi.fn(
        async (_storeId: string, collection: string, data: Record<string, unknown>) => {
          if (collection === "orders") {
            return { id: realOrderId, ...data, updated: now };
          }
          if (collection === "order_items") {
            return {
              id: "real-item-1",
              ...data,
              order: realOrderId,
              updated: now,
            };
          }
          return {};
        },
      ),
      syncDelta: vi.fn().mockResolvedValue({}),
    };

    const engine = new SyncEngine(mockApi as never, storeId);
    await engine.drainSyncQueue();

    const orderItemCall = mockApi.collectionCreate.mock.calls.find(
      (c) => c[1] === "order_items",
    );
    expect(orderItemCall?.[2].order).toBe(realOrderId);
  });
});
