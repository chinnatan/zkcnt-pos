import { db } from "~/lib/db";
import { boothBreakEven, isBoothEnded, totalBoothCost } from "~/lib/booths/cost";
import { getBangkokDateKey } from "~/lib/timezone";

const STORAGE_KEY = "pos_active_booth";

function readMap(): Record<string, string> {
  if (!import.meta.client) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Booth chosen on the POS. Stored per device + store in localStorage (like the
 * product list prefs) so it works offline and a cashier can switch it without
 * store-management permissions.
 * status: "none" = booth mode off (POS unchanged), "active" = filter + tag
 * orders, "ended" = selected booth is closed/past its end date → POS falls
 * back to normal mode and shows a warning.
 */
export function useActiveBooth() {
  const { activeStoreId } = useStore();
  const { booths, fetchBooths, listBoothProducts } = useBooths();

  const productIds = ref<Set<string> | null>(null);
  const stats = ref<{ revenue: number; cogs: number } | null>(null);

  const selectedId = useState("pos-active-booth-id", () => "");
  watch(
    activeStoreId,
    (id) => {
      selectedId.value = id ? (readMap()[id] ?? "") : "";
    },
    { immediate: true },
  );

  const configured = computed(() => booths.value.find((b) => b.id === selectedId.value));
  const selectableBooths = computed(() =>
    booths.value.filter((b) => b.id === selectedId.value || !isBoothEnded(b, getBangkokDateKey())),
  );

  function select(id: string) {
    selectedId.value = id;
    if (!import.meta.client || !activeStoreId.value) return;
    try {
      const map = readMap();
      if (id) map[activeStoreId.value] = id;
      else delete map[activeStoreId.value];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore quota / private mode errors
    }
  }
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

  watch([selectedId, activeStoreId], load, { immediate: true });

  return { status, booth, configured, selectableBooths, selectedId, select, productIds, breakEven, refreshStats, reload: load };
}
