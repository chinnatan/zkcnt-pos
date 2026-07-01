import { test, expect } from "@playwright/test";
import { E2E_USER, seedE2EData, setStorePromptPay } from "../helpers/seed";

let productId = "";

test.beforeAll(async () => {
  const seed = await seedE2EData();
  productId = seed.productId;
  await setStorePromptPay(seed.token, seed.storeId, "0812345678");
});

async function loginAndOpenPos(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('[data-testid="email"]', E2E_USER.email);
  await page.fill('[data-testid="password"]', E2E_USER.password);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL(/\/(stores)?$/);
  await page.goto("/pos");
  await expect(page.locator(`[data-testid="product-card-${productId}"]`)).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("POS QR payment", () => {
  test("shows QR modal when paying with PromptPay", async ({ page }) => {
    await loginAndOpenPos(page);
    await page.click(`[data-testid="product-card-${productId}"]`);
    await page.click('[data-testid="payment-method-qr"]');
    await page.click('[data-testid="checkout-btn"]');
    await expect(page.locator('[data-testid="qr-payment-modal"]')).toBeVisible({
      timeout: 15_000,
    });
  });
});
