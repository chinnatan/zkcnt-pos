import { test, expect } from "@playwright/test";
import {
  E2E_USER,
  addStoreMember,
  createCompletedOrder,
  registerExtraUser,
  seedE2EData,
} from "../helpers/seed";

const CASHIER = {
  email: "e2e-cashier@test.com",
  password: "password123",
};

let orderId = "";
let storeId = "";

test.beforeAll(async () => {
  const seed = await seedE2EData();
  storeId = seed.storeId;
  await registerExtraUser(CASHIER.email, CASHIER.password, "E2E Cashier");
  await addStoreMember(seed.token, storeId, CASHIER.email, "cashier");
  const order = await createCompletedOrder(seed.token, storeId, {
    id: seed.productId,
    name: "E2E Coffee",
    price: 100,
  });
  orderId = order.id;
});

async function loginAs(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL(/\/(stores)?$/);
}

test.describe("orders void RBAC", () => {
  test("cashier cannot void, manager can see void button", async ({ page }) => {
    await loginAs(page, CASHIER.email, CASHIER.password);
    await page.goto("/orders");
    await page.click(`[data-testid="view-order-${orderId}"]`);
    await expect(page.locator('[data-testid="order-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="void-order-btn"]')).toHaveCount(0);

    await page.goto("/login");
    await loginAs(page, E2E_USER.email, E2E_USER.password);
    await page.goto("/orders");
    await page.click(`[data-testid="view-order-${orderId}"]`);
    await expect(page.locator('[data-testid="void-order-btn"]')).toBeVisible();
  });
});
