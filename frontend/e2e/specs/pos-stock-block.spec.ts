import { test, expect } from "@playwright/test";
import { E2E_USER, createOutOfStockProduct, seedE2EData } from "../helpers/seed";

const API_BASE = process.env.E2E_API_URL ?? "http://localhost:3001";

let outOfStockProductId = "";

test.beforeAll(async () => {
  const seed = await seedE2EData();
  const auth = { Authorization: `Bearer ${seed.token}` };
  const categories = await fetch(
    `${API_BASE}/api/stores/${seed.storeId}/categories`,
    { headers: auth },
  ).then((r) => r.json() as Promise<{ id: string }[]>);
  const categoryId = categories[0]?.id;
  if (!categoryId) throw new Error("No category for stock test");
  const product = await createOutOfStockProduct(seed.token, seed.storeId, categoryId);
  outOfStockProductId = product.id;
});

async function loginAndOpenPos(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('[data-testid="email"]', E2E_USER.email);
  await page.fill('[data-testid="password"]', E2E_USER.password);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL(/\/(stores)?$/);
  await page.goto("/pos");
}

test.describe("POS stock block", () => {
  test("blocks adding out-of-stock product", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    await loginAndOpenPos(page);
    await page.click(`[data-testid="product-card-${outOfStockProductId}"]`);
    await expect(page.locator('[data-testid="cart-total"]')).not.toBeVisible();
  });
});
