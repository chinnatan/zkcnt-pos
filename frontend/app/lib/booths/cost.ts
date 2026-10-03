import type { Booth, BoothProduct, Inventory, Product } from "~/lib/types";

type BoothCosts = Pick<Booth, "booth_fee" | "extra_costs">;

/** ค่าบูธ + ค่าใช้จ่ายเพิ่มเติมทั้งหมด */
export function totalBoothCost(booth: BoothCosts): number {
  return (
    (booth.booth_fee || 0) +
    (booth.extra_costs ?? []).reduce((sum, c) => sum + (c.amount || 0), 0)
  );
}

/** ค่าบูธเฉลี่ยต่อชิ้น = ต้นทุนบูธทั้งหมด ÷ Σ qty_brought (0 ถ้ายังไม่มีสินค้า) */
export function boothCostPerPiece(
  booth: BoothCosts,
  rows: Array<Pick<BoothProduct, "qty_brought">>,
): number {
  const pieces = rows.reduce((sum, r) => sum + (r.qty_brought || 0), 0);
  return pieces > 0 ? totalBoothCost(booth) / pieces : 0;
}

/** ต้นทุนรวมต่อชิ้น (ผลิต + ค่าบูธเฉลี่ย) และกำไรต่อชิ้น */
export function productEconomics(
  product: Pick<Product, "price" | "cost">,
  perPiece: number,
) {
  const unitCost = (product.cost || 0) + perPiece;
  return { unitCost, profit: (product.price || 0) - unitCost };
}

/** สินค้า active ที่มีสต๊อก (> 0) พร้อมจำนวนสต๊อกเป็น qty_brought เริ่มต้น */
export function seedBoothProducts(
  products: Product[],
  inventory: Array<Pick<Inventory, "product" | "quantity">>,
): Array<{ product: string; qty_brought: number }> {
  const qty = new Map(inventory.map((i) => [i.product, i.quantity]));
  return products
    .filter((p) => p.is_active && !p.deleted_at && (qty.get(p.id) ?? 0) > 0)
    .map((p) => ({ product: p.id, qty_brought: qty.get(p.id)! }));
}

/** จำนวนวันของงาน (นับรวมวันเริ่ม–จบ) จากวันที่ YYYY-MM-DD; 0 ถ้าข้อมูลไม่ครบ/ผิด */
export function boothDayCount(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
  return Number.isFinite(diff) && diff >= 0 ? diff + 1 : 0;
}

/** บูธปิดแล้ว หรือวันนี้ (YYYY-MM-DD) พ้นวันจบงาน — ก่อนวันเริ่มยังถือว่าใช้ได้ (ตั้งค่าล่วงหน้า/ซ้อมขาย) */
export function isBoothEnded(
  booth: Pick<Booth, "closed_at" | "end_date" | "deleted_at">,
  today: string,
): boolean {
  if (booth.deleted_at || booth.closed_at) return true;
  return !!booth.end_date && today > booth.end_date;
}

/** จุดคุ้มทุน: 100% = ยอดขายเท่ากับ (ต้นทุนบูธรวม + ต้นทุนผลิตของที่ขายไป) */
export function boothBreakEven(input: { revenue: number; cogs: number; fixedCost: number }) {
  const need = input.fixedCost + input.cogs;
  const pct = need > 0 ? (input.revenue / need) * 100 : 0;
  return { pct, shortfall: Math.max(0, need - input.revenue), reached: need > 0 && input.revenue >= need };
}
