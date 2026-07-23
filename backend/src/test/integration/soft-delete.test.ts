import { describe, expect, test } from "bun:test";
import { jsonRequest, authHeaders } from "../setup";
import {
  createCategory,
  createProduct,
  createStore,
  registerUser,
} from "../helpers";

describe("soft delete sync", () => {
  test("deleted product appears in delta with deleted_at", async () => {
    const { token } = await registerUser({ email: "softdel@test.com" });
    const store = await createStore(token, { slug: "softdel-store" });
    const category = await createCategory(token, store.id);
    const product = await createProduct(token, store.id, category.id, {
      name: "To Delete",
    });

    const since = new Date(Date.now() - 60_000).toISOString();

    const del = await jsonRequest(
      `/api/stores/${store.id}/products/${product.id}`,
      { method: "DELETE", headers: authHeaders(token) },
    );
    expect(del.res.status).toBe(200);

    const afterDelete = await jsonRequest<{
      products: { id: string; deleted_at: string | null }[];
    }>(`/api/stores/${store.id}/sync?since=${encodeURIComponent(since)}`, {
      headers: authHeaders(token),
    });
    expect(afterDelete.res.status).toBe(200);
    const deleted = afterDelete.json.products.find((p) => p.id === product.id);
    expect(deleted?.deleted_at).toBeTruthy();

    const list = await jsonRequest<{ name: string }[]>(
      `/api/stores/${store.id}/products`,
      { headers: authHeaders(token) },
    );
    expect(list.json.some((p) => p.name === "To Delete")).toBe(false);
  });

  test("deleting product removes inventory and logs stock_out transaction", async () => {
    const { token } = await registerUser({ email: "inv-del@test.com" });
    const store = await createStore(token, { slug: "inv-del-store" });
    const category = await createCategory(token, store.id);
    const product = await createProduct(token, store.id, category.id, {
      name: "Stocked Product",
      track_inventory: true,
    });

    const stockIn = await jsonRequest(
      `/api/stores/${store.id}/inventory-transactions`,
      {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          product: product.id,
          type: "stock_in",
          quantity: 25,
          before_qty: 0,
          after_qty: 25,
          note: "test stock",
        }),
      },
    );
    expect(stockIn.res.status).toBe(201);

    const beforeInv = await jsonRequest<{ product: string; quantity: number }[]>(
      `/api/stores/${store.id}/inventory`,
      { headers: authHeaders(token) },
    );
    expect(beforeInv.res.status).toBe(200);
    expect(beforeInv.json.some((i) => i.product === product.id)).toBe(true);

    const del = await jsonRequest(
      `/api/stores/${store.id}/products/${product.id}`,
      { method: "DELETE", headers: authHeaders(token) },
    );
    expect(del.res.status).toBe(200);

    const afterInv = await jsonRequest<{ product: string }[]>(
      `/api/stores/${store.id}/inventory`,
      { headers: authHeaders(token) },
    );
    expect(afterInv.res.status).toBe(200);
    expect(afterInv.json.some((i) => i.product === product.id)).toBe(false);

    const txs = await jsonRequest<
      { product: string; type: string; quantity: number; note: string }[]
    >(`/api/stores/${store.id}/inventory-transactions`, {
      headers: authHeaders(token),
    });
    expect(txs.res.status).toBe(200);
    const stockOut = txs.json.find(
      (tx) => tx.product === product.id && tx.type === "stock_out",
    );
    expect(stockOut).toBeTruthy();
    expect(stockOut?.quantity).toBe(25);
    expect(stockOut?.note).toBe("ลบสินค้า");
  });
});
