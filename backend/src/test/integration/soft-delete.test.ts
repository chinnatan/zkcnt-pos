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
});
