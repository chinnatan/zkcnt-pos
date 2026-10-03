import { test, expect, type Page } from "@playwright/test";
import { E2E_USER, seedE2EData } from "../helpers/seed";

const API_BASE = process.env.E2E_API_URL ?? "http://localhost:3001";

let token = "";
let storeId = "";
const stamp = Date.now();

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

test.beforeAll(async () => {
  const seed = await seedE2EData();
  token = seed.token;
  storeId = seed.storeId;
  // two tracked products with stock so a new booth is seeded with them
  for (const [i, qty] of [[1, 12], [2, 8]] as const) {
    const p = await api<{ id: string }>(`/api/stores/${storeId}/products`, {
      method: "POST",
      body: JSON.stringify({
        name: `UX Stock ${stamp}-${i}`,
        price: 50,
        cost: 10,
        sku: `UX-${stamp}-${i}`,
        track_inventory: true,
        is_active: true,
      }),
    });
    await api(`/api/stores/${storeId}/inventory-transactions`, {
      method: "POST",
      body: JSON.stringify({ product: p.id, type: "stock_in", quantity: qty, before_qty: 0, after_qty: qty }),
    });
  }
});

async function loginAndOpenBooths(page: Page) {
  await page.goto("/login");
  await page.fill('[data-testid="email"]', E2E_USER.email);
  await page.fill('[data-testid="password"]', E2E_USER.password);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL(/\/(stores)?$/);
  await page.goto("/");
  await page.getByRole("link", { name: /บูธ|Booths/ }).first().click();
  await expect(page.locator('[data-testid="booth-new-btn"]')).toBeVisible({ timeout: 30_000 });
}

async function pickRange(page: Page, fromIdx: number, toIdx: number) {
  await page.click('[data-testid="date-range-trigger"]');
  const ym = new Date().toISOString().slice(0, 7);
  const days = page.locator(`[data-testid="date-range-popover"] button[data-day^="${ym}"]`);
  await days.nth(fromIdx).click();
  await days.nth(toIdx).click();
  await page.keyboard.press("Escape");
}

test.describe("booth management UX", () => {
  test("create from the modal, edit with the unsaved bar, duplicate, close with preview, reopen", async ({ page }) => {
    await loginAndOpenBooths(page);
    await expect(page.locator('[data-testid="booth-calendar"]')).toBeVisible({ timeout: 30_000 });

    // create via modal with a date range picked on the picker
    await page.click('[data-testid="booth-new-btn"]');
    await page.fill('[data-testid="booth-create-name"]', `UX Fair ${stamp}`);
    await pickRange(page, 9, 10);
    await page.click('[data-testid="booth-create-submit"]');
    await expect(page.locator('[data-testid="booth-detail"]')).toBeVisible({ timeout: 15_000 });

    // unsaved bar appears on edit, disappears after saving
    await expect(page.locator('[data-testid="booth-dirty-bar"]')).toHaveCount(0);
    await page.fill('[data-testid="booth-info-name"]', `UX Fair ${stamp} edited`);
    await expect(page.locator('[data-testid="booth-dirty-bar"]')).toBeVisible();
    await page.click('[data-testid="booth-save"]');
    await expect(page.locator('[data-testid="booth-saved"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="booth-dirty-bar"]')).toHaveCount(0);

    // seeded products are on the products tab; summary reacts to the fee
    await page.click('[data-testid="booth-tab-products"]');
    const checked = page.locator('[data-testid^="booth-product-"] input[type=checkbox]:checked');
    await expect.poll(async () => checked.count()).toBeGreaterThanOrEqual(2);
    const seeded = await checked.count();
    await page.click('[data-testid="booth-filter-selected"]');
    await expect(page.locator('[data-testid^="booth-product-"]:visible')).toHaveCount(seeded);
    await page.click('[data-testid="booth-tab-costs"]');
    await page.fill('[data-testid="booth-fee"]', "1000");
    await expect(page.locator('[data-testid="booth-cost-per-piece"]')).not.toHaveText(/^0/);
    await page.click('[data-testid="booth-save"]');
    await expect(page.locator('[data-testid="booth-saved"]')).toBeVisible({ timeout: 10_000 });

    // duplicate keeps the product list
    await page.click('[data-testid="booth-duplicate-btn"]');
    await expect(page.locator('[data-testid="booth-duplicate-modal"]')).toBeVisible();
    await page.fill('[data-testid="booth-duplicate-name"]', `UX Copy ${stamp}`);
    await pickRange(page, 14, 15);
    await page.click('[data-testid="booth-duplicate-submit"]');
    await expect(page.locator('[data-testid="booth-detail"]')).toBeVisible({ timeout: 15_000 });
    await page.click('[data-testid="booth-tab-products"]');
    await expect.poll(async () => checked.count()).toBe(seeded);

    // close shows a preview and flips the buttons; reopen flips them back
    await page.click('[data-testid="booth-close-btn"]');
    await expect(page.locator('[data-testid="booth-close-preview"]')).toBeVisible();
    await page.click('[data-testid="booth-close-confirm"]');
    await expect(page.locator('[data-testid="booth-reopen-btn"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="booth-close-btn"]')).toHaveCount(0);
    await page.click('[data-testid="booth-reopen-btn"]');
    await page.click('[data-testid="dialog-confirm"]');
    await expect(page.locator('[data-testid="booth-close-btn"]')).toBeVisible({ timeout: 15_000 });
  });

  test("calendar prefs: week start and view survive a reload", async ({ page }) => {
    await loginAndOpenBooths(page);
    await expect(page.locator('[data-testid="week-start"]')).toBeVisible({ timeout: 30_000 });
    await page.selectOption('[data-testid="week-start"]', "1");
    await page.click('[data-testid="booth-view-list"]');
    await page.reload();
    await expect(page.locator('[data-testid="booth-new-btn"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid="booth-calendar"]')).toHaveCount(0);
    await page.click('[data-testid="booth-view-calendar"]');
    await expect(page.locator('[data-testid="week-start"]')).toHaveValue("1", { timeout: 30_000 });
  });
});
