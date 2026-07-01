import { test, expect } from "@playwright/test";
import {
  E2E_USER,
  createOrderPercentPromotion,
  seedE2EData,
} from "../helpers/seed";

let productId = "";
let storeId = "";
let token = "";

test.beforeAll(async () => {
  const seed = await seedE2EData();
  productId = seed.productId;
  storeId = seed.storeId;
  token = seed.token;
  await createOrderPercentPromotion(token, storeId, 10);
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

test.describe("POS promotions checkout", () => {
  test("applies order percent promotion to cart total", async ({ page }) => {
    await loginAndOpenPos(page);
    await page.click(`[data-testid="product-card-${productId}"]`);
    await expect(page.locator('[data-testid="cart-total"]')).toContainText("90");
  });
});
