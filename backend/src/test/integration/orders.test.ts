import { describe, expect, test } from "bun:test";
import { authHeaders, jsonRequest } from "../setup";
import { createCategory, createProduct, createStore, registerUser } from "../helpers";

describe("order idempotency", () => {
  test("POST with same client_id returns existing order without duplicate", async () => {
    const owner = await registerUser({ email: "owner-idem@test.com" });
    const store = await createStore(owner.token, { slug: "idem-store" });
    const category = await createCategory(owner.token, store.id);
    const product = await createProduct(owner.token, store.id, category.id, {
      name: "Idem Product",
      price: 100,
    });

    const clientId = "offline-client-idem-001";
    const payload = {
      order: {
        client_id: clientId,
        order_number: "ORD-IDEM-001",
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

    const first = await jsonRequest<{ id: string; client_id: string }>(
      `/api/stores/${store.id}/orders`,
      {
        method: "POST",
        headers: authHeaders(owner.token),
        body: JSON.stringify(payload),
      },
    );
    expect(first.res.status).toBe(201);
    expect(first.json.client_id).toBe(clientId);

    const second = await jsonRequest<{ id: string; client_id: string }>(
      `/api/stores/${store.id}/orders`,
      {
        method: "POST",
        headers: authHeaders(owner.token),
        body: JSON.stringify(payload),
      },
    );
    expect(second.res.status).toBe(200);
    expect(second.json.id).toBe(first.json.id);
    expect(second.json.client_id).toBe(clientId);

    const list = await jsonRequest<{ items: Array<{ id: string }>; totalItems: number }>(
      `/api/stores/${store.id}/orders`,
      { headers: authHeaders(owner.token) },
    );
    expect(list.json.totalItems).toBe(1);
  });
});
