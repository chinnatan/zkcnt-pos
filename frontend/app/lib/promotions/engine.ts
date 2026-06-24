import type {
  AppliedPromotion,
  CartLineInput,
  LineAdjustment,
  PromotionEngineInput,
  PromotionInput,
  PromotionResult,
  PromotionTargetInput,
} from "./types";

interface UnitSlot {
  product_id: string;
  price: number;
}

export function calcBxgyQuantities(
  quantity: number,
  buyQty: number,
  getQty: number,
): { paidQty: number; freeQty: number } {
  if (buyQty <= 0 || getQty <= 0 || quantity <= 0) {
    return { paidQty: quantity, freeQty: 0 };
  }
  const bundle = buyQty + getQty;
  const sets = Math.floor(quantity / bundle);
  const remainder = quantity % bundle;
  const paidQty = sets * buyQty + Math.min(remainder, buyQty);
  return { paidQty, freeQty: quantity - paidQty };
}

function isPromotionActive(promo: PromotionInput, now: Date): boolean {
  if (!promo.is_active) return false;
  if (promo.start_date && new Date(promo.start_date) > now) return false;
  if (promo.end_date && new Date(promo.end_date) < now) return false;
  return true;
}

function lineMatchesTargets(
  line: CartLineInput,
  targets: PromotionTargetInput[],
): boolean {
  if (targets.length === 0) return true;
  return targets.some((t) => {
    if (t.target_type === "product") return t.target_id === line.product_id;
    return t.target_id === line.category_id && line.category_id !== "";
  });
}

function filterQualifyingLines(
  lines: CartLineInput[],
  targets: PromotionTargetInput[],
): CartLineInput[] {
  return lines.filter((line) => lineMatchesTargets(line, targets));
}

function expandUnits(lines: CartLineInput[]): UnitSlot[] {
  const units: UnitSlot[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.quantity; i++) {
      units.push({ product_id: line.product_id, price: line.price });
    }
  }
  return units;
}

function distributeDiscounts(
  units: UnitSlot[],
  discountedCount: number,
  discountPercent: number,
  rewardMode: "cheapest" | "same_product",
): Map<string, { discount: number; freeQty: number }> {
  const result = new Map<string, { discount: number; freeQty: number }>();
  if (discountedCount <= 0) return result;

  const sorted = [...units];
  if (rewardMode === "cheapest") {
    sorted.sort((a, b) => a.price - b.price);
  }

  for (let i = 0; i < Math.min(discountedCount, sorted.length); i++) {
    const unit = sorted[i]!;
    const saving = Math.round(unit.price * (discountPercent / 100));
    const existing = result.get(unit.product_id) ?? { discount: 0, freeQty: 0 };
    existing.discount += saving;
    if (discountPercent >= 100) existing.freeQty += 1;
    result.set(unit.product_id, existing);
  }

  return result;
}

function applyBxgyPromotion(
  promo: PromotionInput,
  lines: CartLineInput[],
  adjustments: Map<string, LineAdjustment>,
): number {
  const qualifying = filterQualifyingLines(lines, promo.targets);
  if (qualifying.length === 0) return 0;

  let totalSavings = 0;
  const buy = promo.buy_quantity;
  const get = promo.get_quantity;
  const discountPercent = promo.get_discount_percent;

  const processPool = (poolLines: CartLineInput[]) => {
    const totalQty = poolLines.reduce((s, l) => s + l.quantity, 0);
    const { freeQty } = calcBxgyQuantities(totalQty, buy, get);
    if (freeQty <= 0) return;

    const units = expandUnits(poolLines);
    const distributed = distributeDiscounts(
      units,
      freeQty,
      discountPercent,
      promo.reward_mode,
    );

    for (const [productId, { discount, freeQty: fq }] of distributed) {
      totalSavings += discount;
      const existing = adjustments.get(productId) ?? {
        product_id: productId,
        discount: 0,
        free_quantity: 0,
      };
      existing.discount += discount;
      existing.free_quantity += fq;
      existing.promotion_id = promo.id;
      adjustments.set(productId, existing);
    }
  };

  if (promo.pool_mode === "same_product") {
    const byProduct = new Map<string, CartLineInput[]>();
    for (const line of qualifying) {
      const list = byProduct.get(line.product_id) ?? [];
      list.push(line);
      byProduct.set(line.product_id, list);
    }
    for (const pool of byProduct.values()) processPool(pool);
  } else if (promo.pool_mode === "same_category") {
    const byCategory = new Map<string, CartLineInput[]>();
    for (const line of qualifying) {
      const key = line.category_id || "_none";
      const list = byCategory.get(key) ?? [];
      list.push(line);
      byCategory.set(key, list);
    }
    for (const pool of byCategory.values()) processPool(pool);
  } else {
    processPool(qualifying);
  }

  return totalSavings;
}

function calcOrderLevelDiscount(
  promo: PromotionInput,
  subtotal: number,
): number {
  if (subtotal < promo.min_purchase) return 0;

  if (promo.type === "order_percent") {
    return Math.round(subtotal * (promo.value / 100));
  }
  if (promo.type === "order_fixed") {
    return Math.min(promo.value, subtotal);
  }
  if (promo.type === "coupon") {
    if (promo.coupon_discount_type === "percent") {
      return Math.round(subtotal * (promo.value / 100));
    }
    return Math.min(promo.value, subtotal);
  }
  return 0;
}

function checkUsageLimits(
  promo: PromotionInput,
  customerId: string | undefined,
  usageByPromotion: Record<string, number>,
  usageByPromotionCustomer: Record<string, number>,
): string | null {
  const totalUses = usageByPromotion[promo.id] ?? 0;
  if (promo.max_uses_total != null && totalUses >= promo.max_uses_total) {
    return "คูปองนี้ถูกใช้ครบจำนวนแล้ว";
  }
  if (customerId && promo.max_uses_per_customer != null) {
    const key = `${promo.id}:${customerId}`;
    const customerUses = usageByPromotionCustomer[key] ?? 0;
    if (customerUses >= promo.max_uses_per_customer) {
      return "คุณใช้คูปองนี้ครบจำนวนแล้ว";
    }
  }
  return null;
}

export function calculatePromotions(
  input: PromotionEngineInput,
): PromotionResult {
  const now = input.now ?? new Date();
  const grossSubtotal = input.lines.reduce(
    (s, l) => s + l.price * l.quantity,
    0,
  );

  const adjustments = new Map<string, LineAdjustment>();
  const applied: AppliedPromotion[] = [];
  let blocked = false;
  let couponError: string | undefined;

  const activePromos = input.promotions
    .filter((p) => isPromotionActive(p, now))
    .sort((a, b) => b.priority - a.priority);

  for (const promo of activePromos) {
    if (blocked && !promo.stackable) continue;
    if (promo.type !== "bxgy") continue;
    if (promo.buy_quantity <= 0 || promo.get_quantity <= 0) continue;

    const savings = applyBxgyPromotion(promo, input.lines, adjustments);
    if (savings > 0) {
      applied.push({
        promotion_id: promo.id,
        name: promo.name,
        amount: savings,
      });
      if (!promo.stackable) blocked = true;
    }
  }

  const lineDiscountTotal = [...adjustments.values()].reduce(
    (s, a) => s + a.discount,
    0,
  );
  let promoSubtotal = grossSubtotal - lineDiscountTotal;
  let orderDiscount = 0;

  for (const promo of activePromos) {
    if (blocked && !promo.stackable) continue;
    if (promo.type !== "order_percent" && promo.type !== "order_fixed") continue;

    const amount = calcOrderLevelDiscount(promo, promoSubtotal);
    if (amount <= 0) continue;

    applied.push({
      promotion_id: promo.id,
      name: promo.name,
      amount,
    });
    orderDiscount += amount;
    promoSubtotal -= amount;
    if (!promo.stackable) blocked = true;
  }

  const normalizedCoupon = input.coupon_code?.trim().toLowerCase() ?? "";
  if (normalizedCoupon) {
    const couponPromo = activePromos.find(
      (p) =>
        p.type === "coupon" &&
        p.coupon_code?.trim().toLowerCase() === normalizedCoupon,
    );

    if (!couponPromo) {
      couponError = "ไม่พบคูปองนี้";
    } else if (blocked && !couponPromo.stackable) {
      couponError = "ไม่สามารถใช้คูปองร่วมกับโปรโมชันอื่นได้";
    } else {
      const usageError = checkUsageLimits(
        couponPromo,
        input.customer_id,
        input.usage_by_promotion ?? {},
        input.usage_by_promotion_customer ?? {},
      );
      if (usageError) {
        couponError = usageError;
      } else {
        const amount = calcOrderLevelDiscount(couponPromo, promoSubtotal);
        if (amount <= 0 && couponPromo.min_purchase > promoSubtotal) {
          couponError = `ยอดซื้อขั้นต่ำ ${couponPromo.min_purchase} บาท`;
        } else if (amount > 0) {
          applied.push({
            promotion_id: couponPromo.id,
            name: couponPromo.name,
            amount,
            coupon_code: couponPromo.coupon_code ?? undefined,
          });
          orderDiscount += amount;
          promoSubtotal -= amount;
        }
      }
    }
  }

  return {
    line_adjustments: [...adjustments.values()],
    order_discount: orderDiscount,
    applied_promotions: applied,
    coupon_error: couponError,
    gross_subtotal: grossSubtotal,
    promo_subtotal: promoSubtotal,
  };
}

export function totalsMatch(
  expected: number,
  actual: number,
  tolerance = 1,
): boolean {
  return Math.abs(expected - actual) <= tolerance;
}
