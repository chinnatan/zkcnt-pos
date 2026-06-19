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
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
}

export interface ReportCategoryRow {
  categoryId: string;
  name: string;
  revenue: number;
  percentage: number;
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
  voidedCount: number;
  voidedTotal: number;
  refundedCount: number;
  refundedTotal: number;
  walkInCount: number;
  registeredCustomerCount: number;
  avgItemsPerOrder: number;
  peakHourLabel: string | null;
}

export interface ReportsData {
  period: ReportPeriodRange;
  previousPeriod: ReportPeriodRange;
  summary: ReportsSummary;
  paymentBreakdown: ReportPaymentBreakdown[];
  timeSeries: ReportTimeSeriesPoint[];
  topProductsByRevenue: ReportProductRow[];
  topProductsByQty: ReportProductRow[];
  categoryBreakdown: ReportCategoryRow[];
  topCustomers: ReportCustomerRow[];
  cashierLeaderboard: ReportCashierRow[];
  stockValue: number;
  lowStock: ReportLowStockRow[];
  inventoryMovements: ReportInventoryMovements | null;
  reconciliation: {
    match: boolean;
    ordersCount: number;
    auditCount: number;
  } | null;
}
