import { db } from "~/lib/db";
import { resolveApiBaseUrl } from "~/lib/api/url";
import {
  aggregateReports,
  getPeriodRange,
  getPreviousPeriodRange,
  reportsToCsv,
} from "~/lib/reports/aggregate";
import type {
  ReportPeriod,
  ReportsData,
} from "~/lib/types/reports";
import type { InventoryTransaction } from "~/lib/types";

export function useReports() {
  const { $api } = useNuxtApp();
  const config = useRuntimeConfig();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();
  const { locale, t } = useI18n();
  const { datetimeLocalToIso } = useFormat();

  const period = ref<ReportPeriod>("today");
  const customSince = ref("");
  const customUntil = ref("");
  const data = ref<ReportsData | null>(null);
  const isLoading = ref(false);
  const error = ref("");
  const activeTab = ref<"products" | "categories" | "customers" | "cashiers">("products");
  const productSort = ref<"revenue" | "qty">("revenue");

  const range = computed(() => {
    const sinceIso =
      period.value === "custom" && customSince.value
        ? datetimeLocalToIso(customSince.value) ?? customSince.value
        : undefined;
    const untilIso =
      period.value === "custom" && customUntil.value
        ? datetimeLocalToIso(customUntil.value) ?? customUntil.value
        : undefined;
    return getPeriodRange(period.value, sinceIso, untilIso);
  });

  async function loadLocalReports(): Promise<ReportsData> {
    const storeId = activeStoreId.value!;
    const currentRange = range.value;
    const previousRange = getPreviousPeriodRange(currentRange);

    const [
      orders,
      orderItems,
      products,
      categories,
      customers,
      inventory,
      storeMembers,
    ] = await Promise.all([
      db.orders.where("store").equals(storeId).toArray(),
      db.orderItems.toArray(),
      db.products.where("store").equals(storeId).toArray(),
      db.categories.where("store").equals(storeId).toArray(),
      db.customers.where("store").equals(storeId).toArray(),
      db.inventory.where("store").equals(storeId).toArray(),
      db.storeMembers.where("store").equals(storeId).toArray(),
    ]);

    const orderIds = new Set(orders.map((o) => o.id));
    const filteredItems = orderItems.filter((i) => orderIds.has(i.order));

    const cashierNames = new Map<string, string>();
    if (isOnline.value) {
      try {
        const members = await $api.send<Array<{ user: string; expand?: { user?: { name?: string } } }>>(
          `/stores/${storeId}/team-members`,
        );
        for (const member of members) {
          const name = member.expand?.user?.name;
          if (name) cashierNames.set(member.user, name);
        }
      } catch {
        for (const member of storeMembers) {
          const name = member.expand?.user?.name;
          if (name) cashierNames.set(member.user, name);
        }
      }
    } else {
      for (const member of storeMembers) {
        const name = member.expand?.user?.name;
        if (name) cashierNames.set(member.user, name);
      }
    }

    let inventoryTransactions: InventoryTransaction[] | undefined;
    if (isOnline.value) {
      try {
        inventoryTransactions = await $api.send<InventoryTransaction[]>(
          `/stores/${storeId}/inventory-transactions`,
        );
      } catch {
        inventoryTransactions = undefined;
      }
    }

    return aggregateReports({
      period: period.value,
      range: currentRange,
      previousRange,
      orders: orders as never[],
      orderItems: filteredItems as never[],
      products: products as never[],
      categories: categories as never[],
      customers: customers as never[],
      inventory: inventory as never[],
      inventoryTransactions,
      cashierNames,
      locale: locale.value,
      uncategorizedLabel: t("reportsPage.uncategorized"),
    });
  }

  async function loadReports() {
    if (!activeStoreId.value) return;

    isLoading.value = true;
    error.value = "";

    try {
      if (isOnline.value) {
        const params = new URLSearchParams({
          since: range.value.since,
          until: range.value.until,
          period: period.value,
        });

        const result = await $api.send<ReportsData>(
          `/stores/${activeStoreId.value}/reports?${params.toString()}`,
        );

        if (result.categoryBreakdown) {
          result.categoryBreakdown = result.categoryBreakdown.map((row) =>
            row.categoryId === "__uncategorized__" || row.name === "Uncategorized"
              ? { ...row, name: t("reportsPage.uncategorized") }
              : row,
          );
        }

        data.value = result;
      } else {
        data.value = await loadLocalReports();
      }
    } catch (e) {
      try {
        data.value = await loadLocalReports();
      } catch (localErr) {
        error.value =
          localErr instanceof Error ? localErr.message : t("reportsPage.loadError");
        data.value = null;
      }
    } finally {
      isLoading.value = false;
    }
  }

  function exportCsv() {
    if (!activeStoreId.value) return;

    if (isOnline.value) {
      const params = new URLSearchParams({
        since: range.value.since,
        until: range.value.until,
        period: period.value,
      });
      const baseUrl = resolveApiBaseUrl(config.public.apiUrl as string);
      const token = $api.token;
      if (!token) return;

      fetch(
        `${baseUrl}/stores/${activeStoreId.value}/reports/export.csv?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
        .then((res) => res.blob())
        .then((blob) => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "reports-export.csv";
          link.click();
          URL.revokeObjectURL(link.href);
        })
        .catch(() => {
          if (data.value) downloadLocalCsv(data.value);
        });
      return;
    }

    if (data.value) downloadLocalCsv(data.value);
  }

  function downloadLocalCsv(reportData: ReportsData) {
    const blob = new Blob([reportsToCsv(reportData)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reports-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const topProducts = computed(() => {
    if (!data.value) return [];
    return productSort.value === "revenue"
      ? data.value.topProductsByRevenue
      : data.value.topProductsByQty;
  });

  function formatChangePct(pct: number | null): string {
    if (pct === null) return "—";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  }

  watch([period, customSince, customUntil], () => {
    loadReports();
  });

  return {
    period,
    customSince,
    customUntil,
    data,
    isLoading,
    error,
    activeTab,
    productSort,
    topProducts,
    range,
    loadReports,
    exportCsv,
    formatChangePct,
  };
}
