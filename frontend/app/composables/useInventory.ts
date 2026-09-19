import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Inventory, InventoryTransaction } from "~/lib/types";

const inventoryItems = ref<Inventory[]>([]);
const isLoading = ref(false);

export function useInventory() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();
  const { authUser } = useAuth();

  async function fetchInventory() {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const storeId = activeStoreId.value;
        const records = await $api.send<Inventory[]>(
          `/stores/${storeId}/inventory?expand=product`,
        );
        inventoryItems.value = records;
        const normalized = records.map((r) => ({
          ...r,
          expand: undefined,
        })) as Inventory[];
        await db.inventory.where("store").equals(storeId).delete();
        await db.inventory.bulkPut(normalized);
      } else {
        const local = await db.inventory
          .where("store")
          .equals(activeStoreId.value)
          .toArray();
        inventoryItems.value = local as Inventory[];
      }
    } catch {
      const local = await db.inventory
        .where("store")
        .equals(activeStoreId.value)
        .toArray();
      inventoryItems.value = local as Inventory[];
    } finally {
      isLoading.value = false;
    }
  }

  async function adjustStock(
    productId: string,
    type: "stock_in" | "stock_out" | "adjustment",
    quantity: number,
    note?: string,
    threshold?: number,
  ) {
    if (!activeStoreId.value || !authUser.value) return;

    const current = inventoryItems.value.find((i) => i.product === productId);
    const beforeQty = current?.quantity ?? 0;

    let afterQty: number;
    let txQuantity: number;

    if (type === "adjustment") {
      afterQty = quantity;
      txQuantity = Math.abs(afterQty - beforeQty);
    } else if (type === "stock_out") {
      afterQty = beforeQty - quantity;
      txQuantity = quantity;
    } else {
      afterQty = beforeQty + quantity;
      txQuantity = quantity;
    }

    const thresholdChanged =
      threshold !== undefined && threshold !== current?.low_stock_threshold;
    if (txQuantity === 0 && !thresholdChanged) return;

    const txData: Partial<InventoryTransaction> = {
      store: activeStoreId.value,
      product: productId,
      type,
      quantity: txQuantity,
      before_qty: beforeQty,
      after_qty: afterQty,
      reference: "",
      note: note || "",
      created_by: authUser.value.id,
    };

    if (isOnline.value) {
      if (txQuantity > 0 || !current) {
        await $api.send(
          `/stores/${activeStoreId.value}/inventory-transactions`,
          {
            method: "POST",
            body:
              threshold === undefined
                ? txData
                : { ...txData, low_stock_threshold: threshold },
          },
        );
      } else if (thresholdChanged) {
        await $api.send(
          `/stores/${activeStoreId.value}/inventory/${current.id}`,
          {
            method: "PATCH",
            body: { low_stock_threshold: threshold },
          },
        );
      }
    } else {
      const txId = `temp_${Date.now()}`;
      const now = new Date().toISOString();
      if (txQuantity > 0 || !current) {
        await addToSyncQueue({
          collection: "inventory_transactions",
          action: "create",
          record_id: txId,
          data: txData,
          store: activeStoreId.value,
        });
      }

      if (current) {
        const invUpdates =
          threshold === undefined
            ? { quantity: afterQty, updated: now }
            : { quantity: afterQty, low_stock_threshold: threshold, updated: now };
        await db.inventory.update(current.id, invUpdates);
        await addToSyncQueue({
          collection: "inventory",
          action: "update",
          record_id: current.id,
          data: invUpdates,
          store: activeStoreId.value,
        });
      } else {
        const invId = `temp_inv_${Date.now()}`;
        const invData = {
          id: invId,
          store: activeStoreId.value,
          product: productId,
          quantity: afterQty,
          low_stock_threshold: threshold ?? 0,
          created: now,
          updated: now,
        };
        await db.inventory.put(invData as Inventory);
        await addToSyncQueue({
          collection: "inventory",
          action: "create",
          record_id: invId,
          data: { ...invData, id: undefined },
          store: activeStoreId.value,
        });
      }
    }

    await fetchInventory();
  }

  const lowStockItems = computed(() =>
    inventoryItems.value.filter((i) => i.quantity <= i.low_stock_threshold),
  );

  return {
    inventoryItems: readonly(inventoryItems),
    isLoading: readonly(isLoading),
    lowStockItems,
    fetchInventory,
    adjustStock,
  };
}
