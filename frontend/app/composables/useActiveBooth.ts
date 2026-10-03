import { db } from "~/lib/db";
import { boothBreakEven, isBoothEnded, totalBoothCost } from "~/lib/booths/cost";
import { getBangkokDateKey } from "~/lib/timezone";

/**
 * Booth selected in store settings (`active_booth_id`) for the POS.
 * status: "none" = booth mode off (POS unchanged), "active" = filter + tag
 * orders, "ended" = selected booth is closed/past its end date → POS falls
 * back to normal mode and shows a warning.
 */
export function useActiveBooth() {
  const { activeStore } = useStore();
  const { booths, fetchBooths, listBoothProducts } = useBooths();

  const productIds = ref<Set<string> | null>(null);
  const stats = ref<{ revenue: number; cogs: number } | null>(null);

  const configured = computed(() =>
    booths.value.find((b) => b.id === activeStore.value?.settings?.active_booth_id),
  );
  const status = computed<"none" | "active" | "ended">(() => {
    const b = configured.value;
    if (!b) return "none";
    return isBoothEnded(b, getBangkokDateKey()) ? "ended" : "active";
  });
  const booth = computed(() => (status.value === "active" ? configured.value! : null));

  const breakEven = computed(() =>
    booth.value && stats.value
      ? boothBreakEven({
          revenue: stats.value.revenue,
          cogs: stats.value.cogs,
          fixedCost: totalBoothCost(booth.value),
        })
      : null,
  );

  async function refreshStats() {
    const b = booth.value;
    if (!b) {
      stats.value = null;
      return;
    }
    const orders = (await db.orders.where("booth").equals(b.id).toArray()).filter(
      (o) => o.status === "completed",
    );
    const items = orders.length
      ? await db.orderItems.where("order").anyOf(orders.map((o) => o.id)).toArray()
      : [];
    const cost = new Map(
      (await db.products.where("store").equals(b.store).toArray()).map((p) => [p.id, p.cost || 0]),
    );
    stats.value = {
      revenue: orders.reduce((s, o) => s + o.total, 0),
      cogs: items.reduce((s, i) => s + i.quantity * (cost.get(i.product) ?? 0), 0),
    };
  }

  async function load() {
    await fetchBooths();
    const b = booth.value;
    if (!b) {
      productIds.value = null;
      stats.value = null;
      return;
    }
    productIds.value = new Set((await listBoothProducts(b.id)).map((r) => r.product));
    await refreshStats();
  }

  watch(() => activeStore.value?.settings?.active_booth_id, load, { immediate: true });

  return { status, booth, configured, productIds, breakEven, refreshStats, reload: load };
}
