import { describe, expect, test } from "vitest";
import { calculatePromotions } from "~/lib/promotions/engine";
import type { PromotionEngineInput } from "~/lib/promotions/types";
import fixtures from "../../../../shared/test-fixtures/promotions.json";

interface FixtureCase {
  name: string;
  input: PromotionEngineInput;
  expected: {
    line_discount?: number;
    free_quantity?: number;
    promo_subtotal?: number;
    applied_count?: number;
    order_discount?: number;
    has_coupon_error?: boolean;
  };
}

describe("promotions engine (shared fixtures)", () => {
  for (const fx of fixtures as FixtureCase[]) {
    test(fx.name, () => {
      const result = calculatePromotions(fx.input);

      if (fx.expected.line_discount !== undefined) {
        expect(result.line_adjustments[0]?.discount).toBe(fx.expected.line_discount);
      }
      if (fx.expected.free_quantity !== undefined) {
        expect(result.line_adjustments[0]?.free_quantity).toBe(fx.expected.free_quantity);
      }
      if (fx.expected.promo_subtotal !== undefined) {
        expect(result.promo_subtotal).toBe(fx.expected.promo_subtotal);
      }
      if (fx.expected.applied_count !== undefined) {
        expect(result.applied_promotions).toHaveLength(fx.expected.applied_count);
      }
      if (fx.expected.order_discount !== undefined) {
        expect(result.order_discount).toBe(fx.expected.order_discount);
      }
      if (fx.expected.has_coupon_error) {
        expect(result.coupon_error).toBeTruthy();
      }
    });
  }
});

describe("calcBxgyQuantities parity", () => {
  test("buy 3 get 1 free", async () => {
    const { calcBxgyQuantities } = await import("~/lib/promotions/engine");
    expect(calcBxgyQuantities(4, 3, 1)).toEqual({ paidQty: 3, freeQty: 1 });
  });
});
