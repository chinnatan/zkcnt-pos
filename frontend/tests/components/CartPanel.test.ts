import { beforeEach, describe, expect, test, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import CartPanel from "~/components/pos/CartPanel.vue";
import { useCart } from "~/composables/useCart";
import type { Product } from "~/lib/types";

vi.mock("~/composables/usePosStock", () => ({
  usePosStock: () => ({
    getAvailableQty: () => 100,
    maxCartQty: () => 100,
    validateCartItems: () => [],
  }),
}));

vi.mock("~/composables/usePromptPayQr", () => ({
  usePromptPayQr: () => ({
    resolvePromptPayId: () => "",
  }),
}));

vi.mock("~/composables/useDialog", () => ({
  useDialog: () => ({
    alert: vi.fn(),
  }),
}));

const mockProduct: Product = {
  id: "p1",
  store: "s1",
  name: "Coffee",
  sku: "COF",
  barcode: "",
  description: "",
  price: 100,
  cost: 0,
  category: "",
  image: "",
  unit: "",
  track_inventory: false,
  is_active: true,
  created: "",
  updated: "",
};

describe("CartPanel checkout gating", () => {
  beforeEach(() => {
    useCart().clearCart();
  });

  test("checkout disabled when cash payment is insufficient", async () => {
    const { addItem, paymentReceived } = useCart();
    addItem(mockProduct);
    paymentReceived.value = 50;

    const wrapper = await mountSuspended(CartPanel);
    const btn = wrapper.find('[data-testid="checkout-btn"]');
    expect(btn.attributes("disabled")).toBeDefined();
  });

  test("checkout enabled when payment is sufficient", async () => {
    const { addItem, paymentReceived } = useCart();
    addItem(mockProduct);
    paymentReceived.value = 200;

    const wrapper = await mountSuspended(CartPanel);
    const btn = wrapper.find('[data-testid="checkout-btn"]');
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  test("shows cart total after adding item", async () => {
    const { addItem } = useCart();
    addItem(mockProduct);

    const wrapper = await mountSuspended(CartPanel);
    expect(wrapper.find('[data-testid="cart-total"]').text()).toContain("100");
  });
});
