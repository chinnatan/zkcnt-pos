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
      createOrderWithItems: vi.fn(async () => ({
        id: realId,
        store: storeId,
        total: 100,
        updated: now,
      })),
      collectionCreate: vi.fn(),
      syncDelta: vi.fn().mockResolvedValue({}),
    };

    const engine = new SyncEngine(mockApi as never, storeId);
    await engine.drainSyncQueue();

    expect(mockApi.createOrderWithItems).toHaveBeenCalledWith(
      storeId,
      expect.objectContaining({ client_id: "client-1" }),
      [],
    );

    expect(await db.orders.get(realId)).toBeDefined();
    expect(await db.orders.get(tempId)).toBeUndefined();

    const pending = await db.syncQueue.where("status").equals("pending").count();
    expect(pending).toBe(0);
  });

  test("bundles order_items with order create and clears item queue", async () => {
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

    await db.orderItems.add({
      id: "temp_item_1",
      store: storeId,
      order: tempOrderId,
      product: "prod-1",
      product_name: "Test",
      product_price: 50,
      quantity: 1,
      unit_price: 50,
      discount: 0,
      total: 50,
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
        unit_price: 50,
        discount: 0,
      },
    });

    const mockApi = {
      createOrderWithItems: vi.fn(async () => ({
        id: realOrderId,
        store: storeId,
        total: 50,
        updated: now,
      })),
      collectionCreate: vi.fn(),
      syncDelta: vi.fn().mockResolvedValue({}),
    };

    const engine = new SyncEngine(mockApi as never, storeId);
    await engine.drainSyncQueue();

    expect(mockApi.createOrderWithItems).toHaveBeenCalledWith(
      storeId,
      expect.objectContaining({ client_id: "client-2" }),
      expect.arrayContaining([
        expect.objectContaining({ product: "prod-1", quantity: 1 }),
      ]),
    );
    expect(mockApi.collectionCreate).not.toHaveBeenCalled();

    const pending = await db.syncQueue.where("status").equals("pending").count();
    expect(pending).toBe(0);
  });

  test("resolves orphaned order_items via client_id when order already synced", async () => {
    const storeId = "store-1";
    const tempOrderId = "temp_client-3";
    const realOrderId = "real-order-3";
    const now = new Date().toISOString();

    await db.orders.add({
      id: realOrderId,
      store: storeId,
      order_number: "OFF-003",
      status: "completed",
      subtotal: 30,
      discount: 0,
      tax: 0,
      total: 30,
      payment_method: "cash",
      payment_received: 30,
      change_amount: 0,
      customer: "",
      cashier: "user-1",
      note: "",
      client_id: "client-3",
      applied_promotions: "[]",
      created: now,
      updated: now,
    });

    await addToSyncQueue({
      store: storeId,
      collection: "order_items",
      record_id: "temp_item_orphan",
      action: "create",
      data: {
        order: tempOrderId,
        product: "prod-2",
        quantity: 1,
        unit_price: 30,
        discount: 0,
      },
    });

    const mockApi = {
      createOrderWithItems: vi.fn(),
      collectionCreate: vi.fn(
        async (_storeId: string, collection: string, data: Record<string, unknown>) => {
          if (collection === "order_items") {
            return {
              id: "real-item-orphan",
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

    expect(mockApi.collectionCreate).toHaveBeenCalledWith(
      storeId,
      "order_items",
      expect.objectContaining({ order: realOrderId }),
    );

    const pending = await db.syncQueue.where("status").equals("pending").count();
    expect(pending).toBe(0);
  });

  test("recovers in_flight order and syncs before order_items", async () => {
    const storeId = "store-1";
    const tempOrderId = "temp_stuck-order";
    const realOrderId = "real-stuck-order";
    const now = new Date().toISOString();

    await db.orders.add({
      id: tempOrderId,
      store: storeId,
      order_number: "OFF-004",
      status: "completed",
      subtotal: 80,
      discount: 0,
      tax: 0,
      total: 80,
      payment_method: "cash",
      payment_received: 80,
      change_amount: 0,
      customer: "",
      cashier: "user-1",
      note: "",
      client_id: "client-stuck",
      applied_promotions: "[]",
      created: now,
      updated: now,
    });

    await db.orderItems.bulkAdd([
      {
        id: "temp_stuck_item_1",
        store: storeId,
        order: tempOrderId,
        product: "prod-a",
        product_name: "A",
        product_price: 40,
        quantity: 1,
        unit_price: 40,
        discount: 0,
        total: 40,
        created: now,
        updated: now,
      },
      {
        id: "temp_stuck_item_2",
        store: storeId,
        order: tempOrderId,
        product: "prod-b",
        product_name: "B",
        product_price: 40,
        quantity: 1,
        unit_price: 40,
        discount: 0,
        total: 40,
        created: now,
        updated: now,
      },
    ]);

    await db.syncQueue.add({
      store: storeId,
      collection: "orders",
      record_id: tempOrderId,
      action: "create",
      status: "in_flight",
      retry_count: 0,
      created_at: now,
      error_message: "",
      data: { store: storeId, client_id: "client-stuck", total: 80 },
    });

    await db.syncQueue.add({
      store: storeId,
      collection: "order_items",
      record_id: "temp_stuck_item_1",
      action: "create",
      status: "error",
      retry_count: 7,
      created_at: now,
      error_message: "Order not found",
      data: { order: tempOrderId, product: "prod-a", quantity: 1, unit_price: 40, discount: 0 },
    });

    await db.syncQueue.add({
      store: storeId,
      collection: "order_items",
      record_id: "temp_stuck_item_2",
      action: "create",
      status: "error",
      retry_count: 7,
      created_at: now,
      error_message: "Order not found",
      data: { order: tempOrderId, product: "prod-b", quantity: 1, unit_price: 40, discount: 0 },
    });

    const mockApi = {
      createOrderWithItems: vi.fn(async () => ({
        id: realOrderId,
        store: storeId,
        total: 80,
        updated: now,
      })),
      collectionCreate: vi.fn(),
      syncDelta: vi.fn().mockResolvedValue({}),
    };

    const engine = new SyncEngine(mockApi as never, storeId);
    await engine.drainSyncQueue();

    expect(mockApi.createOrderWithItems).toHaveBeenCalledTimes(1);
    expect(mockApi.collectionCreate).not.toHaveBeenCalled();

    const remaining = await db.syncQueue.count();
    expect(remaining).toBe(0);
  });
});
