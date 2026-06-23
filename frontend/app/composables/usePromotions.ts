import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Promotion, PromotionTarget } from "~/lib/types";
import type { PromotionInput } from "~/lib/promotions/types";

export type PromotionTargetInput = {
  target_type: "product" | "category";
  target_id: string;
};

export type PromotionPayload = Omit<Partial<Promotion>, "targets"> & {
  targets?: PromotionTargetInput[];
};

function attachTargets(
  promos: Promotion[],
  targets: PromotionTarget[],
): Promotion[] {
  const byPromo = new Map<string, PromotionTarget[]>();
  for (const target of targets) {
    const list = byPromo.get(target.promotion) ?? [];
    list.push(target);
    byPromo.set(target.promotion, list);
  }
  return promos.map((p) => ({
    ...p,
    targets: byPromo.get(p.id) ?? [],
  }));
}

function toPromotionInput(promo: Promotion): PromotionInput {
  return {
    id: promo.id,
    name: promo.name,
    type: promo.type,
    buy_quantity: promo.buy_quantity,
    get_quantity: promo.get_quantity,
    get_discount_percent: promo.get_discount_percent,
    pool_mode: promo.pool_mode,
    reward_mode: promo.reward_mode,
    value: promo.value,
    min_purchase: promo.min_purchase,
    coupon_code: promo.coupon_code || null,
    coupon_discount_type: promo.coupon_discount_type,
    max_uses_total: promo.max_uses_total,
    max_uses_per_customer: promo.max_uses_per_customer,
    stackable: promo.stackable,
    priority: promo.priority,
    start_date: promo.start_date,
    end_date: promo.end_date,
    is_active: promo.is_active,
    targets: (promo.targets ?? []).map((t) => ({
      target_type: t.target_type,
      target_id: t.target_id,
    })),
  };
}

export function usePromotions() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  const promotions = ref<Promotion[]>([]);
  const isLoading = ref(false);

  async function loadLocalPromotions(storeId: string) {
    const [promoRows, targetRows] = await Promise.all([
      db.promotions.where("store").equals(storeId).toArray(),
      db.promotionTargets.toArray(),
    ]);
    const storePromoIds = new Set(promoRows.map((p) => p.id));
    const filteredTargets = targetRows.filter((t) =>
      storePromoIds.has(t.promotion),
    );
    return attachTargets(promoRows as Promotion[], filteredTargets);
  }

  async function fetchPromotions() {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const records = await $api.send<Promotion[]>(
          `/stores/${activeStoreId.value}/promotions`,
        );
        promotions.value = records;
        await db.promotions.bulkPut(records);
        const targets = records.flatMap((p) => p.targets ?? []);
        if (targets.length) {
          await db.promotionTargets.bulkPut(targets);
        }
      } else {
        promotions.value = await loadLocalPromotions(activeStoreId.value);
      }
    } catch {
      promotions.value = await loadLocalPromotions(activeStoreId.value);
    } finally {
      isLoading.value = false;
    }
  }

  const activePromotions = computed(() => {
    const now = new Date();
    return promotions.value.filter((p) => {
      if (!p.is_active) return false;
      if (p.start_date && new Date(p.start_date) > now) return false;
      if (p.end_date && new Date(p.end_date) < now) return false;
      return true;
    });
  });

  function getPromotionInputs(): PromotionInput[] {
    return activePromotions.value.map(toPromotionInput);
  }

  async function createPromotion(data: PromotionPayload) {
    if (!activeStoreId.value) throw new Error("No active store");
    const payload = { ...data, store: activeStoreId.value };

    if (isOnline.value) {
      const record = await $api.send<Promotion>(
        `/stores/${activeStoreId.value}/promotions`,
        { method: "POST", body: payload },
      );
      await db.promotions.put(record);
      if (record.targets?.length) {
        await db.promotionTargets.bulkPut(record.targets);
      }
      await fetchPromotions();
      return record;
    }

    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const localRecord = {
      ...payload,
      id: tempId,
      created: now,
      updated: now,
    } as Promotion;
    await db.promotions.put(localRecord);
    await addToSyncQueue({
      collection: "promotions",
      action: "create",
      record_id: tempId,
      data: payload,
      store: activeStoreId.value,
    });
    await fetchPromotions();
    return localRecord;
  }

  async function updatePromotion(id: string, data: PromotionPayload) {
    if (!activeStoreId.value) throw new Error("No active store");

    if (isOnline.value) {
      const record = await $api.send<Promotion>(
        `/stores/${activeStoreId.value}/promotions/${id}`,
        { method: "PATCH", body: data },
      );
      await db.promotions.put(record);
      if (record.targets) {
        await db.promotionTargets.where("promotion").equals(id).delete();
        await db.promotionTargets.bulkPut(record.targets);
      }
      await fetchPromotions();
      return record;
    }

    const { targets: _targets, ...promoFields } = data;
    await db.promotions.update(id, {
      ...promoFields,
      updated: new Date().toISOString(),
    });
    await addToSyncQueue({
      collection: "promotions",
      action: "update",
      record_id: id,
      data,
      store: activeStoreId.value,
    });
    await fetchPromotions();
    return (await db.promotions.get(id)) as Promotion;
  }

  async function deletePromotion(id: string) {
    if (!activeStoreId.value) throw new Error("No active store");

    if (isOnline.value) {
      await $api.send(`/stores/${activeStoreId.value}/promotions/${id}`, {
        method: "DELETE",
      });
      await db.promotions.delete(id);
      await db.promotionTargets.where("promotion").equals(id).delete();
    } else {
      await db.promotions.delete(id);
      await db.promotionTargets.where("promotion").equals(id).delete();
      await addToSyncQueue({
        collection: "promotions",
        action: "delete",
        record_id: id,
        data: {},
        store: activeStoreId.value,
      });
    }
    await fetchPromotions();
  }

  return {
    promotions: readonly(promotions),
    activePromotions,
    isLoading: readonly(isLoading),
    fetchPromotions,
    getPromotionInputs,
    createPromotion,
    updatePromotion,
    deletePromotion,
  };
}
