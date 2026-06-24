const API_BASE = process.env.E2E_API_URL ?? "http://localhost:3001";

export const E2E_USER = {
  email: "e2e@test.com",
  password: "password123",
  name: "E2E User",
};

export interface E2ESeedResult {
  token: string;
  storeId: string;
  productId: string;
}

async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; json: T }> {
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as T) : ({} as T);
  return { status: res.status, json };
}

export async function seedE2EData(): Promise<E2ESeedResult> {
  let token = "";

  const register = await apiJson<{ token: string; message?: string }>(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(E2E_USER),
    },
  );

  if (register.status === 200 && register.json.token) {
    token = register.json.token;
  } else {
    const login = await apiJson<{ token: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: E2E_USER.email,
        password: E2E_USER.password,
      }),
    });
    if (login.status !== 200) {
      throw new Error(`E2E login failed: ${login.status}`);
    }
    token = login.json.token;
  }

  const auth = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  type Membership = { store: string; expand?: { store?: { id: string } } };
  const memberships = await apiJson<Membership[]>(
    "/api/stores/memberships",
    { headers: auth },
  );

  let storeId =
    memberships.json[0]?.expand?.store?.id ?? memberships.json[0]?.store;

  if (!storeId) {
    const store = await apiJson<{ id: string }>("/api/stores", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "E2E Store", slug: "e2e-store" }),
    });
    if (store.status !== 201) {
      throw new Error(`E2E create store failed: ${store.status}`);
    }
    storeId = store.json.id;
  }

  const sync = await apiJson<{ products: { id: string; name: string }[] }>(
    `/api/stores/${storeId}/sync?since=1970-01-01T00:00:00.000Z`,
    { headers: auth },
  );

  const existing = sync.json.products?.find((p) => p.name === "E2E Coffee");
  if (existing) {
    return { token, storeId, productId: existing.id };
  }

  const category = await apiJson<{ id: string }>(
    `/api/stores/${storeId}/categories`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "E2E Category", sort_order: 0, is_active: true }),
    },
  );
  if (category.status !== 201) {
    throw new Error(`E2E create category failed: ${category.status}`);
  }

  const product = await apiJson<{ id: string }>(
    `/api/stores/${storeId}/products`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "E2E Coffee",
        price: 100,
        sku: `E2E-${Date.now()}`,
        category: category.json.id,
        is_active: true,
        track_inventory: false,
      }),
    },
  );
  if (product.status !== 201) {
    throw new Error(`E2E create product failed: ${product.status}`);
  }

  return { token, storeId, productId: product.json.id };
}
