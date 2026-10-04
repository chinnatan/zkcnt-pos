import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import BoothProductPicker from "~/components/booth/BoothProductPicker.vue";
import type { BoothProduct, Product } from "~/lib/types";

const add = vi.fn();
const remove = vi.fn();
vi.mock("~/composables/useBooths", () => ({
  useBooths: () => ({
    addBoothProduct: add,
    updateBoothProduct: vi.fn(),
    removeBoothProduct: remove,
  }),
}));
vi.mock("~/composables/useDialog", () => ({
  useDialog: () => ({ prompt: vi.fn(), alert: vi.fn(), confirm: vi.fn() }),
}));

const product = (i: number, extra: Partial<Product> = {}) =>
  ({
    id: `p${i}`, store: "s1", name: `Item ${i}`, sku: `S${i}`, price: 10, cost: 1,
    category: "c1", track_inventory: true, is_active: true, ...extra,
  }) as Product;

const products = Array.from({ length: 60 }, (_, i) => product(i, { category: ["c1", "gone", ""][i % 3]! }));
const row = (pid: string): BoothProduct =>
  ({ id: `bp-${pid}`, booth: "b1", product: pid, qty_brought: 1, qty_left: null }) as BoothProduct;

const mountPicker = (rows: BoothProduct[] = []) =>
  mountSuspended(BoothProductPicker, {
    props: {
      boothId: "b1",
      products,
      categories: [{ id: "c1", name: "Stickers" }] as never,
      stock: new Map(products.map((p) => [p.id, 3])),
      rows,
      perPiece: 0,
    },
  });

describe("BoothProductPicker selection", () => {
  beforeEach(() => {
    add.mockReset().mockResolvedValue(undefined);
    remove.mockReset().mockResolvedValue(undefined);
  });

  test("every product is visible, including those with a deleted category", async () => {
    const w = await mountPicker();
    expect(w.findAll("[data-testid^='booth-product-']")).toHaveLength(60);
  });

  test("select shown adds every product", async () => {
    const w = await mountPicker();
    await w.get("[data-testid='booth-select-shown']").trigger("click");
    await flushPromises();
    expect(add).toHaveBeenCalledTimes(60);
  });

  test("select shown survives a failing call and still reports completion", async () => {
    add.mockRejectedValueOnce(new Error("api down"));
    const w = await mountPicker();
    await w.get("[data-testid='booth-select-shown']").trigger("click");
    await flushPromises();
    expect(add).toHaveBeenCalledTimes(60);
    expect(w.emitted("changed")).toBeTruthy();
  });

  test("category checkbox shows the DOM state that matches data after a no-op/failed change", async () => {
    add.mockRejectedValue(new Error("api down"));
    const w = await mountPicker();
    const box = w.get("input[type='checkbox']");
    (box.element as HTMLInputElement).checked = true;
    await box.trigger("change");
    await flushPromises();
    // data still says nothing selected, so the box must not stay ticked
    expect((w.get("input[type='checkbox']").element as HTMLInputElement).checked).toBe(false);
  });

  test("selected count ignores rows of products that are not listed", async () => {
    const w = await mountPicker([row("p0"), row("ghost")]);
    expect(w.text()).toMatch(/\b1\b/);
    expect(w.text()).not.toMatch(/\b2\b/);
  });
});
