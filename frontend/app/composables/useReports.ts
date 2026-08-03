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
  ReportProductRow,
  ReportsData,
} from "~/lib/types/reports";
import type { InventoryTransaction } from "~/lib/types";

export type ReportTab =
  | "products"
  | "deadStock"
  | "categories"
  | "customers"
  | "cashiers"
  | "promotions";

export type ProductSortKey = "revenue" | "qty" | "margin";

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
  const activeTab = ref<ReportTab>("products");
  const productSort = ref<ProductSortKey>("revenue");
  const productSearch = ref("");
  const deadStockSearch = ref("");
  const expandedCategoryId = ref<string | null>(null);

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
      promotions,
      promotionUsages,
    ] = await Promise.all([
      db.orders.where("store").equals(storeId).toArray(),
      db.orderItems.toArray(),
      db.products.where("store").equals(storeId).toArray(),
      db.categories.where("store").equals(storeId).toArray(),
      db.customers.where("store").equals(storeId).toArray(),
      db.inventory.where("store").equals(storeId).toArray(),
      db.storeMembers.where("store").equals(storeId).toArray(),
      db.promotions.where("store").equals(storeId).toArray(),
      db.promotionUsages.where("store").equals(storeId).toArray(),
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
      promotions: promotions as never[],
      promotionUsages: promotionUsages as never[],
      cashierNames,
      locale: locale.value,
      uncategorizedLabel: t("reportsPage.uncategorized"),
    });
  }

  function normalizeCategoryLabels(result: ReportsData): ReportsData {
    const label = t("reportsPage.uncategorized");
    return {
      ...result,
      previousSummary: result.previousSummary ?? {
        totalSales: 0,
        totalOrders: 0,
        averageOrder: 0,
        grossProfit: 0,
      },
      allProducts: result.allProducts ?? result.topProductsByRevenue ?? [],
      deadStock: (result.deadStock ?? []).map((row) =>
        row.categoryId === "__uncategorized__" || row.categoryName === "Uncategorized"
          ? { ...row, categoryName: label }
          : row,
      ),
      dayOfWeekBreakdown: result.dayOfWeekBreakdown ?? [],
      hourlyHeatmap: result.hourlyHeatmap ?? [],
      lapsedCustomers: result.lapsedCustomers ?? [],
      promotions: result.promotions ?? [],
      lowStockFastMovers: result.lowStockFastMovers ?? [],
      stockValueRetail: result.stockValueRetail ?? 0,
      categoryBreakdown: (result.categoryBreakdown ?? []).map((row) => {
        const named =
          row.categoryId === "__uncategorized__" || row.name === "Uncategorized"
            ? { ...row, name: label }
            : row;
        return {
          ...named,
          cost: named.cost ?? 0,
          margin: named.margin ?? 0,
          products: named.products ?? [],
        };
      }),
      summary: {
        ...result.summary,
        grossProfit: result.summary.grossProfit ?? 0,
        grossMarginPct: result.summary.grossMarginPct ?? null,
        grossProfitChangePct: result.summary.grossProfitChangePct ?? null,
        cashSales: result.summary.cashSales ?? 0,
        cashReceived: result.summary.cashReceived ?? 0,
        newCustomerCount: result.summary.newCustomerCount ?? 0,
        returningCustomerCount: result.summary.returningCustomerCount ?? 0,
      },
    };
  }

  async function loadReports() {
    if (!activeStoreId.value) return;

    isLoading.value = true;
    error.value = "";
    expandedCategoryId.value = null;

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

        data.value = normalizeCategoryLabels(result);
      } else {
        data.value = normalizeCategoryLabels(await loadLocalReports());
      }
    } catch {
      try {
        data.value = normalizeCategoryLabels(await loadLocalReports());
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

  function sortProductRows(rows: ReportProductRow[], sortBy: ProductSortKey): ReportProductRow[] {
    return [...rows].sort((a, b) => {
      if (sortBy === "qty") return b.qty - a.qty;
      if (sortBy === "margin") return b.margin - a.margin;
      return b.revenue - a.revenue;
    });
  }

  const filteredProducts = computed(() => {
    if (!data.value) return [];
    const q = productSearch.value.trim().toLowerCase();
    let rows = data.value.allProducts ?? data.value.topProductsByRevenue ?? [];
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      );
    }
    return sortProductRows(rows, productSort.value);
  });

  const filteredDeadStock = computed(() => {
    if (!data.value) return [];
    const q = deadStockSearch.value.trim().toLowerCase();
    const rows = data.value.deadStock ?? [];
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q),
    );
  });

  const expandedCategory = computed(() => {
    if (!data.value || !expandedCategoryId.value) return null;
    return (
      data.value.categoryBreakdown.find((c) => c.categoryId === expandedCategoryId.value) ??
      null
    );
  });

  function toggleCategory(categoryId: string) {
    expandedCategoryId.value =
      expandedCategoryId.value === categoryId ? null : categoryId;
  }

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
    productSearch,
    deadStockSearch,
    expandedCategoryId,
    expandedCategory,
    filteredProducts,
    filteredDeadStock,
    range,
    loadReports,
    exportCsv,
    formatChangePct,
    toggleCategory,
  };
}
