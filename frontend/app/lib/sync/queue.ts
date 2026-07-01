import { db } from "../db";
import type { SyncQueueItem } from "../types";
import { createLogger } from "../logger";

const logger = createLogger("sync-queue");

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, "id" | "status" | "retry_count" | "created_at" | "error_message">
) {
  const id = await db.syncQueue.add({
    ...item,
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
    error_message: "",
  } as SyncQueueItem);
  logger.debug(
    `queued ${item.action} ${item.collection} ${item.record_id} id=${id}`,
  );
  return id;
}

export async function getPendingItems(storeId?: string): Promise<SyncQueueItem[]> {
  const items = await db.syncQueue
    .where("status")
    .anyOf(["pending", "error", "in_flight"])
    .sortBy("created_at");
  if (storeId) {
    return items.filter((i) => i.store === storeId) as SyncQueueItem[];
  }
  return items as SyncQueueItem[];
}

/** Recover queue entries stuck in in_flight from a crashed/interrupted sync. */
export async function resetInFlightToPending(storeId?: string) {
  const items = await db.syncQueue.where("status").equals("in_flight").toArray();
  for (const item of items) {
    if (item.id == null) continue;
    if (storeId && item.store !== storeId) continue;
    await db.syncQueue.update(item.id, { status: "pending" });
    logger.debug(
      `reset in_flight → pending ${item.collection} ${item.record_id}`,
    );
  }
}

export async function markDeferred(id: number) {
  return db.syncQueue.update(id, { status: "pending" });
}

export async function hasQueuedOrderCreate(
  tempOrderId: string,
  storeId: string,
): Promise<boolean> {
  const items = await db.syncQueue
    .where("status")
    .anyOf(["pending", "error", "in_flight"])
    .toArray();
  return items.some(
    (i) =>
      i.store === storeId &&
      i.collection === "orders" &&
      i.action === "create" &&
      i.record_id === tempOrderId,
  );
}

const COLLECTION_SYNC_PRIORITY: Record<string, number> = {
  orders: 0,
  order_items: 1,
};

export function sortSyncQueue(items: SyncQueueItem[]): SyncQueueItem[] {
  return [...items].sort((a, b) => {
    const pa = COLLECTION_SYNC_PRIORITY[a.collection] ?? 2;
    const pb = COLLECTION_SYNC_PRIORITY[b.collection] ?? 2;
    if (pa !== pb) return pa - pb;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function markInFlight(id: number) {
  return db.syncQueue.update(id, { status: "in_flight" });
}

export async function markSynced(id: number) {
  return db.syncQueue.delete(id);
}

export async function markError(id: number, errorMessage: string) {
  const item = await db.syncQueue.get(id);
  if (!item) return;
  const retryCount = (item.retry_count ?? 0) + 1;
  logger.warn(
    `sync error id=${id} ${item.collection} ${item.record_id} retry=${retryCount}: ${errorMessage}`,
  );
  return db.syncQueue.update(id, {
    status: retryCount >= 5 ? "error" : "pending",
    retry_count: retryCount,
    error_message: errorMessage,
  });
}

export async function getPendingCount(storeId?: string): Promise<number> {
  const items = await db.syncQueue
    .where("status")
    .anyOf(["pending", "error", "in_flight"])
    .toArray();
  if (storeId) {
    return items.filter((i) => i.store === storeId).length;
  }
  return items.length;
}

export async function markPendingOrderItemsSynced(
  storeId: string,
  tempOrderId: string,
) {
  const items = await db.syncQueue
    .where("status")
    .anyOf(["pending", "error", "in_flight"])
    .toArray();

  for (const item of items) {
    if (
      item.store === storeId &&
      item.collection === "order_items" &&
      item.data?.order === tempOrderId &&
      item.id != null
    ) {
      await db.syncQueue.delete(item.id);
    }
  }
}

export async function clearSyncedItems() {
  return db.syncQueue.where("status").equals("synced").delete();
}
