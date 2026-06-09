import type { Product, CartItem } from "~/lib/types";

const cartItems = ref<CartItem[]>([]);
const cartDiscount = ref(0);
const cartDiscountType = ref<"percent" | "fixed">("fixed");
const selectedCustomerId = ref<string | null>(null);
const paymentMethod = ref<"cash" | "qr">("cash");
const paymentReceived = ref(0);
const cartNote = ref("");

export function useCart() {
  const subtotal = computed(() =>
    cartItems.value.reduce((sum, item) => {
      const itemTotal = item.product.price * item.quantity - item.discount;
      return sum + itemTotal;
    }, 0)
  );

  const discountAmount = computed(() => {
    if (cartDiscountType.value === "percent") {
      return Math.round(subtotal.value * (cartDiscount.value / 100));
    }
    return cartDiscount.value;
  });

  const taxAmount = computed(() => {
    // VAT calculated on (subtotal - discount)
    return 0; // Will use store settings for VAT
  });

  const total = computed(() => {
    return Math.max(0, subtotal.value - discountAmount.value + taxAmount.value);
  });

  const changeAmount = computed(() => {
    return Math.max(0, paymentReceived.value - total.value);
  });

  const itemCount = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  );

  function addItem(product: Product) {
    const existing = cartItems.value.find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      cartItems.value.push({
        product,
        quantity: 1,
        discount: 0,
        note: "",
      });
    }
  }

  function removeItem(productId: string) {
    const idx = cartItems.value.findIndex((item) => item.product.id === productId);
    if (idx !== -1) {
      cartItems.value.splice(idx, 1);
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    const item = cartItems.value.find((item) => item.product.id === productId);
    if (item) {
      if (quantity <= 0) {
        removeItem(productId);
      } else {
        item.quantity = quantity;
      }
    }
  }

  function setItemDiscount(productId: string, discount: number) {
    const item = cartItems.value.find((item) => item.product.id === productId);
    if (item) {
      item.discount = discount;
    }
  }

  function clearCart() {
    cartItems.value = [];
    cartDiscount.value = 0;
    cartDiscountType.value = "fixed";
    selectedCustomerId.value = null;
    paymentMethod.value = "cash";
    paymentReceived.value = 0;
    cartNote.value = "";
  }

  return {
    cartItems,
    cartDiscount,
    cartDiscountType,
    selectedCustomerId,
    paymentMethod,
    paymentReceived,
    cartNote,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    changeAmount,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    setItemDiscount,
    clearCart,
  };
}
