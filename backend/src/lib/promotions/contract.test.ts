import { describe, expect, test } from "bun:test";
import { calculatePromotions } from "./engine";
import type { PromotionEngineInput } from "./types";
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

describe("promotions engine contract (shared fixtures)", () => {
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
