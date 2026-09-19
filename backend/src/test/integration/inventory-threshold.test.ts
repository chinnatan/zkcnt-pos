import { describe, expect, test } from "bun:test";
import { jsonRequest, authHeaders } from "../setup";
import {
  createCategory,
  createProduct,
  createStore,
  registerUser,
} from "../helpers";

async function postTx(
  token: string,
  storeId: string,
  body: Record<string, unknown>,
) {
  return jsonRequest(`/api/stores/${storeId}/inventory-transactions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

describe("inventory low_stock_threshold via transactions", () => {
  test("stock_in creates row with threshold; later tx without threshold keeps it", async () => {
    const { token } = await registerUser({ email: "thr1@test.com" });
    const store = await createStore(token, { slug: "thr1-store" });
    const category = await createCategory(token, store.id);
    const product = await createProduct(token, store.id, category.id, {
      name: "Threshold Item",
    });

    const created = await postTx(token, store.id, {
      product: product.id,
      type: "stock_in",
      quantity: 10,
      before_qty: 0,
      after_qty: 10,
      low_stock_threshold: 3,
    });
    expect(created.res.status).toBe(201);

    const list = async () =>
      (
        await jsonRequest<
          { product: string; quantity: number; low_stock_threshold: number }[]
        >(`/api/stores/${store.id}/inventory`, { headers: authHeaders(token) })
      ).json.find((i) => i.product === product.id);

    expect((await list())?.low_stock_threshold).toBe(3);

    await postTx(token, store.id, {
      product: product.id,
      type: "stock_in",
      quantity: 5,
      before_qty: 10,
      after_qty: 15,
    });
    const kept = await list();
    expect(kept?.quantity).toBe(15);
    expect(kept?.low_stock_threshold).toBe(3);

    const updated = await postTx(token, store.id, {
      product: product.id,
      type: "stock_in",
      quantity: 0,
      before_qty: 15,
      after_qty: 15,
      low_stock_threshold: 7,
    });
    expect(updated.res.status).toBe(201);
    expect((await list())?.low_stock_threshold).toBe(7);
  });

  test("tx without threshold creates row with default 0", async () => {
    const { token } = await registerUser({ email: "thr2@test.com" });
    const store = await createStore(token, { slug: "thr2-store" });
    const category = await createCategory(token, store.id);
    const product = await createProduct(token, store.id, category.id, {
      name: "Default Item",
    });

    await postTx(token, store.id, {
      product: product.id,
      type: "stock_in",
      quantity: 4,
      before_qty: 0,
      after_qty: 4,
    });

    const rows = await jsonRequest<
      { product: string; low_stock_threshold: number }[]
    >(`/api/stores/${store.id}/inventory`, { headers: authHeaders(token) });
    expect(
      rows.json.find((i) => i.product === product.id)?.low_stock_threshold,
    ).toBe(0);
  });
});
