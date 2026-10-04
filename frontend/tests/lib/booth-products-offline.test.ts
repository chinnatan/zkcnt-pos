import { beforeEach, describe, expect, test, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { db } from "~/lib/db";
import { useBooths } from "~/composables/useBooths";
import type { BoothProduct } from "~/lib/types";

const state = vi.hoisted(() => ({ online: false, server: [] as unknown[] }));

mockNuxtImport("useStore", () => () => ({ activeStoreId: { value: "s1" } }));
mockNuxtImport("useOnlineStatus", () => () => ({ isOnline: { get value() { return state.online; } } }));

const rowOf = (id: string, product: string): BoothProduct =>
  ({ id, booth: "b1", product, qty_brought: 1, qty_left: null, created: "", updated: "" }) as BoothProduct;

describe("booth products offline", () => {
  beforeEach(async () => {
    state.online = false;
    state.server = [];
    Object.assign(useNuxtApp(), { $api: { send: async () => state.server } });
    await db.boothProducts.clear();
    await db.syncQueue.clear();
  });

  test("remove then re-add offline reuses the same row id (no duplicate row for the product)", async () => {
    const { addBoothProduct, removeBoothProduct, listBoothProducts } = useBooths();
    const first = await addBoothProduct("b1", "p1", 2);
    await removeBoothProduct(first.id);
    const again = await addBoothProduct("b1", "p1", 3);
    expect(again.id).toBe(first.id);
    expect((await listBoothProducts("b1")).filter((r) => r.product === "p1")).toHaveLength(1);
  });

  test("fetching while online keeps rows that are still waiting in the sync queue", async () => {
    const { addBoothProduct, listBoothProducts } = useBooths();
    const pending = await addBoothProduct("b1", "p1", 2); // queued while offline
    state.online = true;
    state.server = [rowOf("srv-1", "p2")]; // server has not seen p1 yet
    const ids = (await listBoothProducts("b1")).map((r) => r.id).sort();
    expect(ids).toEqual([pending.id, "srv-1"].sort());
  });
});
