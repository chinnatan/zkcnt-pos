import { test, expect, describe } from "bun:test";
import { calcBxgyQuantities, calculatePromotions } from "./engine";
import type { PromotionInput } from "./types";

describe("calcBxgyQuantities", () => {
  test("buy 3 get 1 free", () => {
    expect(calcBxgyQuantities(4, 3, 1)).toEqual({ paidQty: 3, freeQty: 1 });
    expect(calcBxgyQuantities(7, 3, 1)).toEqual({ paidQty: 6, freeQty: 1 });
    expect(calcBxgyQuantities(8, 3, 1)).toEqual({ paidQty: 6, freeQty: 2 });
    expect(calcBxgyQuantities(3, 3, 1)).toEqual({ paidQty: 3, freeQty: 0 });
  });
});

describe("calculatePromotions", () => {
  const bxgyPromo: PromotionInput = {
    id: "p1",
    name: "ซื้อ 3 แถม 1",
    type: "bxgy",
    buy_quantity: 3,
    get_quantity: 1,
    get_discount_percent: 100,
    pool_mode: "same_product",
    reward_mode: "same_product",
    value: 0,
    min_purchase: 0,
    coupon_code: null,
    coupon_discount_type: "fixed",
    max_uses_total: null,
    max_uses_per_customer: null,
    stackable: true,
    priority: 10,
    start_date: "",
    end_date: "",
    is_active: true,
    targets: [{ target_type: "product", target_id: "prod-a" }],
  };

  test("applies same-product BXGY", () => {
    const result = calculatePromotions({
      lines: [
        {
          product_id: "prod-a",
          category_id: "",
          price: 10,
          quantity: 4,
        },
      ],
      promotions: [bxgyPromo],
    });

    expect(result.line_adjustments[0]?.discount).toBe(10);
    expect(result.line_adjustments[0]?.free_quantity).toBe(1);
    expect(result.promo_subtotal).toBe(30);
    expect(result.applied_promotions).toHaveLength(1);
  });

  test("mixed pool uses cheapest reward", () => {
    const mixedPromo: PromotionInput = {
      ...bxgyPromo,
      id: "p2",
      pool_mode: "mixed",
      reward_mode: "cheapest",
      targets: [
        { target_type: "product", target_id: "prod-a" },
        { target_type: "product", target_id: "prod-b" },
      ],
    };

    const result = calculatePromotions({
      lines: [
        { product_id: "prod-a", category_id: "", price: 20, quantity: 3 },
        { product_id: "prod-b", category_id: "", price: 10, quantity: 1 },
      ],
      promotions: [mixedPromo],
    });

    const adjB = result.line_adjustments.find((a) => a.product_id === "prod-b");
    expect(adjB?.discount).toBe(10);
    expect(result.promo_subtotal).toBe(60);
  });

  test("order percent after line promo", () => {
    const orderPromo: PromotionInput = {
      ...bxgyPromo,
      id: "p3",
      type: "order_percent",
      buy_quantity: 0,
      get_quantity: 0,
      value: 10,
      targets: [],
    };

    const result = calculatePromotions({
      lines: [
        { product_id: "prod-a", category_id: "", price: 100, quantity: 1 },
      ],
      promotions: [orderPromo],
    });

    expect(result.order_discount).toBe(10);
    expect(result.promo_subtotal).toBe(90);
  });

  test("coupon validation", () => {
    const couponPromo: PromotionInput = {
      ...bxgyPromo,
      id: "p4",
      type: "coupon",
      coupon_code: "SAVE50",
      coupon_discount_type: "fixed",
      value: 50,
      min_purchase: 100,
      targets: [],
    };

    const ok = calculatePromotions({
      lines: [
        { product_id: "prod-a", category_id: "", price: 100, quantity: 2 },
      ],
      promotions: [couponPromo],
      coupon_code: "save50",
    });
    expect(ok.order_discount).toBe(50);
    expect(ok.coupon_error).toBeUndefined();

    const bad = calculatePromotions({
      lines: [
        { product_id: "prod-a", category_id: "", price: 10, quantity: 1 },
      ],
      promotions: [couponPromo],
      coupon_code: "SAVE50",
    });
    expect(bad.coupon_error).toContain("ขั้นต่ำ");
  });
});
