import { describe, expect, test } from "bun:test";
import { jsonRequest, authHeaders } from "../setup";
import { createCategory, createProduct, createStore, registerUser } from "../helpers";

const post = (token: string, path: string, body: unknown, method = "POST") =>
  jsonRequest<Record<string, unknown>>(path, {
    method,
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });

describe("booths", () => {
  test("create, add product, sync delta, soft delete", async () => {
    const { token } = await registerUser({ email: "booth1@test.com" });
    const store = await createStore(token, { slug: "booth1-store" });
    const category = await createCategory(token, store.id);
    const product = await createProduct(token, store.id, category.id);
    const base = `/api/stores/${store.id}`;

    const created = await post(token, `${base}/booths`, {
      name: "Book Fair",
      start_date: "2026-10-03",
      end_date: "2026-10-04",
      booth_fee: 1500,
      extra_costs: [{ name: "travel", amount: 300 }, { name: "", amount: 5 }],
    });
    expect(created.res.status).toBe(201);
    expect(created.json.booth_fee).toBe(1500);
    expect(created.json.extra_costs).toEqual([{ name: "travel", amount: 300 }]);
    const boothId = String(created.json.id);

    const bp = await post(token, `${base}/booth-products`, {
      booth: boothId,
      product: product.id,
      qty_brought: 20,
    });
    expect(bp.res.status).toBe(201);

    const delta = await jsonRequest<{ booths: unknown[]; booth_products: unknown[] }>(
      `${base}/sync`,
      { headers: authHeaders(token) },
    );
    expect(delta.json.booths.length).toBe(1);
    expect(delta.json.booth_products.length).toBe(1);

    // remove then re-add revives the same row
    await post(token, `${base}/booth-products/${bp.json.id}`, {}, "DELETE");
    const readded = await post(token, `${base}/booth-products`, {
      booth: boothId,
      product: product.id,
      qty_brought: 5,
    });
    expect(readded.json.id).toBe(bp.json.id);
    expect(readded.json.qty_brought).toBe(5);

    await post(token, `${base}/booths/${boothId}`, {}, "DELETE");
    const list = await jsonRequest<unknown[]>(`${base}/booths`, {
      headers: authHeaders(token),
    });
    expect(list.json.length).toBe(0);
  });

  test("order cannot reference a booth from another store", async () => {
    const a = await registerUser({ email: "booth2a@test.com" });
    const b = await registerUser({ email: "booth2b@test.com" });
    const storeA = await createStore(a.token, { slug: "booth2a-store" });
    const storeB = await createStore(b.token, { slug: "booth2b-store" });
    const booth = await post(b.token, `/api/stores/${storeB.id}/booths`, { name: "B" });

    const res = await post(a.token, `/api/stores/${storeA.id}/orders`, {
      order: { booth: booth.json.id, total: 0, payment_method: "cash" },
      items: [],
    });
    expect(res.res.status).toBe(400);
  });

  test("order with own-store booth is tagged and returned in sync delta", async () => {
    const { token } = await registerUser({ email: "booth3@test.com" });
    const store = await createStore(token, { slug: "booth3-store" });
    const base = `/api/stores/${store.id}`;
    const booth = await post(token, `${base}/booths`, { name: "Fair" });

    const res = await post(token, `${base}/orders`, {
      order: { booth: booth.json.id, total: 0, payment_method: "cash" },
      items: [],
    });
    expect(res.res.status).toBe(201);
    expect(res.json.booth).toBe(booth.json.id);

    const delta = await jsonRequest<{ orders: Array<{ booth: string }> }>(`${base}/sync`, {
      headers: authHeaders(token),
    });
    expect(delta.json.orders[0]?.booth).toBe(String(booth.json.id));
  });
});

describe("reports booth filter", () => {
  test("filters period orders by booth / none / all", async () => {
    const { token } = await registerUser({ email: "booth4@test.com" });
    const store = await createStore(token, { slug: "booth4-store" });
    const base = `/api/stores/${store.id}`;
    const booth = await post(token, `${base}/booths`, { name: "Fair" });

    const make = (extra: Record<string, unknown>, total: number) =>
      post(token, `${base}/orders`, {
        order: { total, subtotal: total, payment_method: "cash", ...extra },
        items: [],
      });
    await make({ booth: booth.json.id }, 100);
    await make({}, 40);

    const since = encodeURIComponent("2000-01-01T00:00:00.000Z");
    const sales = async (q: string) =>
      (
        await jsonRequest<{ summary: { totalSales: number } }>(
          `${base}/reports?since=${since}&period=custom${q}`,
          { headers: authHeaders(token) },
        )
      ).json.summary.totalSales;

    expect(await sales("")).toBe(140);
    expect(await sales(`&booth=${booth.json.id}`)).toBe(100);
    expect(await sales("&booth=none")).toBe(40);
  });
});

describe("booth permissions", () => {
  test("cashier can read booths but not create or edit them", async () => {
    const owner = await registerUser({ email: "booth5-owner@test.com" });
    const cashier = await registerUser({ email: "booth5-cashier@test.com" });
    const store = await createStore(owner.token, { slug: "booth5-store" });
    const base = `/api/stores/${store.id}`;

    const added = await jsonRequest("/api/members/add-by-email", {
      method: "POST",
      headers: authHeaders(owner.token),
      body: JSON.stringify({ storeId: store.id, email: cashier.email, role: "cashier" }),
    });
    expect(added.res.status).toBe(200);

    const booth = await post(owner.token, `${base}/booths`, { name: "Fair" });
    expect(booth.res.status).toBe(201);

    const list = await jsonRequest<unknown[]>(`${base}/booths`, {
      headers: authHeaders(cashier.token),
    });
    expect(list.res.status).toBe(200);
    expect(list.json.length).toBe(1);

    expect((await post(cashier.token, `${base}/booths`, { name: "Nope" })).res.status).toBe(403);
    expect(
      (await post(cashier.token, `${base}/booths/${booth.json.id}`, { name: "x" }, "PATCH")).res.status,
    ).toBe(403);
    expect(
      (await post(cashier.token, `${base}/booths/${booth.json.id}`, {}, "DELETE")).res.status,
    ).toBe(403);
  });
});
