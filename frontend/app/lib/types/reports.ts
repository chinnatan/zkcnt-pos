export type ReportPeriod = "today" | "week" | "month" | "custom";

export interface ReportPeriodRange {
  since: string;
  until: string;
}

export interface ReportPaymentBreakdown {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

export interface ReportProductRow {
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

export interface ReportCategoryRow {
  categoryId: string;
  name: string;
  revenue: number;
  cost: number;
  margin: number;
  percentage: number;
  products: ReportProductRow[];
}

export interface ReportCustomerRow {
  customerId: string;
  name: string;
  orderCount: number;
  total: number;
}

export interface ReportCashierRow {
  cashierId: string;
  name: string;
  orderCount: number;
  total: number;
  avgOrder: number;
  voidCount: number;
  voidTotal: number;
}

export interface ReportTimeSeriesPoint {
  label: string;
  total: number;
  count: number;
}

export interface ReportLowStockRow {
  productId: string;
  name: string;
  quantity: number;
  threshold: number;
}

export interface ReportDeadStockRow {
  productId: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  price: number;
}

export interface ReportPromotionRow {
  promotionId: string;
  name: string;
  type: string;
  useCount: number;
  discountTotal: number;
  couponCode: string | null;
}

export interface ReportDayOfWeekRow {
  day: number;
  label: string;
  total: number;
  count: number;
}

export interface ReportHourlyHeatmapCell {
  day: number;
  hour: number;
  total: number;
  count: number;
}

export interface ReportLapsedCustomerRow {
  customerId: string;
  name: string;
  lastOrderAt: string;
  totalSpent: number;
  visitCount: number;
}

export interface ReportFastMoverLowStockRow {
  productId: string;
  name: string;
  quantity: number;
  threshold: number;
  qtySold: number;
}

export interface ReportInventoryMovements {
  stock_in: number;
  stock_out: number;
  adjustment: number;
  sale: number;
}

export interface ReportsSummary {
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  salesChangePct: number | null;
  ordersChangePct: number | null;
  netSales: number;
  totalTax: number;
  totalDiscount: number;
  discountOrderCount: number;
  totalSubtotal: number;
  totalChange: number;
  cashSales: number;
  cashReceived: number;
  voidedCount: number;
  voidedTotal: number;
  refundedCount: number;
  refundedTotal: number;
  walkInCount: number;
  registeredCustomerCount: number;
  newCustomerCount: number;
  returningCustomerCount: number;
  avgItemsPerOrder: number;
  peakHourLabel: string | null;
  grossProfit: number;
  grossMarginPct: number | null;
  grossProfitChangePct: number | null;
}

export interface ReportPreviousSummary {
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  grossProfit: number;
}

export interface ReportsData {
  period: ReportPeriodRange;
  previousPeriod: ReportPeriodRange;
  summary: ReportsSummary;
  previousSummary: ReportPreviousSummary;
  paymentBreakdown: ReportPaymentBreakdown[];
  timeSeries: ReportTimeSeriesPoint[];
  dayOfWeekBreakdown: ReportDayOfWeekRow[];
  hourlyHeatmap: ReportHourlyHeatmapCell[];
  topProductsByRevenue: ReportProductRow[];
  topProductsByQty: ReportProductRow[];
  allProducts: ReportProductRow[];
  deadStock: ReportDeadStockRow[];
  categoryBreakdown: ReportCategoryRow[];
  topCustomers: ReportCustomerRow[];
  lapsedCustomers: ReportLapsedCustomerRow[];
  cashierLeaderboard: ReportCashierRow[];
  promotions: ReportPromotionRow[];
  stockValue: number;
  stockValueRetail: number;
  lowStock: ReportLowStockRow[];
  lowStockFastMovers: ReportFastMoverLowStockRow[];
  inventoryMovements: ReportInventoryMovements | null;
  reconciliation: {
    match: boolean;
    ordersCount: number;
    auditCount: number;
  } | null;
}
