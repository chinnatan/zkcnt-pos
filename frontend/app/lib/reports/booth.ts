import { boothDayCount, totalBoothCost } from "~/lib/booths/cost";
import type {
  Booth,
  BoothProduct,
  Category,
  Order,
  OrderItem,
  Product,
} from "~/lib/types";

/** sell-through ≥ HIGH → ผลิตเพิ่ม, ≤ LOW → ผลิตน้อยลง */
export const SELL_THROUGH_HIGH = 0.8;
export const SELL_THROUGH_LOW = 0.3;

export type BoothAdvice = "produceMore" | "produceLess" | null;

export function sellThroughAdvice(pct: number | null): BoothAdvice {
  if (pct === null) return null;
  if (pct >= SELL_THROUGH_HIGH) return "produceMore";
  if (pct <= SELL_THROUGH_LOW) return "produceLess";
  return null;
}

export interface BoothProductRow {
  productId: string;
  name: string;
  categoryId: string;
  brought: number;
  left: number | null;
  sold: number;
  /** pieces that left the table: brought − left when closed with a count, else sold */
  gone: number;
  revenue: number;
  profit: number;
  sellThrough: number | null;
  advice: BoothAdvice;
}

export interface BoothSummaryRow {
  boothId: string;
  name: string;
  startDate: string;
  endDate: string;
  days: number;
  closed: boolean;
  orderCount: number;
  revenue: number;
  cogs: number;
  fixedCost: number;
  profit: number;
  revenuePerDay: number | null;
  products: BoothProductRow[];
}

export interface BoothCategoryRow {
  categoryId: string;
  name: string;
  sold: number;
  revenue: number;
  brought: number;
  sellThrough: number | null;
  advice: BoothAdvice;
}

export interface BoothReportInput {
  booths: Booth[];
  boothProducts: BoothProduct[];
  orders: Order[];
  orderItems: OrderItem[];
  products: Product[];
  categories: Category[];
  uncategorizedLabel: string;
}

const ratio = (num: number, den: number) => (den > 0 ? num / den : null);

export function buildBoothReport(input: BoothReportInput) {
  const productById = new Map(input.products.map((p) => [p.id, p]));
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of input.orderItems) {
    const list = itemsByOrder.get(item.order);
    if (list) list.push(item);
    else itemsByOrder.set(item.order, [item]);
  }

  const booths: BoothSummaryRow[] = input.booths
    .filter((b) => !b.deleted_at)
    .map((booth) => {
      const orders = input.orders.filter((o) => o.booth === booth.id && o.status === "completed");
      const rows = new Map<string, BoothProductRow>();

      const row = (productId: string, fallbackName: string): BoothProductRow => {
        let r = rows.get(productId);
        if (!r) {
          const p = productById.get(productId);
          r = {
            productId,
            name: p?.name ?? fallbackName,
            categoryId: p?.category ?? "",
            brought: 0,
            left: null,
            sold: 0,
            gone: 0,
            revenue: 0,
            profit: 0,
            sellThrough: null,
            advice: null,
          };
          rows.set(productId, r);
        }
        return r;
      };

      for (const bp of input.boothProducts) {
        if (bp.booth !== booth.id || bp.deleted_at) continue;
        const r = row(bp.product, bp.product);
        r.brought = bp.qty_brought;
        r.left = bp.qty_left;
      }

      let revenue = 0;
      let cogs = 0;
      for (const order of orders) {
        revenue += order.total;
        for (const item of itemsByOrder.get(order.id) ?? []) {
          const cost = (productById.get(item.product)?.cost ?? 0) * item.quantity;
          const r = row(item.product, item.product_name);
          r.sold += item.quantity;
          r.revenue += item.total;
          r.profit += item.total - cost;
          cogs += cost;
        }
      }

      for (const r of rows.values()) {
        r.gone = r.left != null ? Math.max(0, r.brought - r.left) : r.sold;
        r.sellThrough = ratio(r.gone, r.brought);
        r.advice = sellThroughAdvice(r.sellThrough);
      }

      const fixedCost = totalBoothCost(booth);
      const days = boothDayCount(booth.start_date, booth.end_date);
      return {
        boothId: booth.id,
        name: booth.name,
        startDate: booth.start_date,
        endDate: booth.end_date,
        days,
        closed: !!booth.closed_at,
        orderCount: orders.length,
        revenue,
        cogs,
        fixedCost,
        profit: revenue - cogs - fixedCost,
        revenuePerDay: days > 0 ? revenue / days : null,
        products: [...rows.values()].sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name)),
      };
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name));

  const categoryName = new Map(input.categories.map((c) => [c.id, c.name]));
  const byCategory = new Map<string, { sold: number; revenue: number; brought: number; gone: number }>();
  for (const booth of booths) {
    for (const r of booth.products) {
      const acc = byCategory.get(r.categoryId) ?? { sold: 0, revenue: 0, brought: 0, gone: 0 };
      acc.sold += r.sold;
      acc.revenue += r.revenue;
      acc.brought += r.brought;
      acc.gone += r.gone;
      byCategory.set(r.categoryId, acc);
    }
  }
  const categories: BoothCategoryRow[] = [...byCategory.entries()]
    .map(([categoryId, a]) => {
      const sellThrough = ratio(a.gone, a.brought);
      return {
        categoryId,
        name: categoryName.get(categoryId) ?? input.uncategorizedLabel,
        sold: a.sold,
        revenue: a.revenue,
        brought: a.brought,
        sellThrough,
        advice: sellThroughAdvice(sellThrough),
      };
    })
    .sort((a, b) => b.sold - a.sold);

  return { booths, categories };
}
