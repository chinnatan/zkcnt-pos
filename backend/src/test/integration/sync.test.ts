import { describe, expect, test } from "bun:test";
import { jsonRequest, authHeaders } from "../setup";
import {
  createCategory,
  createProduct,
  createStore,
  registerUser,
} from "../helpers";

describe("GET /api/stores/:storeId/sync", () => {
  test("returns delta with required collections after seeding catalog", async () => {
    const { token } = await registerUser({ email: "sync-user@test.com" });
    const store = await createStore(token, { slug: "sync-store" });
    const category = await createCategory(token, store.id);
    await createProduct(token, store.id, category.id, { name: "Sync Product", price: 50 });

    const { res, json } = await jsonRequest<Record<string, unknown>>(
      `/api/stores/${store.id}/sync?since=1970-01-01T00:00:00.000Z`,
      { headers: authHeaders(token) },
    );

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("stores");
    expect(json).toHaveProperty("store_members");
    expect(json).toHaveProperty("categories");
    expect(json).toHaveProperty("products");
    expect(json).toHaveProperty("promotions");
    expect(json).toHaveProperty("promotion_usages");
    expect(json).toHaveProperty("orders");
    expect(json).toHaveProperty("order_items");

    const products = json.products as { name: string }[];
    expect(products.some((p) => p.name === "Sync Product")).toBe(true);
  });
});
