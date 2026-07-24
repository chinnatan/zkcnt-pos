import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { withTransaction } from "../db/executor";
import {
  auditEvents,
  customers,
  inventoryTransactions,
  orderItems,
  orders,
  promotionUsages,
  stores,
} from "../db/schema";
import type { StoreSettings } from "../lib/types";
import { notDeleted } from "../lib/soft-delete";
import { nowIso } from "../lib/timestamps";

export interface PurgeTransactionHistoryOptions {
  deleteCustomers: boolean;
}

export interface PurgeTransactionHistoryResult {
  orders: number;
  order_items: number;
  promotion_usages: number;
  inventory_transactions: number;
  audit_events: number;
  customers_reset: number;
  customers_deleted: number;
  transaction_history_cleared_at: string;
}

export async function purgeStoreTransactionHistory(
  storeId: string,
  options: PurgeTransactionHistoryOptions,
): Promise<PurgeTransactionHistoryResult> {
  const clearedAt = nowIso();

  return withTransaction(db, async (tx) => {
    const storeRows = await tx
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    if (!storeRows[0]) {
      throw new Error("Store not found");
    }

    const orderRows = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.store, storeId));
    const orderIds = orderRows.map((row) => row.id);
    const ordersCount = orderIds.length;

    let orderItemsCount = 0;
    if (orderIds.length > 0) {
      const itemRows = await tx
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(inArray(orderItems.order, orderIds));
      orderItemsCount = itemRows.length;
    }

    const usageRows = await tx
      .select({ id: promotionUsages.id })
      .from(promotionUsages)
      .where(eq(promotionUsages.store, storeId));
    const usagesCount = usageRows.length;

    const invTxRows = await tx
      .select({ id: inventoryTransactions.id })
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.store, storeId));
    const invTxCount = invTxRows.length;

    const auditRows = await tx
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(eq(auditEvents.store, storeId));
    const auditCount = auditRows.length;

    const customerRows = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(eq(customers.store, storeId), notDeleted(customers.deletedAt)),
      );
    const activeCustomerCount = customerRows.length;

    if (ordersCount > 0) {
      await tx.delete(orders).where(eq(orders.store, storeId));
    }

    await tx
      .delete(inventoryTransactions)
      .where(eq(inventoryTransactions.store, storeId));
    await tx.delete(auditEvents).where(eq(auditEvents.store, storeId));

    let customersReset = 0;
    let customersDeleted = 0;
    if (options.deleteCustomers) {
      if (activeCustomerCount > 0) {
        await tx
          .update(customers)
          .set({ deletedAt: clearedAt, updated: clearedAt })
          .where(
            and(eq(customers.store, storeId), notDeleted(customers.deletedAt)),
          );
      }
      customersDeleted = activeCustomerCount;
    } else if (activeCustomerCount > 0) {
      await tx
        .update(customers)
        .set({ totalSpent: 0, visitCount: 0, updated: clearedAt })
        .where(
          and(eq(customers.store, storeId), notDeleted(customers.deletedAt)),
        );
      customersReset = activeCustomerCount;
    }

    const currentSettings = (storeRows[0].settings ?? {}) as StoreSettings;
    const nextSettings: StoreSettings = {
      ...currentSettings,
      transaction_history_cleared_at: clearedAt,
    };

    await tx
      .update(stores)
      .set({ settings: nextSettings, updated: clearedAt })
      .where(eq(stores.id, storeId));

    return {
      orders: ordersCount,
      order_items: orderItemsCount,
      promotion_usages: usagesCount,
      inventory_transactions: invTxCount,
      audit_events: auditCount,
      customers_reset: customersReset,
      customers_deleted: customersDeleted,
      transaction_history_cleared_at: clearedAt,
    };
  });
}
