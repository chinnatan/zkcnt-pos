import type PocketBase from "pocketbase";
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
  private pb: PocketBase;
  private storeId: string;
  private subscriptions: Array<() => void> = [];
  private isSyncing = false;

  constructor(pb: PocketBase, storeId: string) {
    this.pb = pb;
    this.storeId = storeId;
  }

  async pullCollection(collectionName: string) {
    try {
      const records = await this.pb.collection(collectionName).getFullList({
        filter: collectionName === "stores" ? "" : `store = "${this.storeId}"`,
        sort: "-updated",
      });

      const table = this.getTable(collectionName);
      if (!table) return;

      await table.bulkPut(records);
    } catch (e) {
      console.warn(`Pull failed for ${collectionName}:`, e);
    }
  }

  async pullAll() {
    const collections = [
      "categories",
      "products",
      "customers",
      "inventory",
      "discounts",
    ];

    await Promise.allSettled(
      collections.map((c) => this.pullCollection(c)),
    );
  }

  async drainSyncQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pending = await getPendingItems(this.storeId);

      for (const item of pending) {
        try {
          await markInFlight(item.id);

          switch (item.action) {
            case "create": {
              const record = await this.pb
                .collection(item.collection)
                .create(item.data);
              if (item.record_id.startsWith("temp_")) {
                const table = this.getTable(item.collection);
                if (table) {
                  await table.delete(item.record_id);
                  await table.put(record);
                }
                await remapFileQueueRecordId(
                  item.collection,
                  item.record_id,
                  record.id,
                );
              }
              break;
            }
            case "update":
              await this.pb
                .collection(item.collection)
                .update(item.record_id, item.data);
              break;
            case "delete":
              await this.pb
                .collection(item.collection)
                .delete(item.record_id);
              break;
          }

          await markSynced(item.id);
        } catch (e: any) {
          const msg = e?.message || "Unknown sync error";
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
          form.append(item.field, "");
        } else {
          const blobRecord = await db.fileBlobs.get(item.blob_id);
          if (!blobRecord) {
            await markFileSynced(item.id!);
            continue;
          }
          const file = new File([blobRecord.blob], "upload", {
            type: blobRecord.mime_type,
          });
          form.append(item.field, file);
        }

        const record = await this.pb
          .collection(item.collection)
          .update(item.record_id, form);

        const table = this.getTable(item.collection);
        if (table) await table.put(record);

        if (item.blob_id && !item.remove) {
          await db.fileBlobs.delete(item.blob_id);
        }

        await markFileSynced(item.id!);
      } catch (e: any) {
        const msg = e?.message || "Unknown file sync error";
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
        const url = this.pb.files.getUrl(product, product.image);
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

  subscribeToCollection(collectionName: string) {
    this.pb.collection(collectionName).subscribe("*", async (e) => {
      const table = this.getTable(collectionName);
      if (!table) return;

      if (e.record.store && e.record.store !== this.storeId) return;

      switch (e.action) {
        case "create":
        case "update":
          await table.put(e.record);
          break;
        case "delete":
          await table.delete(e.record.id);
          break;
      }
    });

    this.subscriptions.push(() => {
      this.pb.collection(collectionName).unsubscribe("*");
    });
  }

  subscribeAll() {
    const collections = [
      "categories",
      "products",
      "customers",
      "orders",
      "order_items",
      "inventory",
      "inventory_transactions",
      "discounts",
    ];

    for (const c of collections) {
      this.subscribeToCollection(c);
    }
  }

  unsubscribeAll() {
    for (const unsub of this.subscriptions) {
      try {
        unsub();
      } catch {
        // ignore
      }
    }
    this.subscriptions = [];
  }

  private getTable(collectionName: string) {
    const map: Record<string, any> = {
      categories: db.categories,
      products: db.products,
      customers: db.customers,
      orders: db.orders,
      order_items: db.orderItems,
      inventory: db.inventory,
      discounts: db.discounts,
    };
    return map[collectionName] ?? null;
  }
}
