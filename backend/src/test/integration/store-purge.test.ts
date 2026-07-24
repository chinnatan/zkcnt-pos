import { describe, expect, test } from "bun:test";
import { authHeaders, jsonRequest } from "../setup";
import {
  createCategory,
  createProduct,
  createStore,
  registerUser,
} from "../helpers";

async function addMemberByEmail(
  ownerToken: string,
  storeId: string,
  email: string,
  role: "manager" | "cashier",
) {
  const { res } = await jsonRequest("/api/members/add-by-email", {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ storeId, email, role }),
  });
  expect(res.status).toBe(200);
}

async function createCompletedOrder(
  token: string,
  storeId: string,
  product: { id: string; name: string },
  orderNumber: string,
) {
  const payload = {
    order: {
      client_id: `client-${orderNumber}`,
      order_number: orderNumber,
      subtotal: 100,
      discount_amount: 0,
      discount_type: "",
      tax_amount: 0,
      total: 100,
      payment_method: "cash",
      payment_received: 100,
      change_amount: 0,
      status: "completed",
      applied_promotions: [],
    },
    items: [
      {
        product: product.id,
        product_name: product.name,
        product_price: 100,
        quantity: 1,
        unit_price: 100,
        discount: 0,
        total: 100,
      },
    ],
  };

  const { res } = await jsonRequest(`/api/stores/${storeId}/orders`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  expect(res.status).toBe(201);
}

describe("clear transaction history", () => {
  test("owner can purge sales history and keeps inventory quantity", async () => {
    const owner = await registerUser({ email: "owner-purge@test.com" });
    const store = await createStore(owner.token, { slug: "purge-store" });
    const category = await createCategory(owner.token, store.id);
    const product = await createProduct(owner.token, store.id, category.id, {
      name: "Tracked",
      price: 100,
      track_inventory: true,
    });

    await jsonRequest(`/api/stores/${store.id}/inventory`, {
      method: "POST",
      headers: authHeaders(owner.token),
      body: JSON.stringify({
        product: product.id,
        quantity: 42,
        low_stock_threshold: 5,
      }),
    });

    await createCompletedOrder(owner.token, store.id, product, "ORD-PURGE-001");

    const beforeInv = await jsonRequest<Array<{ product: string; quantity: number }>>(
      `/api/stores/${store.id}/inventory`,
      { headers: authHeaders(owner.token) },
    );
    expect(beforeInv.res.status).toBe(200);
    const invRow = beforeInv.json.find((row) => row.product === product.id);
    expect(invRow?.quantity).toBe(41);

    const purge = await jsonRequest<{
      success: boolean;
      orders: number;
      transaction_history_cleared_at: string;
    }>(`/api/stores/${store.id}/actions/clear-transaction-history`, {
      method: "POST",
      headers: authHeaders(owner.token),
      body: JSON.stringify({ confirm_slug: "purge-store" }),
    });

    expect(purge.res.status).toBe(200);
    expect(purge.json.success).toBe(true);
    expect(purge.json.orders).toBe(1);
    expect(purge.json.transaction_history_cleared_at).toBeTruthy();

    const ordersList = await jsonRequest<{ totalItems: number }>(
      `/api/stores/${store.id}/orders`,
      { headers: authHeaders(owner.token) },
    );
    expect(ordersList.json.totalItems).toBe(0);

    const afterInv = await jsonRequest<Array<{ product: string; quantity: number }>>(
      `/api/stores/${store.id}/inventory`,
      { headers: authHeaders(owner.token) },
    );
    const invAfter = afterInv.json.find((row) => row.product === product.id);
    expect(invAfter?.quantity).toBe(41);

    const storeGet = await jsonRequest<{
      settings: { transaction_history_cleared_at?: string };
    }>(`/api/stores/${store.id}`, { headers: authHeaders(owner.token) });
    expect(storeGet.json.settings.transaction_history_cleared_at).toBe(
      purge.json.transaction_history_cleared_at,
    );
  });

  test("wrong slug returns 400", async () => {
    const owner = await registerUser({ email: "owner-purge-slug@test.com" });
    const store = await createStore(owner.token, { slug: "slug-store" });

    const { res } = await jsonRequest(
      `/api/stores/${store.id}/actions/clear-transaction-history`,
      {
        method: "POST",
        headers: authHeaders(owner.token),
        body: JSON.stringify({ confirm_slug: "wrong-slug" }),
      },
    );
    expect(res.status).toBe(400);
  });

  test("manager cannot clear history", async () => {
    const owner = await registerUser({ email: "owner-purge-mgr@test.com" });
    const manager = await registerUser({ email: "manager-purge@test.com" });
    const store = await createStore(owner.token, { slug: "mgr-purge-store" });
    await addMemberByEmail(owner.token, store.id, manager.email, "manager");

    const { res } = await jsonRequest(
      `/api/stores/${store.id}/actions/clear-transaction-history`,
      {
        method: "POST",
        headers: authHeaders(manager.token),
        body: JSON.stringify({ confirm_slug: "mgr-purge-store" }),
      },
    );
    expect(res.status).toBe(403);
  });
});
