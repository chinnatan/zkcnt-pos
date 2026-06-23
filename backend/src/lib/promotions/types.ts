export type PromotionType =
  | "bxgy"
  | "order_percent"
  | "order_fixed"
  | "coupon";

export type PoolMode = "same_product" | "same_category" | "mixed";
export type RewardMode = "cheapest" | "same_product";

export interface PromotionTargetInput {
  target_type: "product" | "category";
  target_id: string;
}

export interface PromotionInput {
  id: string;
  name: string;
  type: PromotionType;
  buy_quantity: number;
  get_quantity: number;
  get_discount_percent: number;
  pool_mode: PoolMode;
  reward_mode: RewardMode;
  value: number;
  min_purchase: number;
  coupon_code: string | null;
  coupon_discount_type: "percent" | "fixed";
  max_uses_total: number | null;
  max_uses_per_customer: number | null;
  stackable: boolean;
  priority: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  targets: PromotionTargetInput[];
}

export interface CartLineInput {
  product_id: string;
  category_id: string;
  price: number;
  quantity: number;
}

export interface LineAdjustment {
  product_id: string;
  discount: number;
  free_quantity: number;
  promotion_id?: string;
}

export interface AppliedPromotion {
  promotion_id: string;
  name: string;
  amount: number;
  coupon_code?: string;
}

export interface PromotionEngineInput {
  lines: CartLineInput[];
  promotions: PromotionInput[];
  coupon_code?: string;
  customer_id?: string;
  usage_by_promotion?: Record<string, number>;
  usage_by_promotion_customer?: Record<string, number>;
  now?: Date;
}

export interface PromotionResult {
  line_adjustments: LineAdjustment[];
  order_discount: number;
  applied_promotions: AppliedPromotion[];
  coupon_error?: string;
  gross_subtotal: number;
  promo_subtotal: number;
}
