import type PocketBase from "pocketbase";
import { db } from "../db";
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
      collections.map((c) => this.pullCollection(c))
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
            case "create":
              await this.pb.collection(item.collection).create(item.data);
              break;
            case "update":
              await this.pb.collection(item.collection).update(item.record_id, item.data);
              break;
            case "delete":
              await this.pb.collection(item.collection).delete(item.record_id);
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

  subscribeToCollection(collectionName: string) {
    this.pb.collection(collectionName).subscribe("*", async (e) => {
      const table = this.getTable(collectionName);
      if (!table) return;

      // Only process records belonging to this store
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
