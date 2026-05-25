import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Discount } from "~/lib/types";

export function useDiscounts() {
  const { $pb } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  const discounts = ref<Discount[]>([]);
  const isLoading = ref(false);

  async function fetchDiscounts() {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const records = await $pb.collection("discounts").getFullList({
          filter: `store = "${activeStoreId.value}"`,
          sort: "-created",
        });
        discounts.value = records as unknown as Discount[];
        await db.discounts.bulkPut(records);
      } else {
        const local = await db.discounts
          .where("store")
          .equals(activeStoreId.value)
          .toArray();
        discounts.value = local as Discount[];
      }
    } catch {
      const local = await db.discounts
        .where("store")
        .equals(activeStoreId.value)
        .toArray();
      discounts.value = local as Discount[];
    } finally {
      isLoading.value = false;
    }
  }

  const activeDiscounts = computed(() => {
    const now = new Date();
    return discounts.value.filter((d) => {
      if (!d.is_active) return false;
      if (d.start_date && new Date(d.start_date) > now) return false;
      if (d.end_date && new Date(d.end_date) < now) return false;
      return true;
    });
  });

  function getApplicableDiscounts(subtotal: number) {
    return activeDiscounts.value.filter((d) => subtotal >= d.min_purchase);
  }

  function calculateDiscount(discount: Discount, subtotal: number): number {
    if (discount.type === "percent") {
      return Math.round(subtotal * (discount.value / 100));
    }
    return Math.min(discount.value, subtotal);
  }

  async function createDiscount(data: Partial<Discount>) {
    if (!activeStoreId.value) throw new Error("No active store");
    const discountData = { ...data, store: activeStoreId.value };

    if (isOnline.value) {
      const record = await $pb.collection("discounts").create(discountData);
      await db.discounts.put(record);
      await fetchDiscounts();
      return record;
    } else {
      const tempId = `temp_${Date.now()}`;
      const now = new Date().toISOString();
      const localRecord = { ...discountData, id: tempId, created: now, updated: now };
      await db.discounts.put(localRecord);
      await addToSyncQueue({
        collection: "discounts",
        action: "create",
        record_id: tempId,
        data: discountData,
        store: activeStoreId.value,
      });
      await fetchDiscounts();
      return localRecord;
    }
  }

  async function updateDiscount(id: string, data: Partial<Discount>) {
    if (isOnline.value) {
      const record = await $pb.collection("discounts").update(id, data);
      await db.discounts.put(record);
    } else {
      await db.discounts.update(id, data);
      await addToSyncQueue({
        collection: "discounts",
        action: "update",
        record_id: id,
        data,
        store: activeStoreId.value!,
      });
    }
    await fetchDiscounts();
  }

  async function deleteDiscount(id: string) {
    if (isOnline.value) {
      await $pb.collection("discounts").delete(id);
      await db.discounts.delete(id);
    } else {
      await db.discounts.delete(id);
      await addToSyncQueue({
        collection: "discounts",
        action: "delete",
        record_id: id,
        data: {},
        store: activeStoreId.value!,
      });
    }
    await fetchDiscounts();
  }

  return {
    discounts: readonly(discounts),
    activeDiscounts,
    isLoading: readonly(isLoading),
    fetchDiscounts,
    getApplicableDiscounts,
    calculateDiscount,
    createDiscount,
    updateDiscount,
    deleteDiscount,
  };
}
