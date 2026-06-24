import { describe, expect, test } from "bun:test";
import { jsonRequest, authHeaders } from "../setup";
import { createStore, registerUser } from "../helpers";

describe("tenant RBAC", () => {
  test("non-member cannot access another store", async () => {
    const owner = await registerUser({ email: "owner-rbac@test.com" });
    const outsider = await registerUser({ email: "outsider-rbac@test.com" });
    const store = await createStore(owner.token, { slug: "rbac-store" });

    const { res } = await jsonRequest(`/api/stores/${store.id}/orders`, {
      headers: authHeaders(outsider.token),
    });

    expect(res.status).toBe(403);
  });

  test("member can access own store orders", async () => {
    const owner = await registerUser({ email: "owner-orders@test.com" });
    const store = await createStore(owner.token, { slug: "own-store" });

    const { res, json } = await jsonRequest<{ items: unknown[] }>(
      `/api/stores/${store.id}/orders`,
      { headers: authHeaders(owner.token) },
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(json.items)).toBe(true);
  });
});
