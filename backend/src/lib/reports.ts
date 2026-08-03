import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../db/client";
import {
  auditEvents,
  categories,
  customers,
  inventory,
  inventoryTransactions,
  orderItems,
  orders,
  products,
  promotionUsages,
  promotions,
  users,
} from "../db/schema";

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;
type ProductRow = typeof products.$inferSelect;

export interface ReportPeriodRange {
  since: string;
  until: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function getPreviousPeriodRange(range: ReportPeriodRange): ReportPeriodRange {
  const sinceMs = new Date(range.since).getTime();
  const untilMs = new Date(range.until).getTime();
  const duration = untilMs - sinceMs;
  return {
    since: new Date(sinceMs - duration).toISOString(),
    until: new Date(sinceMs).toISOString(),
  };
}

interface ProductAggRow {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
}

function buildProductAgg(
  itemRows: OrderItemRow[],
  productRows: ProductRow[],
): Map<string, ProductAggRow> {
  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const map = new Map<string, ProductAggRow>();

  for (const item of itemRows) {
    const product = productMap.get(item.product);
    const unitCost = product?.cost ?? 0;
    const existing = map.get(item.product) ?? {
      productId: item.product,
      name: item.productName,
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

function sortProducts(
  rows: ProductAggRow[],
  sortBy: "revenue" | "qty" | "margin",
): ProductAggRow[] {
  return [...rows].sort((a, b) => {
    if (sortBy === "qty") return b.qty - a.qty;
    if (sortBy === "margin") return b.margin - a.margin;
    return b.revenue - a.revenue;
  });
}

export async function buildStoreReports(
  storeId: string,
  range: ReportPeriodRange,
  period: "today" | "week" | "month" | "custom",
) {
  const previousRange = getPreviousPeriodRange(range);

  const periodFilter = and(
    eq(orders.store, storeId),
    gte(orders.created, range.since),
    lte(orders.created, range.until),
  );

  const prevFilter = and(
    eq(orders.store, storeId),
    gte(orders.created, previousRange.since),
    lte(orders.created, previousRange.until),
  );

  const [
    orderRows,
    prevOrderRows,
    allStoreOrders,
    productRows,
    categoryRows,
    customerRows,
    inventoryRows,
    txRows,
    auditRows,
    promotionRows,
    usageRows,
  ] = await Promise.all([
    db.select().from(orders).where(periodFilter),
    db.select().from(orders).where(prevFilter),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.store, storeId), eq(orders.status, "completed"))),
    db.select().from(products).where(eq(products.store, storeId)),
    db.select().from(categories).where(eq(categories.store, storeId)),
    db.select().from(customers).where(eq(customers.store, storeId)),
    db.select().from(inventory).where(eq(inventory.store, storeId)),
    db
      .select()
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.store, storeId),
          gte(inventoryTransactions.created, range.since),
          lte(inventoryTransactions.created, range.until),
        ),
      ),
    db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.store, storeId),
          eq(auditEvents.action, "order.create"),
          gte(auditEvents.created, range.since),
          lte(auditEvents.created, range.until),
        ),
      ),
    db.select().from(promotions).where(eq(promotions.store, storeId)),
    db
      .select()
      .from(promotionUsages)
      .where(
        and(
          eq(promotionUsages.store, storeId),
          gte(promotionUsages.created, range.since),
          lte(promotionUsages.created, range.until),
        ),
      ),
  ]);

  const completed = orderRows.filter((o) => o.status === "completed");
  const previousCompleted = prevOrderRows.filter((o) => o.status === "completed");
  const completedIds = new Set(completed.map((o) => o.id));
  const prevCompletedIds = new Set(previousCompleted.map((o) => o.id));

  let itemRows: OrderItemRow[] = [];
  let prevItemRows: OrderItemRow[] = [];
  const allItemOrderIds = [...new Set([...completedIds, ...prevCompletedIds])];
  if (allItemOrderIds.length > 0) {
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.order, allItemOrderIds));
    itemRows = allItems.filter((i) => completedIds.has(i.order));
    prevItemRows = allItems.filter((i) => prevCompletedIds.has(i.order));
  }

  const cashierIds = [...new Set(orderRows.map((o) => o.cashier).filter(Boolean))];
  const cashierNameMap = new Map<string, string>();
  if (cashierIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, cashierIds));
    for (const u of userRows) cashierNameMap.set(u.id, u.name);
  }

  const productAgg = buildProductAgg(itemRows, productRows);
  const prevProductAgg = buildProductAgg(prevItemRows, productRows);
  const allProducts = sortProducts([...productAgg.values()], "revenue");

  const totalSales = completed.reduce((s, o) => s + o.total, 0);
  const prevSales = previousCompleted.reduce((s, o) => s + o.total, 0);
  const totalOrders = completed.length;
  const prevOrders = previousCompleted.length;

  const voided = orderRows.filter((o) => o.status === "voided");
  const refunded = orderRows.filter((o) => o.status === "refunded");

  const categoryNameMap = new Map(categoryRows.map((c) => [c.id, c.name]));
  const customerNameMap = new Map(customerRows.map((c) => [c.id, c.name]));
  const productNameMap = new Map(productRows.map((p) => [p.id, p.name]));
  const productMap = new Map(productRows.map((p) => [p.id, p]));

  const categoryMap = new Map<
    string,
    { revenue: number; cost: number; products: Map<string, ProductAggRow> }
  >();
  let categoryTotal = 0;
  for (const row of productAgg.values()) {
    const key = row.categoryId || "__uncategorized__";
    const existing = categoryMap.get(key) ?? {
      revenue: 0,
      cost: 0,
      products: new Map(),
    };
    existing.revenue += row.revenue;
    existing.cost += row.cost * row.qty;
    existing.products.set(row.productId, row);
    categoryMap.set(key, existing);
    categoryTotal += row.revenue;
  }

  const categoryBreakdown = [...categoryMap.entries()]
    .map(([categoryId, data]) => ({
      categoryId,
      name:
        categoryId === "__uncategorized__"
          ? "Uncategorized"
          : categoryNameMap.get(categoryId) ?? categoryId,
      revenue: data.revenue,
      cost: data.cost,
      margin: data.revenue - data.cost,
      percentage: categoryTotal > 0 ? (data.revenue / categoryTotal) * 100 : 0,
      products: sortProducts([...data.products.values()], "revenue"),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const invQtyMap = new Map(inventoryRows.map((i) => [i.product, i.quantity]));
  const deadStock = productRows
    .filter((p) => p.isActive && !p.deletedAt && !productAgg.has(p.id))
    .map((p) => {
      const catId = p.category || "__uncategorized__";
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku ?? "",
        categoryId: catId,
        categoryName:
          catId === "__uncategorized__"
            ? "Uncategorized"
            : categoryNameMap.get(catId) ?? catId,
        quantity: invQtyMap.get(p.id) ?? 0,
        price: p.price ?? 0,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);

  const customerAgg = new Map<
    string,
    { customerId: string; name: string; orderCount: number; total: number }
  >();
  for (const o of completed) {
    if (!o.customer) continue;
    const existing = customerAgg.get(o.customer) ?? {
      customerId: o.customer,
      name: customerNameMap.get(o.customer) ?? o.customer,
      orderCount: 0,
      total: 0,
    };
    existing.orderCount += 1;
    existing.total += o.total;
    customerAgg.set(o.customer, existing);
  }

  const sinceMs = new Date(range.since).getTime();
  const firstOrderAt = new Map<string, number>();
  const lastOrderAt = new Map<string, string>();
  const lifetimeSpend = new Map<string, number>();
  const lifetimeVisits = new Map<string, number>();
  for (const o of allStoreOrders) {
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
    completed.filter((o) => o.customer).map((o) => o.customer!),
  );
  let newCustomerCount = 0;
  let returningCustomerCount = 0;
  for (const customerId of periodCustomerIds) {
    const first = firstOrderAt.get(customerId);
    if (first !== undefined && first >= sinceMs) newCustomerCount += 1;
    else returningCustomerCount += 1;
  }

  const lapsedCustomers = [...lastOrderAt.entries()]
    .filter(([customerId, lastAt]) => {
      if (periodCustomerIds.has(customerId)) return false;
      return new Date(lastAt).getTime() < sinceMs;
    })
    .map(([customerId, lastAt]) => ({
      customerId,
      name: customerNameMap.get(customerId) ?? customerId,
      lastOrderAt: lastAt,
      totalSpent: lifetimeSpend.get(customerId) ?? 0,
      visitCount: lifetimeVisits.get(customerId) ?? 0,
    }))
    .sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime())
    .slice(0, 20);

  const cashierAgg = new Map<
    string,
    {
      cashierId: string;
      name: string;
      orderCount: number;
      total: number;
      voidCount: number;
      voidTotal: number;
    }
  >();
  for (const o of orderRows) {
    const existing = cashierAgg.get(o.cashier) ?? {
      cashierId: o.cashier,
      name: cashierNameMap.get(o.cashier) ?? o.cashier,
      orderCount: 0,
      total: 0,
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
    cashierAgg.set(o.cashier, existing);
  }

  const paymentBreakdown = (["cash", "qr"] as const).map((method) => {
    const methodOrders = completed.filter((o) => o.paymentMethod === method);
    const total = methodOrders.reduce((s, o) => s + o.total, 0);
    return {
      method,
      count: methodOrders.length,
      total,
      percentage: totalSales > 0 ? (total / totalSales) * 100 : 0,
    };
  });

  const promoMap = new Map(promotionRows.map((p) => [p.id, p]));
  const promoAgg = new Map<
    string,
    {
      promotionId: string;
      name: string;
      type: string;
      useCount: number;
      discountTotal: number;
      couponCode: string | null;
    }
  >();
  for (const usage of usageRows) {
    const promo = promoMap.get(usage.promotion);
    const existing = promoAgg.get(usage.promotion) ?? {
      promotionId: usage.promotion,
      name: promo?.name ?? usage.promotion,
      type: promo?.type ?? "unknown",
      useCount: 0,
      discountTotal: 0,
      couponCode: promo?.couponCode || null,
    };
    existing.useCount += 1;
    existing.discountTotal += usage.discountAmount;
    promoAgg.set(usage.promotion, existing);
  }
  const promotionBreakdown = [...promoAgg.values()].sort(
    (a, b) => b.discountTotal - a.discountTotal,
  );

  const itemCount = itemRows.reduce((s, i) => s + i.quantity, 0);
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

  const dayOfWeekBreakdown = Array.from({ length: 7 }, (_, day) => ({
    day,
    label: DAY_LABELS[day]!,
    total: 0,
    count: 0,
  }));
  const heatmapMap = new Map<
    string,
    { day: number; hour: number; total: number; count: number }
  >();
  for (const o of completed) {
    const d = new Date(o.created);
    const day = d.getDay();
    const hour = d.getHours();
    dayOfWeekBreakdown[day]!.total += o.total;
    dayOfWeekBreakdown[day]!.count += 1;
    const key = `${day}-${hour}`;
    const existing = heatmapMap.get(key) ?? { day, hour, total: 0, count: 0 };
    existing.total += o.total;
    existing.count += 1;
    heatmapMap.set(key, existing);
  }

  const timeSeries = buildTimeSeries(completed, period);

  let stockValue = 0;
  let stockValueRetail = 0;
  const lowStock: Array<{
    productId: string;
    name: string;
    quantity: number;
    threshold: number;
  }> = [];
  for (const inv of inventoryRows) {
    const product = productMap.get(inv.product);
    const cost = product?.cost ?? 0;
    const price = product?.price ?? 0;
    stockValue += inv.quantity * cost;
    stockValueRetail += inv.quantity * price;
    if (inv.quantity <= inv.lowStockThreshold) {
      lowStock.push({
        productId: inv.product,
        name: productNameMap.get(inv.product) ?? inv.product,
        quantity: inv.quantity,
        threshold: inv.lowStockThreshold,
      });
    }
  }
  lowStock.sort((a, b) => a.quantity - b.quantity);

  const lowStockFastMovers = lowStock
    .map((row) => ({
      ...row,
      qtySold: productAgg.get(row.productId)?.qty ?? 0,
    }))
    .filter((row) => row.qtySold > 0)
    .sort((a, b) => b.qtySold - a.qtySold);

  const inventoryMovements = {
    stock_in: 0,
    stock_out: 0,
    adjustment: 0,
    sale: 0,
  };
  for (const tx of txRows) {
    inventoryMovements[tx.type] += tx.quantity;
  }

  const auditTotal = auditRows.reduce((s, a) => {
    const meta = a.metadata as Record<string, unknown>;
    return s + Number(meta.total ?? 0);
  }, 0);

  const cashOrders = completed.filter((o) => o.paymentMethod === "cash");
  const grossProfit = [...productAgg.values()].reduce((s, p) => s + p.margin, 0);
  const prevGrossProfit = [...prevProductAgg.values()].reduce((s, p) => s + p.margin, 0);
  const itemRevenue = [...productAgg.values()].reduce((s, p) => s + p.revenue, 0);
  const prevTotalSales = previousCompleted.reduce((s, o) => s + o.total, 0);

  return {
    period: range,
    previousPeriod: previousRange,
    summary: {
      totalSales,
      totalOrders,
      averageOrder: totalOrders > 0 ? totalSales / totalOrders : 0,
      salesChangePct: pctChange(totalSales, prevSales),
      ordersChangePct: pctChange(totalOrders, prevOrders),
      netSales:
        totalSales -
        voided.reduce((s, o) => s + o.total, 0) -
        refunded.reduce((s, o) => s + o.total, 0),
      totalTax: completed.reduce((s, o) => s + o.taxAmount, 0),
      totalDiscount: completed.reduce((s, o) => s + o.discountAmount, 0),
      discountOrderCount: completed.filter((o) => o.discountAmount > 0).length,
      totalSubtotal: completed.reduce((s, o) => s + o.subtotal, 0),
      totalChange: cashOrders.reduce((s, o) => s + o.changeAmount, 0),
      cashSales: cashOrders.reduce((s, o) => s + o.total, 0),
      cashReceived: cashOrders.reduce((s, o) => s + o.paymentReceived, 0),
      voidedCount: voided.length,
      voidedTotal: voided.reduce((s, o) => s + o.total, 0),
      refundedCount: refunded.length,
      refundedTotal: refunded.reduce((s, o) => s + o.total, 0),
      walkInCount: completed.filter((o) => !o.customer).length,
      registeredCustomerCount: completed.filter((o) => !!o.customer).length,
      newCustomerCount,
      returningCustomerCount,
      avgItemsPerOrder: totalOrders > 0 ? itemCount / totalOrders : 0,
      peakHourLabel:
        peakHour !== null
          ? `${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00`
          : null,
      grossProfit,
      grossMarginPct: itemRevenue > 0 ? (grossProfit / itemRevenue) * 100 : null,
      grossProfitChangePct: pctChange(grossProfit, prevGrossProfit),
    },
    previousSummary: {
      totalSales: prevTotalSales,
      totalOrders: previousCompleted.length,
      averageOrder:
        previousCompleted.length > 0 ? prevTotalSales / previousCompleted.length : 0,
      grossProfit: prevGrossProfit,
    },
    paymentBreakdown,
    timeSeries,
    dayOfWeekBreakdown,
    hourlyHeatmap: [...heatmapMap.values()],
    topProductsByRevenue: allProducts.slice(0, 10),
    topProductsByQty: sortProducts(allProducts, "qty").slice(0, 10),
    allProducts,
    deadStock,
    categoryBreakdown,
    topCustomers: [...customerAgg.values()].sort((a, b) => b.total - a.total).slice(0, 10),
    lapsedCustomers,
    cashierLeaderboard: [...cashierAgg.values()]
      .map((row) => ({
        ...row,
        avgOrder: row.orderCount > 0 ? row.total / row.orderCount : 0,
      }))
      .sort((a, b) => b.total - a.total),
    promotions: promotionBreakdown,
    stockValue,
    stockValueRetail,
    lowStock,
    lowStockFastMovers,
    inventoryMovements,
    reconciliation: {
      match:
        completed.length === auditRows.length &&
        Math.abs(totalSales - auditTotal) < 0.01,
      ordersCount: completed.length,
      auditCount: auditRows.length,
    },
  };
}

function buildTimeSeries(completed: OrderRow[], period: string) {
  if (completed.length === 0) return [];

  if (period === "today") {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}:00`,
      total: 0,
      count: 0,
    }));
    for (const o of completed) {
      const h = new Date(o.created).getHours();
      buckets[h]!.total += o.total;
      buckets[h]!.count += 1;
    }
    return buckets;
  }

  const dayMap = new Map<string, { label: string; total: number; count: number }>();
  for (const o of completed) {
    const d = new Date(o.created);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const label = d.toISOString().slice(0, 10);
    const existing = dayMap.get(key) ?? { label, total: 0, count: 0 };
    existing.total += o.total;
    existing.count += 1;
    dayMap.set(key, existing);
  }
  return [...dayMap.values()];
}

export function reportsDataToCsv(data: Awaited<ReturnType<typeof buildStoreReports>>): string {
  const lines: string[] = [
    "Report Summary",
    `Period,${data.period.since},${data.period.until}`,
    `Total Sales,${data.summary.totalSales}`,
    `Total Orders,${data.summary.totalOrders}`,
    `Net Sales,${data.summary.netSales}`,
    `Gross Profit,${data.summary.grossProfit}`,
    `Gross Margin %,${data.summary.grossMarginPct ?? ""}`,
    `VAT,${data.summary.totalTax}`,
    `Discount,${data.summary.totalDiscount}`,
    `Cash Sales,${data.summary.cashSales}`,
    `Cash Received,${data.summary.cashReceived}`,
    `Change Given,${data.summary.totalChange}`,
    `Stock Value Cost,${data.stockValue}`,
    `Stock Value Retail,${data.stockValueRetail}`,
    "",
    "All Products",
    "Name,SKU,Qty,Revenue,Margin",
    ...data.allProducts.map((p) => `${p.name},${p.sku},${p.qty},${p.revenue},${p.margin}`),
    "",
    "Categories",
    "Category,Revenue,Margin,Percentage",
    ...data.categoryBreakdown.map(
      (c) => `${c.name},${c.revenue},${c.margin},${c.percentage.toFixed(1)}%`,
    ),
    "",
    "Promotions",
    "Name,Type,Uses,Discount Total",
    ...data.promotions.map(
      (p) => `${p.name},${p.type},${p.useCount},${p.discountTotal}`,
    ),
  ];
  return lines.join("\n");
}
