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
  users,
} from "../db/schema";

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

export interface ReportPeriodRange {
  since: string;
  until: string;
}

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
    productRows,
    categoryRows,
    customerRows,
    inventoryRows,
    txRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(orders).where(periodFilter),
    db.select().from(orders).where(prevFilter),
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
  ]);

  const completed = orderRows.filter((o) => o.status === "completed");
  const previousCompleted = prevOrderRows.filter((o) => o.status === "completed");
  const completedIds = new Set(completed.map((o) => o.id));

  let itemRows: OrderItemRow[] = [];
  if (completedIds.size > 0) {
    itemRows = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.order, [...completedIds]));
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

  const totalSales = completed.reduce((s, o) => s + o.total, 0);
  const prevSales = previousCompleted.reduce((s, o) => s + o.total, 0);
  const totalOrders = completed.length;
  const prevOrders = previousCompleted.length;

  const voided = orderRows.filter((o) => o.status === "voided");
  const refunded = orderRows.filter((o) => o.status === "refunded");

  const productCostMap = new Map(productRows.map((p) => [p.id, p.cost ?? 0]));
  const productCategoryMap = new Map(productRows.map((p) => [p.id, p.category]));
  const categoryNameMap = new Map(categoryRows.map((c) => [c.id, c.name]));
  const customerNameMap = new Map(customerRows.map((c) => [c.id, c.name]));
  const productNameMap = new Map(productRows.map((p) => [p.id, p.name]));

  const productAgg = new Map<
    string,
    { productId: string; name: string; qty: number; revenue: number; cost: number; margin: number }
  >();
  for (const item of itemRows) {
    const existing = productAgg.get(item.product) ?? {
      productId: item.product,
      name: item.productName,
      qty: 0,
      revenue: 0,
      cost: productCostMap.get(item.product) ?? 0,
      margin: 0,
    };
    existing.qty += item.quantity;
    existing.revenue += item.total;
    existing.margin = existing.revenue - existing.cost * existing.qty;
    productAgg.set(item.product, existing);
  }

  const topProductsByRevenue = [...productAgg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const topProductsByQty = [...productAgg.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const categoryAgg = new Map<string, number>();
  let categoryTotal = 0;
  for (const item of itemRows) {
    const catId = productCategoryMap.get(item.product) ?? "__uncategorized__";
    categoryAgg.set(catId, (categoryAgg.get(catId) ?? 0) + item.total);
    categoryTotal += item.total;
  }

  const categoryBreakdown = [...categoryAgg.entries()]
    .map(([categoryId, revenue]) => ({
      categoryId,
      name:
        categoryId === "__uncategorized__"
          ? "Uncategorized"
          : categoryNameMap.get(categoryId) ?? categoryId,
      revenue,
      percentage: categoryTotal > 0 ? (revenue / categoryTotal) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

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

  const timeSeries = buildTimeSeries(completed, period);

  let stockValue = 0;
  const lowStock: Array<{
    productId: string;
    name: string;
    quantity: number;
    threshold: number;
  }> = [];
  for (const inv of inventoryRows) {
    const cost = productCostMap.get(inv.product) ?? 0;
    stockValue += inv.quantity * cost;
    if (inv.quantity <= inv.lowStockThreshold) {
      lowStock.push({
        productId: inv.product,
        name: productNameMap.get(inv.product) ?? inv.product,
        quantity: inv.quantity,
        threshold: inv.lowStockThreshold,
      });
    }
  }

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
      totalChange: completed
        .filter((o) => o.paymentMethod === "cash")
        .reduce((s, o) => s + o.changeAmount, 0),
      voidedCount: voided.length,
      voidedTotal: voided.reduce((s, o) => s + o.total, 0),
      refundedCount: refunded.length,
      refundedTotal: refunded.reduce((s, o) => s + o.total, 0),
      walkInCount: completed.filter((o) => !o.customer).length,
      registeredCustomerCount: completed.filter((o) => !!o.customer).length,
      avgItemsPerOrder: totalOrders > 0 ? itemCount / totalOrders : 0,
      peakHourLabel:
        peakHour !== null
          ? `${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00`
          : null,
    },
    paymentBreakdown,
    timeSeries,
    topProductsByRevenue,
    topProductsByQty,
    categoryBreakdown,
    topCustomers: [...customerAgg.values()].sort((a, b) => b.total - a.total).slice(0, 10),
    cashierLeaderboard: [...cashierAgg.values()]
      .map((row) => ({
        ...row,
        avgOrder: row.orderCount > 0 ? row.total / row.orderCount : 0,
      }))
      .sort((a, b) => b.total - a.total),
    stockValue,
    lowStock: lowStock.sort((a, b) => a.quantity - b.quantity),
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
    `VAT,${data.summary.totalTax}`,
    `Discount,${data.summary.totalDiscount}`,
    "",
    "Top Products",
    "Name,Qty,Revenue,Margin",
    ...data.topProductsByRevenue.map((p) => `${p.name},${p.qty},${p.revenue},${p.margin}`),
  ];
  return lines.join("\n");
}
