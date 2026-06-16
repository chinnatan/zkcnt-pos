import { db } from "../db";
import type { FileBlob, FileUploadQueueItem } from "../types";

export function blobCacheId(
  collection: string,
  recordId: string,
  field: string,
): string {
  return `${collection}/${recordId}/${field}`;
}

export async function getCachedBlobUrl(
  collection: string,
  recordId: string,
  field: string,
): Promise<string | null> {
  const id = blobCacheId(collection, recordId, field);
  const cached = await db.fileBlobs.get(id);
  if (!cached) return null;
  return URL.createObjectURL(cached.blob);
}

export async function storeFileBlob(
  collection: string,
  recordId: string,
  field: string,
  store: string,
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const id = blobCacheId(collection, recordId, field);
  await db.fileBlobs.put({
    id,
    store,
    collection,
    record_id: recordId,
    field,
    blob,
    mime_type: mimeType,
    created_at: new Date().toISOString(),
  });
  return id;
}

export async function deleteFileBlob(
  collection: string,
  recordId: string,
  field: string,
): Promise<void> {
  await db.fileBlobs.delete(blobCacheId(collection, recordId, field));
}

export async function deleteAllBlobsForRecord(
  collection: string,
  recordId: string,
): Promise<void> {
  const all = await db.fileBlobs
    .filter((b) => b.collection === collection && b.record_id === recordId)
    .toArray();
  await db.fileBlobs.bulkDelete(all.map((b) => b.id));
}

export async function addToFileUploadQueue(
  item: Omit<
    FileUploadQueueItem,
    "id" | "status" | "retry_count" | "created_at" | "error_message"
  >,
): Promise<number> {
  return db.fileUploadQueue.add({
    ...item,
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
    error_message: "",
  } as FileUploadQueueItem);
}

export async function getPendingFileUploads(
  storeId?: string,
): Promise<FileUploadQueueItem[]> {
  const items = await db.fileUploadQueue
    .where("status")
    .anyOf(["pending", "error"])
    .sortBy("created_at");
  if (storeId) {
    return items.filter((i) => i.store === storeId) as FileUploadQueueItem[];
  }
  return items as FileUploadQueueItem[];
}

export async function markFileInFlight(id: number) {
  return db.fileUploadQueue.update(id, { status: "in_flight" });
}

export async function markFileSynced(id: number) {
  return db.fileUploadQueue.delete(id);
}

export async function markFileError(id: number, errorMessage: string) {
  const item = await db.fileUploadQueue.get(id);
  if (!item) return;
  return db.fileUploadQueue.update(id, {
    status: (item.retry_count ?? 0) >= 5 ? "error" : "pending",
    retry_count: (item.retry_count ?? 0) + 1,
    error_message: errorMessage,
  });
}

export async function remapFileQueueRecordId(
  collection: string,
  tempId: string,
  realId: string,
): Promise<void> {
  const items = await db.fileUploadQueue
    .filter((i) => i.collection === collection && i.record_id === tempId)
    .toArray();
  for (const item of items) {
    await db.fileUploadQueue.update(item.id!, { record_id: realId });
    if (item.blob_id) {
      const blob = await db.fileBlobs.get(item.blob_id);
      if (blob) {
        const newId = blobCacheId(collection, realId, blob.field);
        await db.fileBlobs.delete(item.blob_id);
        await db.fileBlobs.put({ ...blob, id: newId, record_id: realId });
        await db.fileUploadQueue.update(item.id!, { blob_id: newId });
      }
    }
  }
}
