import { test, expect } from "@playwright/test";
import { E2E_USER, seedE2EData } from "../helpers/seed";

let productId = "";

test.beforeAll(async () => {
  const seed = await seedE2EData();
  productId = seed.productId;
});

async function loginAndOpenPos(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('[data-testid="email"]', E2E_USER.email);
  await page.fill('[data-testid="password"]', E2E_USER.password);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL(/\/(stores)?$/);
  await page.goto("/");
  await page.goto("/pos");
  await expect(page.locator(`[data-testid="product-card-${productId}"]`)).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("POS cash checkout", () => {
  test("login, add product, pay cash, see success modal", async ({ page }) => {
    await loginAndOpenPos(page);

    await page.click(`[data-testid="product-card-${productId}"]`);
    await expect(page.locator('[data-testid="cart-total"]')).toContainText("100");

    await page.fill('[data-testid="payment-received"]', "200");
    await page.click('[data-testid="checkout-btn"]');

    await expect(page.locator('[data-testid="success-modal"]')).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("offline order sync", () => {
  test("offline checkout then sync on reconnect", async ({ page, context }) => {
    await loginAndOpenPos(page);

    await page.click(`[data-testid="product-card-${productId}"]`);
    await page.fill('[data-testid="payment-received"]', "200");

    await context.setOffline(true);
    await page.waitForFunction(() => !navigator.onLine);
    await page.click('[data-testid="checkout-btn"]');
    await expect(page.locator('[data-testid="success-modal"]')).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('[data-testid="success-modal"] button').last().click();

    await page.goto("/");
    await expect(page.locator('[data-testid="sync-pending-count"]')).toHaveClass(
      /text-warning/,
      { timeout: 15_000 },
    );

    await context.setOffline(false);
    await page.waitForFunction(() => navigator.onLine);
    await expect(page.locator('[data-testid="sync-pending-count"]')).toHaveClass(
      /text-success/,
      { timeout: 30_000 },
    );
  });
});
