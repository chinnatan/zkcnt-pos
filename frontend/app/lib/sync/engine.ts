import type { ApiClient } from "~/lib/api/client";
import { db } from "../db";
import {
  blobCacheId,
  getPendingFileUploads,
  markFileError,
  markFileInFlight,
  markFileSynced,
  remapFileQueueRecordId,
  storeFileBlob,
} from "../files/blobs";
import {
  getPendingItems,
  markInFlight,
  markSynced,
  markError,
} from "./queue";

export class SyncEngine {
  private api: ApiClient;
  private storeId: string;
  private isSyncing = false;

  constructor(api: ApiClient, storeId: string) {
    this.api = api;
    this.storeId = storeId;
  }

  async pullAll(since?: string) {
    const delta = await this.api.syncDelta(
      this.storeId,
      since ?? "1970-01-01T00:00:00.000Z",
    );

    if (delta.categories?.length) {
      await db.categories.bulkPut(delta.categories as never[]);
    }
    if (delta.products?.length) {
      await db.products.bulkPut(delta.products as never[]);
    }
    if (delta.customers?.length) {
      await db.customers.bulkPut(delta.customers as never[]);
    }
    if (delta.inventory?.length) {
      await db.inventory.bulkPut(delta.inventory as never[]);
    }
    if (delta.discounts?.length) {
      await db.discounts.bulkPut(delta.discounts as never[]);
    }
    if (delta.orders?.length) {
      await db.orders.bulkPut(delta.orders as never[]);
    }
    if (delta.order_items?.length) {
      await db.orderItems.bulkPut(delta.order_items as never[]);
    }
  }

  async drainSyncQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    const orderIdMap = new Map<string, string>();

    try {
      const pending = await getPendingItems(this.storeId);

      for (const item of pending) {
        try {
          await markInFlight(item.id);

          let record: Record<string, unknown> | undefined;

          switch (item.action) {
            case "create": {
              const payload =
                item.collection === "order_items" && item.data.order
                  ? {
                      ...item.data,
                      order:
                        orderIdMap.get(String(item.data.order)) ??
                        item.data.order,
                    }
                  : item.data;

              record = (await this.api.collectionCreate(
                this.storeId,
                item.collection,
                payload,
              )) as Record<string, unknown>;

              if (item.collection === "orders" && item.record_id.startsWith("temp_")) {
                orderIdMap.set(item.record_id, String(record.id));
              }

              if (item.record_id.startsWith("temp_")) {
                const table = this.getTable(item.collection);
                if (table) {
                  await table.delete(item.record_id);
                  await table.put(record as never);
                }
                await remapFileQueueRecordId(
                  item.collection,
                  item.record_id,
                  String(record.id),
                );
              }
              break;
            }
            case "update":
              record = (await this.api.collectionUpdate(
                this.storeId,
                item.collection,
                item.record_id,
                item.data,
              )) as Record<string, unknown>;
              {
                const table = this.getTable(item.collection);
                if (table) await table.put(record as never);
              }
              break;
            case "delete":
              await this.api.collectionDelete(
                this.storeId,
                item.collection,
                item.record_id,
              );
              {
                const table = this.getTable(item.collection);
                if (table) await table.delete(item.record_id);
              }
              break;
          }

          await markSynced(item.id);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Unknown sync error";
          await markError(item.id, msg);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async drainFileQueue() {
    const pending = await getPendingFileUploads(this.storeId);

    for (const item of pending) {
      if (item.record_id.startsWith("temp_")) continue;

      try {
        await markFileInFlight(item.id!);

        const form = new FormData();
        if (item.remove) {
          form.append("image", "");
          form.append("remove", "true");
        } else {
          const blobRecord = await db.fileBlobs.get(item.blob_id);
          if (!blobRecord) {
            await markFileSynced(item.id!);
            continue;
          }
          const file = new File([blobRecord.blob], "upload", {
            type: blobRecord.mime_type,
          });
          form.append("image", file);
        }

        const record = (await this.api.uploadProductImage(
          this.storeId,
          item.record_id,
          form,
        )) as Record<string, unknown>;

        const table = this.getTable(item.collection);
        if (table) await table.put(record as never);

        if (item.blob_id && !item.remove) {
          await db.fileBlobs.delete(item.blob_id);
        }

        await markFileSynced(item.id!);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown file sync error";
        await markFileError(item.id!, msg);
      }
    }
  }

  async prefetchProductImages() {
    const products = await db.products
      .where("store")
      .equals(this.storeId)
      .toArray();

    for (const product of products) {
      if (!product.image) continue;

      const cacheId = blobCacheId("products", product.id, "image");
      const existing = await db.fileBlobs.get(cacheId);
      if (existing) continue;

      try {
        const url = this.api.getFileUrl(product.image);
        const res = await fetch(url);
        if (!res.ok) continue;

        const blob = await res.blob();
        await storeFileBlob(
          "products",
          product.id,
          "image",
          this.storeId,
          blob,
          blob.type || "image/jpeg",
        );
      } catch {
        // ignore individual prefetch failures
      }
    }
  }

  subscribeAll() {
    // Realtime disabled — pull on reconnect only
  }

  unsubscribeAll() {
    // no-op
  }

  private getTable(collectionName: string) {
    switch (collectionName) {
      case "categories":
        return db.categories;
      case "products":
        return db.products;
      case "customers":
        return db.customers;
      case "orders":
        return db.orders;
      case "order_items":
        return db.orderItems;
      case "inventory":
        return db.inventory;
      case "discounts":
        return db.discounts;
      default:
        return null;
    }
  }
}
