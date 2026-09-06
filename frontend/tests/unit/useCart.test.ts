import { beforeEach, describe, expect, test } from "vitest";
import { useCart } from "~/composables/useCart";
import type { Product } from "~/lib/types";

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

const mockProduct2: Product = { ...mockProduct, id: "p2", name: "Tea" };

describe("useCart line notes", () => {
  beforeEach(() => {
    useCart().clearCart();
  });

  test("merges same product when both notes are empty", () => {
    const { addItem, cartItems } = useCart();
    addItem(mockProduct);
    addItem(mockProduct);

    expect(cartItems.value).toHaveLength(1);
    expect(cartItems.value[0]?.quantity).toBe(2);
  });

  test("creates separate line when existing line has a note", () => {
    const { addItem, updateItemNote, cartItems } = useCart();
    addItem(mockProduct);
    const lineId = cartItems.value[0]!.line_id;
    updateItemNote(lineId, "no sugar");
    addItem(mockProduct);

    expect(cartItems.value).toHaveLength(2);
    expect(cartItems.value.find((i) => i.note === "no sugar")?.quantity).toBe(1);
    expect(cartItems.value.find((i) => i.note === "")?.quantity).toBe(1);
  });

  test("merges lines when note is updated to match another line", () => {
    const { addItem, updateItemNote, cartItems } = useCart();
    addItem(mockProduct);
    const firstId = cartItems.value[0]!.line_id;
    updateItemNote(firstId, "less sweet");
    addItem(mockProduct);
    const secondId = cartItems.value.find((i) => i.note === "")!.line_id;
    updateItemNote(secondId, "less sweet");

    expect(cartItems.value).toHaveLength(1);
    expect(cartItems.value[0]?.quantity).toBe(2);
    expect(cartItems.value[0]?.note).toBe("less sweet");
  });

  test("assigns unique line_id per cart line", () => {
    const { addItem, updateItemNote, cartItems } = useCart();
    addItem(mockProduct);
    updateItemNote(cartItems.value[0]!.line_id, "a");
    addItem(mockProduct);

    const ids = cartItems.value.map((i) => i.line_id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("useCart quantity by line", () => {
  beforeEach(() => {
    useCart().clearCart();
  });

  test("updateQuantity and removeItem use line_id", () => {
    const { addItem, updateQuantity, removeItem, cartItems } = useCart();
    addItem(mockProduct);
    addItem(mockProduct2);
    const coffeeLine = cartItems.value[0]!.line_id;

    updateQuantity(coffeeLine, 3);
    expect(cartItems.value.find((i) => i.line_id === coffeeLine)?.quantity).toBe(
      3,
    );

    removeItem(coffeeLine);
    expect(cartItems.value).toHaveLength(1);
    expect(cartItems.value[0]?.product.id).toBe("p2");
  });
});
