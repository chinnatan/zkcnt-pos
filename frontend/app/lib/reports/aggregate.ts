import type {
  Category,
  Customer,
  Inventory,
  InventoryTransaction,
  Order,
  OrderItem,
  Product,
  Promotion,
  PromotionUsage,
} from "~/lib/types";
import type {
  ReportCashierRow,
  ReportCategoryRow,
  ReportCustomerRow,
  ReportDayOfWeekRow,
  ReportDeadStockRow,
  ReportFastMoverLowStockRow,
  ReportHourlyHeatmapCell,
  ReportInventoryMovements,
  ReportLapsedCustomerRow,
  ReportLowStockRow,
  ReportPaymentBreakdown,
  ReportPeriod,
  ReportPeriodRange,
  ReportProductRow,
  ReportPromotionRow,
  ReportsData,
  ReportsSummary,
  ReportTimeSeriesPoint,
} from "~/lib/types/reports";

const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

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

function buildDayOfWeek(orders: Order[], locale: string): ReportDayOfWeekRow[] {
  const labels = locale === "th" ? DAY_LABELS_TH : DAY_LABELS_EN;
  const buckets = Array.from({ length: 7 }, (_, day) => ({
    day,
    label: labels[day]!,
    total: 0,
    count: 0,
  }));
  for (const o of orders) {
    const day = new Date(o.created).getDay();
    buckets[day]!.total += o.total;
    buckets[day]!.count += 1;
  }
  return buckets;
}

function buildHourlyHeatmap(orders: Order[]): ReportHourlyHeatmapCell[] {
  const map = new Map<string, ReportHourlyHeatmapCell>();
  for (const o of orders) {
    const d = new Date(o.created);
    const day = d.getDay();
    const hour = d.getHours();
    const key = `${day}-${hour}`;
    const existing = map.get(key) ?? { day, hour, total: 0, count: 0 };
    existing.total += o.total;
    existing.count += 1;
    map.set(key, existing);
  }
  return [...map.values()];
}

function buildProductAgg(
  orderItems: OrderItem[],
  completedOrderIds: Set<string>,
  products: Product[],
): Map<string, ReportProductRow> {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, ReportProductRow>();

  for (const item of orderItems) {
    if (!completedOrderIds.has(item.order)) continue;
    const product = productMap.get(item.product);
    const unitCost = product?.cost ?? 0;
    const existing = map.get(item.product) ?? {
      productId: item.product,
      name: item.product_name,
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      categoryId: product?.category ?? "",
      qty: 0,
      revenue: 0,
      cost: unitCost,
      margin: 0,
    };
    existing.qty += item.quantity;
    existing.revenue += item.total;
    existing.margin = existing.revenue - existing.cost * existing.qty;
    map.set(item.product, existing);
  }

  return map;
}

function sortProducts(rows: ReportProductRow[], sortBy: "revenue" | "qty" | "margin"): ReportProductRow[] {
  return [...rows].sort((a, b) => {
    if (sortBy === "qty") return b.qty - a.qty;
    if (sortBy === "margin") return b.margin - a.margin;
    return b.revenue - a.revenue;
  });
}

function buildCategoryBreakdown(
  productAgg: Map<string, ReportProductRow>,
  categories: Category[],
  uncategorizedLabel: string,
): ReportCategoryRow[] {
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const map = new Map<
    string,
    { revenue: number; cost: number; products: Map<string, ReportProductRow> }
  >();
  let totalRevenue = 0;

  for (const row of productAgg.values()) {
    const key = row.categoryId || "__uncategorized__";
    const existing = map.get(key) ?? { revenue: 0, cost: 0, products: new Map() };
    existing.revenue += row.revenue;
    existing.cost += row.cost * row.qty;
    existing.products.set(row.productId, row);
    map.set(key, existing);
    totalRevenue += row.revenue;
  }

  return [...map.entries()]
    .map(([categoryId, data]) => ({
      categoryId,
      name:
        categoryId === "__uncategorized__"
          ? uncategorizedLabel
          : categoryNameMap.get(categoryId) ?? categoryId,
      revenue: data.revenue,
      cost: data.cost,
      margin: data.revenue - data.cost,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      products: sortProducts([...data.products.values()], "revenue"),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildDeadStock(
  products: Product[],
  productAgg: Map<string, ReportProductRow>,
  inventory: Inventory[],
  categories: Category[],
  uncategorizedLabel: string,
): ReportDeadStockRow[] {
  const invMap = new Map(inventory.map((i) => [i.product, i.quantity]));
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

  return products
    .filter((p) => p.is_active && !p.deleted_at && !productAgg.has(p.id))
    .map((p) => {
      const catId = p.category || "__uncategorized__";
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku ?? "",
        categoryId: catId,
        categoryName:
          catId === "__uncategorized__"
            ? uncategorizedLabel
            : categoryNameMap.get(catId) ?? catId,
        quantity: invMap.get(p.id) ?? 0,
        price: p.price ?? 0,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);
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

function buildCustomerSegments(
  allCompleted: Order[],
  periodCompleted: Order[],
  range: ReportPeriodRange,
  customers: Customer[],
): {
  newCustomerCount: number;
  returningCustomerCount: number;
  lapsedCustomers: ReportLapsedCustomerRow[];
} {
  const sinceMs = new Date(range.since).getTime();
  const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));

  const firstOrderAt = new Map<string, number>();
  const lastOrderAt = new Map<string, string>();
  const lifetimeSpend = new Map<string, number>();
  const lifetimeVisits = new Map<string, number>();

  for (const o of allCompleted) {
    if (!o.customer) continue;
    const t = new Date(o.created).getTime();
    const prevFirst = firstOrderAt.get(o.customer);
    if (prevFirst === undefined || t < prevFirst) firstOrderAt.set(o.customer, t);
    const prevLast = lastOrderAt.get(o.customer);
    if (!prevLast || t > new Date(prevLast).getTime()) lastOrderAt.set(o.customer, o.created);
    lifetimeSpend.set(o.customer, (lifetimeSpend.get(o.customer) ?? 0) + o.total);
    lifetimeVisits.set(o.customer, (lifetimeVisits.get(o.customer) ?? 0) + 1);
  }

  const periodCustomerIds = new Set(
    periodCompleted.filter((o) => o.customer).map((o) => o.customer!),
  );

  let newCustomerCount = 0;
  let returningCustomerCount = 0;
  for (const customerId of periodCustomerIds) {
    const first = firstOrderAt.get(customerId);
    if (first !== undefined && first >= sinceMs) newCustomerCount += 1;
    else returningCustomerCount += 1;
  }

  const lapsedCustomers: ReportLapsedCustomerRow[] = [];
  for (const [customerId, lastAt] of lastOrderAt) {
    if (periodCustomerIds.has(customerId)) continue;
    if (new Date(lastAt).getTime() >= sinceMs) continue;
    lapsedCustomers.push({
      customerId,
      name: customerNameMap.get(customerId) ?? customerId,
      lastOrderAt: lastAt,
      totalSpent: lifetimeSpend.get(customerId) ?? 0,
      visitCount: lifetimeVisits.get(customerId) ?? 0,
    });
  }

  lapsedCustomers.sort(
    (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime(),
  );

  return {
    newCustomerCount,
    returningCustomerCount,
    lapsedCustomers: lapsedCustomers.slice(0, 20),
  };
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

function buildPromotions(
  usages: PromotionUsage[],
  promotions: Promotion[],
  range: ReportPeriodRange,
): ReportPromotionRow[] {
  const promoMap = new Map(promotions.map((p) => [p.id, p]));
  const filtered = usages.filter((u) => inRange(u.created, range));
  const map = new Map<string, ReportPromotionRow>();

  for (const usage of filtered) {
    const promo = promoMap.get(usage.promotion);
    const existing = map.get(usage.promotion) ?? {
      promotionId: usage.promotion,
      name: promo?.name ?? usage.promotion,
      type: promo?.type ?? "unknown",
      useCount: 0,
      discountTotal: 0,
      couponCode: promo?.coupon_code || null,
    };
    existing.useCount += 1;
    existing.discountTotal += usage.discount_amount;
    map.set(usage.promotion, existing);
  }

  return [...map.values()].sort((a, b) => b.discountTotal - a.discountTotal);
}

function buildSummary(
  completed: Order[],
  previousCompleted: Order[],
  allInRange: Order[],
  orderItems: OrderItem[],
  completedOrderIds: Set<string>,
  productAgg: Map<string, ReportProductRow>,
  prevProductAgg: Map<string, ReportProductRow>,
  customerSegments: { newCustomerCount: number; returningCustomerCount: number },
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

  const cashOrders = completed.filter((o) => o.payment_method === "cash");
  const grossProfit = [...productAgg.values()].reduce((s, p) => s + p.margin, 0);
  const prevGrossProfit = [...prevProductAgg.values()].reduce((s, p) => s + p.margin, 0);
  const itemRevenue = [...productAgg.values()].reduce((s, p) => s + p.revenue, 0);

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
    totalChange: cashOrders.reduce((s, o) => s + o.change_amount, 0),
    cashSales: cashOrders.reduce((s, o) => s + o.total, 0),
    cashReceived: cashOrders.reduce((s, o) => s + o.payment_received, 0),
    voidedCount: voided.length,
    voidedTotal: voided.reduce((s, o) => s + o.total, 0),
    refundedCount: refunded.length,
    refundedTotal: refunded.reduce((s, o) => s + o.total, 0),
    walkInCount: completed.filter((o) => !o.customer).length,
    registeredCustomerCount: completed.filter((o) => !!o.customer).length,
    newCustomerCount: customerSegments.newCustomerCount,
    returningCustomerCount: customerSegments.returningCustomerCount,
    avgItemsPerOrder: totalOrders > 0 ? itemCount / totalOrders : 0,
    peakHourLabel:
      peakHour !== null
        ? `${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00`
        : null,
    grossProfit,
    grossMarginPct: itemRevenue > 0 ? (grossProfit / itemRevenue) * 100 : null,
    grossProfitChangePct: pctChange(grossProfit, prevGrossProfit),
  };
}

function buildStockValues(
  inventory: Inventory[],
  products: Product[],
): {
  stockValue: number;
  stockValueRetail: number;
  lowStock: ReportLowStockRow[];
} {
  const productMap = new Map(products.map((p) => [p.id, p]));
  let stockValue = 0;
  let stockValueRetail = 0;
  const lowStock: ReportLowStockRow[] = [];

  for (const inv of inventory) {
    const product = productMap.get(inv.product);
    if (!product) continue;
    stockValue += inv.quantity * (product.cost ?? 0);
    stockValueRetail += inv.quantity * (product.price ?? 0);
    if (inv.quantity <= inv.low_stock_threshold) {
      lowStock.push({
        productId: inv.product,
        name: product.name,
        quantity: inv.quantity,
        threshold: inv.low_stock_threshold,
      });
    }
  }

  return {
    stockValue,
    stockValueRetail,
    lowStock: lowStock.sort((a, b) => a.quantity - b.quantity),
  };
}

function buildLowStockFastMovers(
  lowStock: ReportLowStockRow[],
  productAgg: Map<string, ReportProductRow>,
): ReportFastMoverLowStockRow[] {
  return lowStock
    .map((row) => ({
      ...row,
      qtySold: productAgg.get(row.productId)?.qty ?? 0,
    }))
    .filter((row) => row.qtySold > 0)
    .sort((a, b) => b.qtySold - a.qtySold);
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
  promotions?: Promotion[];
  promotionUsages?: PromotionUsage[];
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
    promotions = [],
    promotionUsages = [],
    cashierNames,
    locale,
    uncategorizedLabel = "Uncategorized",
  } = input;

  const inRangeOrders = filterOrdersByRange(orders, range);
  const previousInRange = filterOrdersByRange(orders, previousRange);
  const completed = completedOrders(inRangeOrders);
  const previousCompleted = completedOrders(previousInRange);
  const allCompleted = completedOrders(orders);
  const completedOrderIds = new Set(completed.map((o) => o.id));
  const prevCompletedOrderIds = new Set(previousCompleted.map((o) => o.id));
  const totalSales = completed.reduce((s, o) => s + o.total, 0);

  const productAgg = buildProductAgg(orderItems, completedOrderIds, products);
  const prevProductAgg = buildProductAgg(orderItems, prevCompletedOrderIds, products);
  const allProducts = sortProducts([...productAgg.values()], "revenue");

  const customerSegments = buildCustomerSegments(
    allCompleted,
    completed,
    range,
    customers,
  );

  const { stockValue, stockValueRetail, lowStock } = buildStockValues(inventory, products);

  const summary = buildSummary(
    completed,
    previousCompleted,
    inRangeOrders,
    orderItems,
    completedOrderIds,
    productAgg,
    prevProductAgg,
    customerSegments,
  );

  return {
    period: range,
    previousPeriod: previousRange,
    summary,
    previousSummary: {
      totalSales: previousCompleted.reduce((s, o) => s + o.total, 0),
      totalOrders: previousCompleted.length,
      averageOrder:
        previousCompleted.length > 0
          ? previousCompleted.reduce((s, o) => s + o.total, 0) / previousCompleted.length
          : 0,
      grossProfit: [...prevProductAgg.values()].reduce((s, p) => s + p.margin, 0),
    },
    paymentBreakdown: buildPaymentBreakdown(completed, totalSales),
    timeSeries: buildTimeSeries(completed, period, locale),
    dayOfWeekBreakdown: buildDayOfWeek(completed, locale),
    hourlyHeatmap: buildHourlyHeatmap(completed),
    topProductsByRevenue: allProducts.slice(0, 10),
    topProductsByQty: sortProducts(allProducts, "qty").slice(0, 10),
    allProducts,
    deadStock: buildDeadStock(
      products,
      productAgg,
      inventory,
      categories,
      uncategorizedLabel,
    ),
    categoryBreakdown: buildCategoryBreakdown(productAgg, categories, uncategorizedLabel),
    topCustomers: buildTopCustomers(completed, customers),
    lapsedCustomers: customerSegments.lapsedCustomers,
    cashierLeaderboard: buildCashierLeaderboard(inRangeOrders, cashierNames),
    promotions: buildPromotions(promotionUsages, promotions, range),
    stockValue,
    stockValueRetail,
    lowStock,
    lowStockFastMovers: buildLowStockFastMovers(lowStock, productAgg),
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
    `Gross Profit,${data.summary.grossProfit}`,
    `Gross Margin %,${data.summary.grossMarginPct ?? ""}`,
    `VAT Collected,${data.summary.totalTax}`,
    `Total Discount,${data.summary.totalDiscount}`,
    `Cash Sales,${data.summary.cashSales}`,
    `Cash Received,${data.summary.cashReceived}`,
    `Change Given,${data.summary.totalChange}`,
    `Voided Count,${data.summary.voidedCount}`,
    `Voided Total,${data.summary.voidedTotal}`,
    `Refunded Count,${data.summary.refundedCount}`,
    `Refunded Total,${data.summary.refundedTotal}`,
    `New Customers,${data.summary.newCustomerCount}`,
    `Returning Customers,${data.summary.returningCustomerCount}`,
    `Stock Value Cost,${data.stockValue}`,
    `Stock Value Retail,${data.stockValueRetail}`,
    "",
    "All Products",
    "Name,SKU,Qty,Revenue,Margin,CategoryId",
    ...data.allProducts.map(
      (p) => `${p.name},${p.sku},${p.qty},${p.revenue},${p.margin},${p.categoryId}`,
    ),
    "",
    "Dead Stock",
    "Name,SKU,Stock Qty,Price,Category",
    ...data.deadStock.map(
      (p) => `${p.name},${p.sku},${p.quantity},${p.price},${p.categoryName}`,
    ),
    "",
    "Category Breakdown",
    "Category,Revenue,Margin,Percentage",
    ...data.categoryBreakdown.map(
      (c) => `${c.name},${c.revenue},${c.margin},${c.percentage.toFixed(1)}%`,
    ),
    "",
    "Promotions",
    "Name,Type,Uses,Discount Total,Coupon",
    ...data.promotions.map(
      (p) => `${p.name},${p.type},${p.useCount},${p.discountTotal},${p.couponCode ?? ""}`,
    ),
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
