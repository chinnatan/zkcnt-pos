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

function createLineId(): string {
  return crypto.randomUUID();
}

function findMergeableLine(
  productId: string,
  note: string,
  excludeLineId?: string,
): CartItem | undefined {
  return cartItems.value.find(
    (item) =>
      item.line_id !== excludeLineId &&
      item.product.id === productId &&
      item.note === note,
  );
}

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
    const qtyByProduct = new Map<string, number>();

    for (const item of cartItems.value) {
      qtyByProduct.set(
        item.product.id,
        (qtyByProduct.get(item.product.id) ?? 0) + item.quantity,
      );
    }

    for (const item of cartItems.value) {
      const adj = adjustments.find((a) => a.product_id === item.product.id);
      const totalQty = qtyByProduct.get(item.product.id) ?? item.quantity;
      const share = totalQty > 0 ? item.quantity / totalQty : 1;

      item.discount = Math.round((adj?.discount ?? 0) * share);
      item.free_quantity = Math.round((adj?.free_quantity ?? 0) * share);
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
    const existing = findMergeableLine(product.id, "");
    if (existing) {
      existing.quantity++;
    } else {
      cartItems.value.push({
        line_id: createLineId(),
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

  function removeItem(lineId: string) {
    const idx = cartItems.value.findIndex((item) => item.line_id === lineId);
    if (idx !== -1) cartItems.value.splice(idx, 1);
    syncLinePromotions();
  }

  function updateQuantity(lineId: string, quantity: number) {
    const item = cartItems.value.find((item) => item.line_id === lineId);
    if (item) {
      if (quantity <= 0) {
        removeItem(lineId);
      } else {
        item.quantity = quantity;
        syncLinePromotions();
      }
    }
  }

  function updateItemNote(lineId: string, note: string) {
    const item = cartItems.value.find((i) => i.line_id === lineId);
    if (!item) return;

    const trimmed = note.trim();
    item.note = trimmed;

    const duplicate = findMergeableLine(item.product.id, trimmed, lineId);
    if (duplicate) {
      duplicate.quantity += item.quantity;
      removeItem(lineId);
    } else {
      syncLinePromotions();
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
    updateItemNote,
    applyCoupon,
    clearCoupon,
    clearCart,
  };
}
