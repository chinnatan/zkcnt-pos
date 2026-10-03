import { test, expect } from "@playwright/test";
import { E2E_USER, seedE2EData } from "../helpers/seed";

const API_BASE = process.env.E2E_API_URL ?? "http://localhost:3001";

let token = "";
let storeId = "";
let boothId = "";
let boothProductId = "";
let otherProductId = "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

test.beforeAll(async () => {
  const seed = await seedE2EData();
  token = seed.token;
  storeId = seed.storeId;
  boothProductId = seed.productId; // "E2E Coffee"

  const other = await api<{ id: string }>(`/api/stores/${storeId}/products`, {
    method: "POST",
    body: JSON.stringify({
      name: `E2E Not In Booth ${Date.now()}`,
      price: 30,
      sku: `NIB-${Date.now()}`,
      is_active: true,
      track_inventory: false,
    }),
  });
  otherProductId = other.id;

  const booth = await api<{ id: string }>(`/api/stores/${storeId}/booths`, {
    method: "POST",
    body: JSON.stringify({ name: `E2E Booth ${Date.now()}`, booth_fee: 500 }),
  });
  boothId = booth.id;
  await api(`/api/stores/${storeId}/booth-products`, {
    method: "POST",
    body: JSON.stringify({ booth: boothId, product: boothProductId, qty_brought: 10 }),
  });
});

async function loginAndOpenPos(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('[data-testid="email"]', E2E_USER.email);
  await page.fill('[data-testid="password"]', E2E_USER.password);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL(/\/(stores)?$/);
  await page.goto("/");
  await page.goto("/pos");
  await expect(page.locator(`[data-testid="product-card-${boothProductId}"]`)).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("booth mode on POS", () => {
  test("selecting a booth filters products and tags the order", async ({ page }) => {
    await loginAndOpenPos(page);

    // no booth selected → unchanged behaviour: everything is sellable
    await expect(page.locator(`[data-testid="product-card-${otherProductId}"]`)).toBeVisible();

    await page.selectOption("#pos-booth", boothId);
    await expect(page.locator(`[data-testid="product-card-${otherProductId}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-testid="product-card-${boothProductId}"]`)).toBeVisible();

    await page.click(`[data-testid="product-card-${boothProductId}"]`);
    await page.fill('[data-testid="payment-received"]', "200");
    await page.click('[data-testid="checkout-btn"]');
    await expect(page.locator('[data-testid="success-modal"]')).toBeVisible({ timeout: 15_000 });

    // the order is tagged with the booth and shows up in the booth report filter
    await expect
      .poll(async () => {
        const since = encodeURIComponent("2000-01-01T00:00:00.000Z");
        const report = await api<{ summary: { totalSales: number } }>(
          `/api/stores/${storeId}/reports?since=${since}&period=custom&booth=${boothId}`,
        );
        return report.summary.totalSales;
      })
      .toBeGreaterThan(0);
  });

  test("selection survives a reload and can be cleared", async ({ page }) => {
    await loginAndOpenPos(page);
    await page.selectOption("#pos-booth", boothId);
    await page.reload();
    await expect(page.locator("#pos-booth")).toHaveValue(boothId, { timeout: 30_000 });

    await page.selectOption("#pos-booth", "");
    await expect(page.locator(`[data-testid="product-card-${otherProductId}"]`)).toBeVisible();
  });
});
