# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos-checkout.spec.ts >> offline order sync >> offline checkout then sync on reconnect
- Location: e2e/specs/pos-checkout.spec.ts:41:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - button "ไทย" [ref=e6]
    - button "EN" [ref=e7]
  - generic [ref=e8]:
    - generic [ref=e9]:
      - heading "zKCNT POS" [level=1] [ref=e10]
      - paragraph [ref=e11]: ระบบ POS ทำงานออฟไลน์ได้
    - generic [ref=e12]:
      - heading "เข้าสู่ระบบ" [level=2] [ref=e13]
      - generic [ref=e14]: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: อีเมล
          - textbox "you@example.com" [ref=e18]: e2e@test.com
        - generic [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]: รหัสผ่าน
            - link "ลืมรหัสผ่าน?" [ref=e22] [cursor=pointer]:
              - /url: /forgot-password
          - textbox "กรอกรหัสผ่าน" [ref=e23]: password123
        - button "เข้าสู่ระบบ" [ref=e24]
      - paragraph [ref=e25]:
        - text: ยังไม่มีบัญชี?
        - link "สร้างบัญชี" [ref=e26] [cursor=pointer]:
          - /url: /register
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { E2E_USER, seedE2EData } from "../helpers/seed";
  3  | 
  4  | let productId = "";
  5  | 
  6  | test.beforeAll(async () => {
  7  |   const seed = await seedE2EData();
  8  |   productId = seed.productId;
  9  | });
  10 | 
  11 | async function loginAndOpenPos(page: import("@playwright/test").Page) {
  12 |   await page.goto("/login");
  13 |   await page.fill('[data-testid="email"]', E2E_USER.email);
  14 |   await page.fill('[data-testid="password"]', E2E_USER.password);
  15 |   await page.click('[data-testid="login-btn"]');
> 16 |   await page.waitForURL(/\/(stores)?$/);
     |              ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  17 |   await page.goto("/");
  18 |   await page.goto("/pos");
  19 |   await expect(page.locator(`[data-testid="product-card-${productId}"]`)).toBeVisible({
  20 |     timeout: 30_000,
  21 |   });
  22 | }
  23 | 
  24 | test.describe("POS cash checkout", () => {
  25 |   test("login, add product, pay cash, see success modal", async ({ page }) => {
  26 |     await loginAndOpenPos(page);
  27 | 
  28 |     await page.click(`[data-testid="product-card-${productId}"]`);
  29 |     await expect(page.locator('[data-testid="cart-total"]')).toContainText("100");
  30 | 
  31 |     await page.fill('[data-testid="payment-received"]', "200");
  32 |     await page.click('[data-testid="checkout-btn"]');
  33 | 
  34 |     await expect(page.locator('[data-testid="success-modal"]')).toBeVisible({
  35 |       timeout: 15_000,
  36 |     });
  37 |   });
  38 | });
  39 | 
  40 | test.describe("offline order sync", () => {
  41 |   test("offline checkout then sync on reconnect", async ({ page, context }) => {
  42 |     await loginAndOpenPos(page);
  43 | 
  44 |     await page.click(`[data-testid="product-card-${productId}"]`);
  45 |     await page.fill('[data-testid="payment-received"]', "200");
  46 | 
  47 |     await context.setOffline(true);
  48 |     await page.waitForFunction(() => !navigator.onLine);
  49 |     await page.click('[data-testid="checkout-btn"]');
  50 |     await expect(page.locator('[data-testid="success-modal"]')).toBeVisible({
  51 |       timeout: 15_000,
  52 |     });
  53 | 
  54 |     await page.locator('[data-testid="success-modal"] button').last().click();
  55 | 
  56 |     await page.goto("/");
  57 |     await expect(page.locator('[data-testid="sync-pending-count"]')).toHaveClass(
  58 |       /text-warning/,
  59 |       { timeout: 15_000 },
  60 |     );
  61 | 
  62 |     await context.setOffline(false);
  63 |     await page.waitForFunction(() => navigator.onLine);
  64 |     await expect(page.locator('[data-testid="sync-pending-count"]')).toHaveClass(
  65 |       /text-success/,
  66 |       { timeout: 30_000 },
  67 |     );
  68 |   });
  69 | });
  70 | 
```