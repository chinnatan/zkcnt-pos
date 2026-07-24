import { db } from "../db";
import type { Store } from "../types";
import { createLogger } from "../logger";

const logger = createLogger("purge-transactional");

const TXN_CLEAR_ACK_PREFIX = "txn_clear_ack_";

const SYNC_QUEUE_COLLECTIONS = new Set([
  "orders",
  "order_items",
  "inventory_transactions",
  "promotion_usages",
]);

export function txnClearAckKey(storeId: string): string {
  return `${TXN_CLEAR_ACK_PREFIX}${storeId}`;
}

export function getTxnClearAck(storeId: string): string | null {
  if (!import.meta.client) return null;
  return localStorage.getItem(txnClearAckKey(storeId));
}

export function setTxnClearAck(storeId: string, clearedAt: string): void {
  if (!import.meta.client) return;
  localStorage.setItem(txnClearAckKey(storeId), clearedAt);
}

export async function purgeLocalTransactionalData(
  storeId: string,
  options: { deleteCustomers?: boolean } = {},
): Promise<void> {
  const orderRows = await db.orders.where("store").equals(storeId).toArray();
  const orderIds = orderRows.map((row) => row.id);

  if (orderIds.length > 0) {
    await db.orderItems.where("order").anyOf(orderIds).delete();
  }
  await db.orders.where("store").equals(storeId).delete();
  await db.promotionUsages.where("store").equals(storeId).delete();

  const queueItems = await db.syncQueue
    .where("store")
    .equals(storeId)
    .toArray();
  for (const item of queueItems) {
    if (item.id == null) continue;
    if (SYNC_QUEUE_COLLECTIONS.has(item.collection)) {
      await db.syncQueue.delete(item.id);
    }
  }

  if (options.deleteCustomers) {
    await db.customers.where("store").equals(storeId).delete();
  } else {
    const customers = await db.customers.where("store").equals(storeId).toArray();
    const now = new Date().toISOString();
    for (const customer of customers) {
      if (customer.deleted_at) continue;
      await db.customers.update(customer.id, {
        total_spent: 0,
        visit_count: 0,
        updated: now,
      });
    }
  }

  logger.info(`purged local transactional data storeId=${storeId}`);
}

export async function applyTransactionHistoryClearFromStore(
  store: Store,
): Promise<boolean> {
  const clearedAt = store.settings?.transaction_history_cleared_at;
  if (!clearedAt) return false;

  const ack = getTxnClearAck(store.id);
  if (ack && ack >= clearedAt) return false;

  await purgeLocalTransactionalData(store.id, { deleteCustomers: false });
  setTxnClearAck(store.id, clearedAt);
  return true;
}

export async function applyTransactionHistoryClearForStoreId(
  storeId: string,
): Promise<boolean> {
  const store = await db.stores.get(storeId);
  if (!store) return false;
  return applyTransactionHistoryClearFromStore(store as Store);
}
