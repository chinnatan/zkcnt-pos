import { and, eq, gte, inArray, lte, SQL } from "drizzle-orm";
import { db } from "../db/client";
import { withTransaction, type DbExecutor } from "../db/executor";
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

export type PurgeMode = "all" | "filtered" | "orders";
export type PurgeScope =
  | "orders"
  | "inventory_transactions"
  | "audit_events"
  | "customers";

export interface PurgeTransactionHistoryOptions {
  mode: PurgeMode;
  scopes?: PurgeScope[];
  since?: string;
  until?: string;
  deleteCustomers?: boolean;
  orderIds?: string[];
}

export interface PurgeTransactionHistoryResult {
  mode: PurgeMode;
  orders: number;
  order_items: number;
  promotion_usages: number;
  inventory_transactions: number;
  audit_events: number;
  customers_reset: number;
  customers_deleted: number;
  transaction_history_cleared_at: string;
}

function emptyResult(mode: PurgeMode, clearedAt: string): PurgeTransactionHistoryResult {
  return {
    mode,
    orders: 0,
    order_items: 0,
    promotion_usages: 0,
    inventory_transactions: 0,
    audit_events: 0,
    customers_reset: 0,
    customers_deleted: 0,
    transaction_history_cleared_at: clearedAt,
  };
}

function dateConditions(
  column: typeof orders.created | typeof inventoryTransactions.created | typeof auditEvents.created,
  since?: string,
  until?: string,
): SQL[] {
  const parts: SQL[] = [];
  if (since) parts.push(gte(column, since));
  if (until) parts.push(lte(column, until));
  return parts;
}

async function deleteOrdersByIds(
  tx: DbExecutor,
  storeId: string,
  orderIds: string[],
): Promise<{ orders: number; order_items: number; promotion_usages: number; inventory_transactions: number }> {
  if (orderIds.length === 0) {
    return { orders: 0, order_items: 0, promotion_usages: 0, inventory_transactions: 0 };
  }

  const itemRows = await tx
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(inArray(orderItems.order, orderIds));

  const usageRows = await tx
    .select({ id: promotionUsages.id })
    .from(promotionUsages)
    .where(
      and(
        eq(promotionUsages.store, storeId),
        inArray(promotionUsages.order, orderIds),
      ),
    );

  const invTxRows = await tx
    .select({ id: inventoryTransactions.id })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.store, storeId),
        inArray(inventoryTransactions.reference, orderIds),
      ),
    );

  if (invTxRows.length > 0) {
    await tx
      .delete(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.store, storeId),
          inArray(inventoryTransactions.reference, orderIds),
        ),
      );
  }

  await tx
    .delete(orders)
    .where(and(eq(orders.store, storeId), inArray(orders.id, orderIds)));

  return {
    orders: orderIds.length,
    order_items: itemRows.length,
    promotion_usages: usageRows.length,
    inventory_transactions: invTxRows.length,
  };
}

async function purgeCustomers(
  tx: DbExecutor,
  storeId: string,
  clearedAt: string,
  deleteCustomers: boolean,
): Promise<{ customers_reset: number; customers_deleted: number }> {
  const customerRows = await tx
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.store, storeId), notDeleted(customers.deletedAt)));
  const activeCustomerCount = customerRows.length;
  if (activeCustomerCount === 0) {
    return { customers_reset: 0, customers_deleted: 0 };
  }

  if (deleteCustomers) {
    await tx
      .update(customers)
      .set({ deletedAt: clearedAt, updated: clearedAt })
      .where(and(eq(customers.store, storeId), notDeleted(customers.deletedAt)));
    return { customers_reset: 0, customers_deleted: activeCustomerCount };
  }

  await tx
    .update(customers)
    .set({ totalSpent: 0, visitCount: 0, updated: clearedAt })
    .where(and(eq(customers.store, storeId), notDeleted(customers.deletedAt)));
  return { customers_reset: activeCustomerCount, customers_deleted: 0 };
}

export async function purgeStoreTransactionHistory(
  storeId: string,
  options: PurgeTransactionHistoryOptions,
): Promise<PurgeTransactionHistoryResult> {
  const clearedAt = nowIso();
  const mode = options.mode;

  return withTransaction(db, async (tx) => {
    const storeRows = await tx
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    if (!storeRows[0]) {
      throw new Error("Store not found");
    }

    const result = emptyResult(mode, clearedAt);

    if (mode === "all") {
      const orderRows = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.store, storeId));
      const orderIds = orderRows.map((row) => row.id);

      const orderPurge = await deleteOrdersByIds(tx, storeId, orderIds);
      result.orders = orderPurge.orders;
      result.order_items = orderPurge.order_items;
      result.promotion_usages = orderPurge.promotion_usages;
      // Remaining inventory txs (non-sale) + any already counted via order refs
      const remainingInv = await tx
        .select({ id: inventoryTransactions.id })
        .from(inventoryTransactions)
        .where(eq(inventoryTransactions.store, storeId));
      if (remainingInv.length > 0) {
        await tx
          .delete(inventoryTransactions)
          .where(eq(inventoryTransactions.store, storeId));
      }
      result.inventory_transactions =
        orderPurge.inventory_transactions + remainingInv.length;

      const auditRows = await tx
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(eq(auditEvents.store, storeId));
      if (auditRows.length > 0) {
        await tx.delete(auditEvents).where(eq(auditEvents.store, storeId));
      }
      result.audit_events = auditRows.length;

      const customerResult = await purgeCustomers(
        tx,
        storeId,
        clearedAt,
        options.deleteCustomers === true,
      );
      result.customers_reset = customerResult.customers_reset;
      result.customers_deleted = customerResult.customers_deleted;
    } else if (mode === "orders") {
      const requestedIds = [...new Set(options.orderIds ?? [])];
      const orderRows = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(eq(orders.store, storeId), inArray(orders.id, requestedIds)),
        );
      const foundIds = new Set(orderRows.map((row) => row.id));
      const missing = requestedIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new Error(`Order ids not found in store: ${missing.join(", ")}`);
      }

      const orderPurge = await deleteOrdersByIds(tx, storeId, requestedIds);
      result.orders = orderPurge.orders;
      result.order_items = orderPurge.order_items;
      result.promotion_usages = orderPurge.promotion_usages;
      result.inventory_transactions = orderPurge.inventory_transactions;
    } else {
      // filtered
      const scopes = new Set(options.scopes ?? []);
      const since = options.since;
      const until = options.until;

      if (scopes.has("orders")) {
        const orderRows = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.store, storeId),
              ...dateConditions(orders.created, since, until),
            ),
          );
        const orderPurge = await deleteOrdersByIds(
          tx,
          storeId,
          orderRows.map((row) => row.id),
        );
        result.orders = orderPurge.orders;
        result.order_items = orderPurge.order_items;
        result.promotion_usages = orderPurge.promotion_usages;
        result.inventory_transactions = orderPurge.inventory_transactions;
      }

      if (scopes.has("inventory_transactions")) {
        const invConditions = [
          eq(inventoryTransactions.store, storeId),
          ...dateConditions(inventoryTransactions.created, since, until),
        ];
        const invRows = await tx
          .select({ id: inventoryTransactions.id })
          .from(inventoryTransactions)
          .where(and(...invConditions));
        if (invRows.length > 0) {
          await tx
            .delete(inventoryTransactions)
            .where(and(...invConditions));
        }
        result.inventory_transactions += invRows.length;
      }

      if (scopes.has("audit_events")) {
        const auditConditions = [
          eq(auditEvents.store, storeId),
          ...dateConditions(auditEvents.created, since, until),
        ];
        const auditRows = await tx
          .select({ id: auditEvents.id })
          .from(auditEvents)
          .where(and(...auditConditions));
        if (auditRows.length > 0) {
          await tx.delete(auditEvents).where(and(...auditConditions));
        }
        result.audit_events = auditRows.length;
      }

      if (scopes.has("customers")) {
        const customerResult = await purgeCustomers(
          tx,
          storeId,
          clearedAt,
          options.deleteCustomers === true,
        );
        result.customers_reset = customerResult.customers_reset;
        result.customers_deleted = customerResult.customers_deleted;
      }
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

    return result;
  });
}
