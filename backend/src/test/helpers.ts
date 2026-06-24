import { authHeaders, jsonRequest } from "./setup";

let userCounter = 0;

export async function registerUser(
  overrides: Partial<{ email: string; password: string; name: string }> = {},
) {
  userCounter += 1;
  const email = overrides.email ?? `user${userCounter}@test.com`;
  const password = overrides.password ?? "password123";
  const name = overrides.name ?? `User ${userCounter}`;

  const { res, json } = await jsonRequest<{
    token: string;
    user: { id: string; email: string; name: string };
  }>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (res.status !== 200) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(json)}`);
  }

  return { token: json.token, user: json.user, email, password };
}

export async function createStore(
  token: string,
  overrides: Partial<{ name: string; slug: string }> = {},
) {
  userCounter += 1;
  const name = overrides.name ?? `Store ${userCounter}`;
  const slug = overrides.slug ?? `store-${userCounter}`;

  const { res, json } = await jsonRequest<{ id: string; name: string; slug: string }>(
    "/api/stores",
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name, slug }),
    },
  );

  if (res.status !== 201) {
    throw new Error(`createStore failed: ${res.status} ${JSON.stringify(json)}`);
  }

  return json;
}

export async function createCategory(token: string, storeId: string, name = "General") {
  const { res, json } = await jsonRequest<{ id: string }>(
    `/api/stores/${storeId}/categories`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name, sort_order: 0, is_active: true }),
    },
  );
  if (res.status !== 201) {
    throw new Error(`createCategory failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

export async function createProduct(
  token: string,
  storeId: string,
  categoryId: string,
  overrides: Partial<{ name: string; price: number; sku: string }> = {},
) {
  userCounter += 1;
  const { res, json } = await jsonRequest<{ id: string; name: string; price: number }>(
    `/api/stores/${storeId}/products`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        name: overrides.name ?? `Product ${userCounter}`,
        price: overrides.price ?? 100,
        sku: overrides.sku ?? `SKU-${userCounter}`,
        category: categoryId,
        is_active: true,
        track_inventory: false,
      }),
    },
  );
  if (res.status !== 201) {
    throw new Error(`createProduct failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}
