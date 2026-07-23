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
  ) {
    if (!activeStoreId.value || !authUser.value) return;

    const current = inventoryItems.value.find((i) => i.product === productId);
    const beforeQty = current?.quantity ?? 0;
    const afterQty =
      type === "stock_out" ? beforeQty - quantity : beforeQty + quantity;

    const txData: Partial<InventoryTransaction> = {
      store: activeStoreId.value,
      product: productId,
      type,
      quantity,
      before_qty: beforeQty,
      after_qty: afterQty,
      reference: "",
      note: note || "",
      created_by: authUser.value.id,
    };

    if (isOnline.value) {
      await $api.send(
        `/stores/${activeStoreId.value}/inventory-transactions`,
        { method: "POST", body: txData },
      );
    } else {
      const txId = `temp_${Date.now()}`;
      const now = new Date().toISOString();
      await addToSyncQueue({
        collection: "inventory_transactions",
        action: "create",
        record_id: txId,
        data: txData,
        store: activeStoreId.value,
      });

      if (current) {
        await db.inventory.update(current.id, { quantity: afterQty, updated: now });
        await addToSyncQueue({
          collection: "inventory",
          action: "update",
          record_id: current.id,
          data: { quantity: afterQty },
          store: activeStoreId.value,
        });
      } else {
        const invId = `temp_inv_${Date.now()}`;
        const invData = {
          id: invId,
          store: activeStoreId.value,
          product: productId,
          quantity: afterQty,
          low_stock_threshold: 10,
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
