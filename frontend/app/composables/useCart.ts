import type { Product, CartItem } from "~/lib/types";
import { calculatePromotions } from "~/lib/promotions/engine";
import type {
  AppliedPromotion,
  PromotionInput,
} from "~/lib/promotions/types";

const cartItems = ref<CartItem[]>([]);
const cartDiscount = ref(0);
const cartDiscountType = ref<"percent" | "fixed">("fixed");
const couponCode = ref("");
const appliedCouponCode = ref("");
const couponError = ref("");
const selectedCustomerId = ref<string | null>(null);
const paymentMethod = ref<"cash" | "qr">("cash");
const paymentReceived = ref(0);
const cartNote = ref("");

const promotionInputs = ref<PromotionInput[]>([]);

export function useCart() {
  const grossSubtotal = computed(() =>
    cartItems.value.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    ),
  );

  const promotionResult = computed(() =>
    calculatePromotions({
      lines: cartItems.value.map((item) => ({
        product_id: item.product.id,
        category_id: item.product.category ?? "",
        price: item.product.price,
        quantity: item.quantity,
      })),
      promotions: promotionInputs.value,
      coupon_code: appliedCouponCode.value || undefined,
      customer_id: selectedCustomerId.value || undefined,
    }),
  );

  const appliedPromotions = computed<AppliedPromotion[]>(
    () => promotionResult.value.applied_promotions,
  );

  const promoDiscountAmount = computed(() => {
    const linePromo = promotionResult.value.line_adjustments.reduce(
      (s, a) => s + a.discount,
      0,
    );
    return linePromo + promotionResult.value.order_discount;
  });

  const subtotal = computed(() => grossSubtotal.value);

  const manualDiscountAmount = computed(() => {
    const base = promotionResult.value.promo_subtotal;
    if (cartDiscountType.value === "percent") {
      return Math.round(base * (cartDiscount.value / 100));
    }
    return cartDiscount.value;
  });

  const discountAmount = computed(
    () => promoDiscountAmount.value + manualDiscountAmount.value,
  );

  const taxAmount = computed(() => 0);

  const total = computed(() =>
    Math.max(
      0,
      promotionResult.value.promo_subtotal -
        manualDiscountAmount.value +
        taxAmount.value,
    ),
  );

  const changeAmount = computed(() =>
    Math.max(0, paymentReceived.value - total.value),
  );

  const itemCount = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0),
  );

  function syncLinePromotions() {
    const adjustments = promotionResult.value.line_adjustments;
    for (const item of cartItems.value) {
      const adj = adjustments.find((a) => a.product_id === item.product.id);
      item.discount = adj?.discount ?? 0;
      item.free_quantity = adj?.free_quantity ?? 0;
      item.promotion_id = adj?.promotion_id ?? "";
    }
    couponError.value = promotionResult.value.coupon_error ?? "";
  }

  watch(
    [cartItems, promotionInputs, appliedCouponCode, selectedCustomerId],
    () => syncLinePromotions(),
    { deep: true },
  );

  function setPromotionInputs(inputs: PromotionInput[]) {
    promotionInputs.value = inputs;
  }

  function addItem(product: Product) {
    const existing = cartItems.value.find(
      (item) => item.product.id === product.id,
    );
    if (existing) {
      existing.quantity++;
    } else {
      cartItems.value.push({
        product,
        quantity: 1,
        discount: 0,
        free_quantity: 0,
        promotion_id: "",
        note: "",
      });
    }
    syncLinePromotions();
  }

  function removeItem(productId: string) {
    const idx = cartItems.value.findIndex(
      (item) => item.product.id === productId,
    );
    if (idx !== -1) cartItems.value.splice(idx, 1);
    syncLinePromotions();
  }

  function updateQuantity(productId: string, quantity: number) {
    const item = cartItems.value.find((item) => item.product.id === productId);
    if (item) {
      if (quantity <= 0) {
        removeItem(productId);
      } else {
        item.quantity = quantity;
        syncLinePromotions();
      }
    }
  }

  function applyCoupon() {
    appliedCouponCode.value = couponCode.value.trim();
    syncLinePromotions();
  }

  function clearCoupon() {
    couponCode.value = "";
    appliedCouponCode.value = "";
    couponError.value = "";
    syncLinePromotions();
  }

  function clearCart() {
    cartItems.value = [];
    cartDiscount.value = 0;
    cartDiscountType.value = "fixed";
    couponCode.value = "";
    appliedCouponCode.value = "";
    couponError.value = "";
    selectedCustomerId.value = null;
    paymentMethod.value = "cash";
    paymentReceived.value = 0;
    cartNote.value = "";
  }

  return {
    cartItems,
    cartDiscount,
    cartDiscountType,
    couponCode,
    appliedCouponCode,
    couponError,
    selectedCustomerId,
    paymentMethod,
    paymentReceived,
    cartNote,
    grossSubtotal,
    subtotal,
    promoDiscountAmount,
    manualDiscountAmount,
    discountAmount,
    appliedPromotions,
    taxAmount,
    total,
    changeAmount,
    itemCount,
    setPromotionInputs,
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    clearCoupon,
    clearCart,
  };
}
