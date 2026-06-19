import type {
  Category,
  Customer,
  Inventory,
  InventoryTransaction,
  Order,
  OrderItem,
  Product,
} from "~/lib/types";
import type {
  ReportCashierRow,
  ReportCategoryRow,
  ReportCustomerRow,
  ReportInventoryMovements,
  ReportLowStockRow,
  ReportPaymentBreakdown,
  ReportPeriod,
  ReportPeriodRange,
  ReportProductRow,
  ReportsData,
  ReportsSummary,
  ReportTimeSeriesPoint,
} from "~/lib/types/reports";

export function getPeriodRange(
  period: ReportPeriod,
  customSince?: string,
  customUntil?: string,
): ReportPeriodRange {
  const now = new Date();
  const until = customUntil ? new Date(customUntil) : now;

  if (period === "custom" && customSince) {
    return { since: customSince, until: until.toISOString() };
  }

  let since: Date;
  switch (period) {
    case "today":
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      since.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      since = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return { since: since.toISOString(), until: until.toISOString() };
}

export function getPreviousPeriodRange(range: ReportPeriodRange): ReportPeriodRange {
  const sinceMs = new Date(range.since).getTime();
  const untilMs = new Date(range.until).getTime();
  const duration = untilMs - sinceMs;
  return {
    since: new Date(sinceMs - duration).toISOString(),
    until: new Date(sinceMs).toISOString(),
  };
}

function inRange(dateStr: string, range: ReportPeriodRange): boolean {
  const t = new Date(dateStr).getTime();
  return t >= new Date(range.since).getTime() && t <= new Date(range.until).getTime();
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function filterOrdersByRange(orders: Order[], range: ReportPeriodRange): Order[] {
  return orders.filter((o) => inRange(o.created, range));
}

function completedOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === "completed");
}

function buildPaymentBreakdown(orders: Order[], totalSales: number): ReportPaymentBreakdown[] {
  const methods = ["cash", "qr"] as const;
  return methods.map((method) => {
    const methodOrders = orders.filter((o) => o.payment_method === method);
    const total = methodOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      method,
      count: methodOrders.length,
      total,
      percentage: totalSales > 0 ? (total / totalSales) * 100 : 0,
    };
  });
}

function buildTimeSeries(
  orders: Order[],
  period: ReportPeriod,
  locale: string,
): ReportTimeSeriesPoint[] {
  if (orders.length === 0) return [];

  if (period === "today") {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}:00`,
      total: 0,
      count: 0,
    }));
    for (const o of orders) {
      const h = new Date(o.created).getHours();
      buckets[h]!.total += o.total;
      buckets[h]!.count += 1;
    }
    return buckets;
  }

  const dayMap = new Map<string, ReportTimeSeriesPoint>();
  for (const o of orders) {
    const d = new Date(o.created);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const label = d.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
      month: "short",
      day: "numeric",
    });
    const existing = dayMap.get(key) ?? { label, total: 0, count: 0 };
    existing.total += o.total;
    existing.count += 1;
    dayMap.set(key, existing);
  }
  return [...dayMap.values()];
}

function buildTopProducts(
  orderItems: OrderItem[],
  completedOrderIds: Set<string>,
  products: Product[],
  sortBy: "revenue" | "qty",
): ReportProductRow[] {
  const productCostMap = new Map(products.map((p) => [p.id, p.cost ?? 0]));
  const map = new Map<string, ReportProductRow>();

  for (const item of orderItems) {
    if (!completedOrderIds.has(item.order)) continue;
    const existing = map.get(item.product) ?? {
      productId: item.product,
      name: item.product_name,
      qty: 0,
      revenue: 0,
      cost: productCostMap.get(item.product) ?? 0,
      margin: 0,
    };
    existing.qty += item.quantity;
    existing.revenue += item.total;
    existing.margin = existing.revenue - existing.cost * existing.qty;
    map.set(item.product, existing);
  }

  return [...map.values()]
    .sort((a, b) => (sortBy === "revenue" ? b.revenue - a.revenue : b.qty - a.qty))
    .slice(0, 10);
}

function buildCategoryBreakdown(
  orderItems: OrderItem[],
  completedOrderIds: Set<string>,
  products: Product[],
  categories: Category[],
): ReportCategoryRow[] {
  const productCategoryMap = new Map(products.map((p) => [p.id, p.category]));
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const map = new Map<string, number>();
  let totalRevenue = 0;

  for (const item of orderItems) {
    if (!completedOrderIds.has(item.order)) continue;
    const catId = productCategoryMap.get(item.product) ?? "";
    const key = catId || "__uncategorized__";
    map.set(key, (map.get(key) ?? 0) + item.total);
    totalRevenue += item.total;
  }

  return [...map.entries()]
    .map(([categoryId, revenue]) => ({
      categoryId,
      name:
        categoryId === "__uncategorized__"
          ? "Uncategorized"
          : categoryNameMap.get(categoryId) ?? categoryId,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildTopCustomers(
  orders: Order[],
  customers: Customer[],
): ReportCustomerRow[] {
  const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));
  const map = new Map<string, ReportCustomerRow>();

  for (const o of orders) {
    if (!o.customer) continue;
    const existing = map.get(o.customer) ?? {
      customerId: o.customer,
      name: customerNameMap.get(o.customer) ?? o.customer,
      orderCount: 0,
      total: 0,
    };
    existing.orderCount += 1;
    existing.total += o.total;
    map.set(o.customer, existing);
  }

  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
}

function buildCashierLeaderboard(
  allOrdersInRange: Order[],
  cashierNames: Map<string, string>,
): ReportCashierRow[] {
  const map = new Map<string, ReportCashierRow>();

  for (const o of allOrdersInRange) {
    if (!o.cashier) continue;
    const existing = map.get(o.cashier) ?? {
      cashierId: o.cashier,
      name: cashierNames.get(o.cashier) ?? o.cashier,
      orderCount: 0,
      total: 0,
      avgOrder: 0,
      voidCount: 0,
      voidTotal: 0,
    };

    if (o.status === "completed") {
      existing.orderCount += 1;
      existing.total += o.total;
    } else if (o.status === "voided" || o.status === "refunded") {
      existing.voidCount += 1;
      existing.voidTotal += o.total;
    }

    map.set(o.cashier, existing);
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      avgOrder: row.orderCount > 0 ? row.total / row.orderCount : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function buildSummary(
  completed: Order[],
  previousCompleted: Order[],
  allInRange: Order[],
  orderItems: OrderItem[],
  completedOrderIds: Set<string>,
  locale: string,
): ReportsSummary {
  const totalSales = completed.reduce((s, o) => s + o.total, 0);
  const prevSales = previousCompleted.reduce((s, o) => s + o.total, 0);
  const totalOrders = completed.length;
  const prevOrders = previousCompleted.length;

  const voided = allInRange.filter((o) => o.status === "voided");
  const refunded = allInRange.filter((o) => o.status === "refunded");

  const itemCount = orderItems
    .filter((i) => completedOrderIds.has(i.order))
    .reduce((s, i) => s + i.quantity, 0);

  const hourTotals = new Map<number, number>();
  for (const o of completed) {
    const h = new Date(o.created).getHours();
    hourTotals.set(h, (hourTotals.get(h) ?? 0) + o.total);
  }
  let peakHour: number | null = null;
  let peakTotal = 0;
  for (const [h, total] of hourTotals) {
    if (total > peakTotal) {
      peakTotal = total;
      peakHour = h;
    }
  }

  const walkInCount = completed.filter((o) => !o.customer).length;
  const registeredCustomerCount = completed.filter((o) => !!o.customer).length;

  return {
    totalSales,
    totalOrders,
    averageOrder: totalOrders > 0 ? totalSales / totalOrders : 0,
    salesChangePct: pctChange(totalSales, prevSales),
    ordersChangePct: pctChange(totalOrders, prevOrders),
    netSales:
      totalSales -
      voided.reduce((s, o) => s + o.total, 0) -
      refunded.reduce((s, o) => s + o.total, 0),
    totalTax: completed.reduce((s, o) => s + o.tax_amount, 0),
    totalDiscount: completed.reduce((s, o) => s + o.discount_amount, 0),
    discountOrderCount: completed.filter((o) => o.discount_amount > 0).length,
    totalSubtotal: completed.reduce((s, o) => s + o.subtotal, 0),
    totalChange: completed
      .filter((o) => o.payment_method === "cash")
      .reduce((s, o) => s + o.change_amount, 0),
    voidedCount: voided.length,
    voidedTotal: voided.reduce((s, o) => s + o.total, 0),
    refundedCount: refunded.length,
    refundedTotal: refunded.reduce((s, o) => s + o.total, 0),
    walkInCount,
    registeredCustomerCount,
    avgItemsPerOrder: totalOrders > 0 ? itemCount / totalOrders : 0,
    peakHourLabel:
      peakHour !== null
        ? `${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00`
        : null,
  };
}

function buildLowStock(
  inventory: Inventory[],
  products: Product[],
): { stockValue: number; lowStock: ReportLowStockRow[] } {
  const productMap = new Map(products.map((p) => [p.id, p]));
  let stockValue = 0;
  const lowStock: ReportLowStockRow[] = [];

  for (const inv of inventory) {
    const product = productMap.get(inv.product);
    if (!product) continue;
    stockValue += inv.quantity * (product.cost ?? 0);
    if (inv.quantity <= inv.low_stock_threshold) {
      lowStock.push({
        productId: inv.product,
        name: product.name,
        quantity: inv.quantity,
        threshold: inv.low_stock_threshold,
      });
    }
  }

  return { stockValue, lowStock: lowStock.sort((a, b) => a.quantity - b.quantity) };
}

function buildInventoryMovements(
  transactions: InventoryTransaction[],
  range: ReportPeriodRange,
): ReportInventoryMovements {
  const filtered = transactions.filter((tx) => inRange(tx.created, range));
  const result: ReportInventoryMovements = {
    stock_in: 0,
    stock_out: 0,
    adjustment: 0,
    sale: 0,
  };
  for (const tx of filtered) {
    result[tx.type] += tx.quantity;
  }
  return result;
}

export interface AggregateInput {
  period: ReportPeriod;
  range: ReportPeriodRange;
  previousRange: ReportPeriodRange;
  orders: Order[];
  orderItems: OrderItem[];
  products: Product[];
  categories: Category[];
  customers: Customer[];
  inventory: Inventory[];
  inventoryTransactions?: InventoryTransaction[];
  cashierNames: Map<string, string>;
  locale: string;
  uncategorizedLabel?: string;
}

export function aggregateReports(input: AggregateInput): ReportsData {
  const {
    period,
    range,
    previousRange,
    orders,
    orderItems,
    products,
    categories,
    customers,
    inventory,
    inventoryTransactions,
    cashierNames,
    locale,
    uncategorizedLabel = "Uncategorized",
  } = input;

  const storeOrders = orders;
  const inRangeOrders = filterOrdersByRange(storeOrders, range);
  const previousInRange = filterOrdersByRange(storeOrders, previousRange);
  const completed = completedOrders(inRangeOrders);
  const previousCompleted = completedOrders(previousInRange);
  const completedOrderIds = new Set(completed.map((o) => o.id));
  const totalSales = completed.reduce((s, o) => s + o.total, 0);

  const categoryBreakdown = buildCategoryBreakdown(
    orderItems,
    completedOrderIds,
    products,
    categories,
  ).map((row) =>
    row.categoryId === "__uncategorized__"
      ? { ...row, name: uncategorizedLabel }
      : row,
  );

  const { stockValue, lowStock } = buildLowStock(inventory, products);

  return {
    period: range,
    previousPeriod: previousRange,
    summary: buildSummary(
      completed,
      previousCompleted,
      inRangeOrders,
      orderItems,
      completedOrderIds,
      locale,
    ),
    paymentBreakdown: buildPaymentBreakdown(completed, totalSales),
    timeSeries: buildTimeSeries(completed, period, locale),
    topProductsByRevenue: buildTopProducts(orderItems, completedOrderIds, products, "revenue"),
    topProductsByQty: buildTopProducts(orderItems, completedOrderIds, products, "qty"),
    categoryBreakdown,
    topCustomers: buildTopCustomers(completed, customers),
    cashierLeaderboard: buildCashierLeaderboard(inRangeOrders, cashierNames),
    stockValue,
    lowStock,
    inventoryMovements: inventoryTransactions
      ? buildInventoryMovements(inventoryTransactions, range)
      : null,
    reconciliation: null,
  };
}

export function reportsToCsv(data: ReportsData): string {
  const lines: string[] = [
    "Report Summary",
    `Period,${data.period.since},${data.period.until}`,
    `Total Sales,${data.summary.totalSales}`,
    `Total Orders,${data.summary.totalOrders}`,
    `Average Order,${data.summary.averageOrder}`,
    `Net Sales,${data.summary.netSales}`,
    `VAT Collected,${data.summary.totalTax}`,
    `Total Discount,${data.summary.totalDiscount}`,
    `Voided Count,${data.summary.voidedCount}`,
    `Voided Total,${data.summary.voidedTotal}`,
    `Refunded Count,${data.summary.refundedCount}`,
    `Refunded Total,${data.summary.refundedTotal}`,
    "",
    "Top Products (Revenue)",
    "Rank,Name,Qty,Revenue,Margin",
    ...data.topProductsByRevenue.map(
      (p, i) => `${i + 1},${p.name},${p.qty},${p.revenue},${p.margin}`,
    ),
    "",
    "Category Breakdown",
    "Category,Revenue,Percentage",
    ...data.categoryBreakdown.map((c) => `${c.name},${c.revenue},${c.percentage.toFixed(1)}%`),
    "",
    "Cashier Leaderboard",
    "Name,Orders,Total,Avg Order,Void Count,Void Total",
    ...data.cashierLeaderboard.map(
      (c) =>
        `${c.name},${c.orderCount},${c.total},${c.avgOrder.toFixed(2)},${c.voidCount},${c.voidTotal}`,
    ),
  ];
  return lines.join("\n");
}
