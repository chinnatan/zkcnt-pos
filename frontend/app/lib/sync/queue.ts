import { db } from "../db";
import type { SyncQueueItem } from "../types";

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, "id" | "status" | "retry_count" | "created_at" | "error_message">
) {
  return db.syncQueue.add({
    ...item,
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
    error_message: "",
  } as SyncQueueItem);
}

export async function getPendingItems(storeId?: string): Promise<SyncQueueItem[]> {
  const items = await db.syncQueue
    .where("status")
    .anyOf(["pending", "error"])
    .sortBy("created_at");
  if (storeId) {
    return items.filter((i) => i.store === storeId) as SyncQueueItem[];
  }
  return items as SyncQueueItem[];
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
  return db.syncQueue.update(id, {
    status: (item.retry_count ?? 0) >= 5 ? "error" : "pending",
    retry_count: (item.retry_count ?? 0) + 1,
    error_message: errorMessage,
  });
}

export async function getPendingCount(storeId?: string): Promise<number> {
  const items = await getPendingItems(storeId);
  return items.length;
}

export async function clearSyncedItems() {
  return db.syncQueue.where("status").equals("synced").delete();
}
