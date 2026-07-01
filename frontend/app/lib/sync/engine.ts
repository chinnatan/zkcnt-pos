import type { ApiClient } from "~/lib/api/client";
import { db } from "../db";
import { createLogger } from "../logger";
import {
  blobCacheId,
  getPendingFileUploads,
  markFileError,
  markFileInFlight,
  markFileSynced,
  remapFileQueueRecordId,
  storeFileBlob,
} from "../files/blobs";
import type { OrderItem } from "../types";
import {
  getPendingItems,
  hasQueuedOrderCreate,
  markDeferred,
  markInFlight,
  markPendingOrderItemsSynced,
  markSynced,
  markError,
  resetInFlightToPending,
  sortSyncQueue,
} from "./queue";

async function resolveOrderId(
  orderRef: string,
  orderIdMap: Map<string, string>,
): Promise<string> {
  const mapped = orderIdMap.get(orderRef);
  if (mapped) return mapped;
  if (!orderRef.startsWith("temp_")) return orderRef;

  const clientId = orderRef.slice("temp_".length);
  const localOrder = await db.orders
    .where("client_id")
    .equals(clientId)
    .first();
  if (localOrder && !localOrder.id.startsWith("temp_")) {
    return localOrder.id;
  }

  return orderRef;
}

async function buildOrderItemsPayload(
  tempOrderId: string,
): Promise<Record<string, unknown>[]> {
  const localItems = await db.orderItems
    .where("order")
    .equals(tempOrderId)
    .toArray();

  const payloads: Record<string, unknown>[] = [];
  for (const item of localItems as OrderItem[]) {
    const product = await db.products.get(item.product);
    payloads.push({
      product: item.product,
      product_id: item.product,
      category_id: product?.category ?? "",
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      total: item.total,
      promotion_id: item.promotion_id || "",
      free_quantity: item.free_quantity ?? 0,
    });
  }
  return payloads;
}

async function remapLocalOrderItems(tempOrderId: string, realOrderId: string) {
  const now = new Date().toISOString();
  const localItems = await db.orderItems
    .where("order")
    .equals(tempOrderId)
    .toArray();
  for (const item of localItems) {
    await db.orderItems.update(item.id, { order: realOrderId, updated: now });
  }
}

const logger = createLogger("sync");

type SyncRecord = { id: string; deleted_at?: string | null };

async function applySyncedRecords<T extends SyncRecord>(
  table: { bulkPut: (items: never[]) => Promise<void>; bulkDelete: (keys: string[]) => Promise<void> },
  records: T[],
) {
  if (!records.length) return;
  const toPut: T[] = [];
  const toDelete: string[] = [];
  for (const record of records) {
    if (record.deleted_at) toDelete.push(record.id);
    else toPut.push(record);
  }
  if (toPut.length) await table.bulkPut(toPut as never[]);
  if (toDelete.length) await table.bulkDelete(toDelete);
}

export class SyncEngine {
  private api: ApiClient;
  private storeId: string;
  private isSyncing = false;

  constructor(api: ApiClient, storeId: string) {
    this.api = api;
    this.storeId = storeId;
  }

  async pullAll(since?: string) {
    const sinceValue = since ?? "1970-01-01T00:00:00.000Z";
    logger.debug(`pullAll start storeId=${this.storeId} since=${sinceValue}`);

    const delta = await this.api.syncDelta(this.storeId, sinceValue);

    const counts = {
      stores: delta.stores?.length ?? 0,
      store_members: delta.store_members?.length ?? 0,
      categories: delta.categories?.length ?? 0,
      products: delta.products?.length ?? 0,
      customers: delta.customers?.length ?? 0,
      inventory: delta.inventory?.length ?? 0,
      promotions: delta.promotions?.length ?? 0,
      promotion_targets: delta.promotion_targets?.length ?? 0,
      promotion_usages: delta.promotion_usages?.length ?? 0,
      orders: delta.orders?.length ?? 0,
      order_items: delta.order_items?.length ?? 0,
    };

    logger.debug(
      `pullAll delta storeId=${this.storeId} ` +
        Object.entries(counts)
          .map(([key, count]) => `${key}=${count}`)
          .join(" "),
    );

    if (delta.stores?.length) {
      await db.stores.bulkPut(delta.stores as never[]);
    }
    if (delta.store_members?.length) {
      await db.storeMembers.bulkPut(delta.store_members as never[]);
    }
    if (delta.categories?.length) {
      await applySyncedRecords(db.categories, delta.categories as SyncRecord[]);
    }
    if (delta.products?.length) {
      await applySyncedRecords(db.products, delta.products as SyncRecord[]);
    }
    if (delta.customers?.length) {
      await applySyncedRecords(db.customers, delta.customers as SyncRecord[]);
    }
    if (delta.inventory?.length) {
      await db.inventory.bulkPut(delta.inventory as never[]);
    }
    if (delta.promotions?.length) {
      await applySyncedRecords(db.promotions, delta.promotions as SyncRecord[]);
    }
    if (delta.promotion_targets?.length) {
      await applySyncedRecords(
        db.promotionTargets,
        delta.promotion_targets as SyncRecord[],
      );
    }
    if (delta.promotion_usages?.length) {
      await db.promotionUsages.bulkPut(delta.promotion_usages as never[]);
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
      await resetInFlightToPending(this.storeId);
      const pending = sortSyncQueue(await getPendingItems(this.storeId));
      logger.debug(`drainSyncQueue pending=${pending.length} storeId=${this.storeId}`);

      for (const item of pending) {
        try {
          const stillQueued = item.id != null && (await db.syncQueue.get(item.id));
          if (!stillQueued) {
            logger.debug(
              `sync skip ${item.action} ${item.collection} ${item.record_id} (already handled)`,
            );
            continue;
          }

          await markInFlight(item.id);
          logger.debug(
            `sync queue ${item.action} ${item.collection} ${item.record_id}`,
          );

          let record: Record<string, unknown> | undefined;

          switch (item.action) {
            case "create": {
              if (item.collection === "orders") {
                const itemsPayload = await buildOrderItemsPayload(item.record_id);
                record = await this.api.createOrderWithItems(
                  this.storeId,
                  item.data as Record<string, unknown>,
                  itemsPayload,
                );

                if (item.record_id.startsWith("temp_")) {
                  const realId = String(record.id);
                  orderIdMap.set(item.record_id, realId);
                  await db.orders.delete(item.record_id);
                  await db.orders.put(record as never);
                  await remapLocalOrderItems(item.record_id, realId);
                  await markPendingOrderItemsSynced(
                    this.storeId,
                    item.record_id,
                  );
                }
                break;
              }

              if (item.collection === "order_items") {
                const rawOrderRef = String(item.data.order ?? "");
                const resolvedOrderId = await resolveOrderId(
                  rawOrderRef,
                  orderIdMap,
                );
                if (resolvedOrderId.startsWith("temp_")) {
                  if (await hasQueuedOrderCreate(rawOrderRef, this.storeId)) {
                    await markDeferred(item.id!);
                    logger.debug(
                      `defer order_items ${item.record_id} waiting for order ${rawOrderRef}`,
                    );
                    continue;
                  }
                  throw new Error("Order not found");
                }

                const payload = {
                  ...item.data,
                  order: resolvedOrderId,
                };

                record = (await this.api.collectionCreate(
                  this.storeId,
                  item.collection,
                  payload,
                )) as Record<string, unknown>;

                if (item.record_id.startsWith("temp_")) {
                  await db.orderItems.delete(item.record_id);
                  await db.orderItems.put(record as never);
                }
                break;
              }

              record = (await this.api.collectionCreate(
                this.storeId,
                item.collection,
                item.data,
              )) as Record<string, unknown>;

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
          logger.debug(
            `sync done ${item.action} ${item.collection} ${item.record_id}`,
          );
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Unknown sync error";
          logger.warn(
            `sync failed ${item.action} ${item.collection} ${item.record_id}: ${msg}`,
          );
          await markError(item.id, msg);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async drainFileQueue() {
    const pending = await getPendingFileUploads(this.storeId);
    logger.debug(`drainFileQueue pending=${pending.length} storeId=${this.storeId}`);

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
        logger.debug(
          `file sync done ${item.collection} ${item.record_id} remove=${!!item.remove}`,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown file sync error";
        logger.warn(
          `file sync failed ${item.collection} ${item.record_id}: ${msg}`,
        );
        await markFileError(item.id!, msg);
      }
    }
  }

  async prefetchProductImages() {
    const products = await db.products
      .where("store")
      .equals(this.storeId)
      .toArray();

    let prefetched = 0;
    let skipped = 0;

    for (const product of products) {
      if (!product.image) continue;

      const cacheId = blobCacheId("products", product.id, "image");
      const existing = await db.fileBlobs.get(cacheId);
      if (existing) {
        skipped++;
        continue;
      }

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
        prefetched++;
      } catch {
        // ignore individual prefetch failures
      }
    }

    logger.debug(
      `prefetchProductImages storeId=${this.storeId} prefetched=${prefetched} skipped=${skipped}`,
    );
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
      case "promotions":
        return db.promotions;
      case "promotion_targets":
        return db.promotionTargets;
      case "promotion_usages":
        return db.promotionUsages;
      default:
        return null;
    }
  }
}
