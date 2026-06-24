# คู่มือการทดสอบ zKCNT POS

เอกสารนี้อธิบายประเภทการทดสอบที่มีในโปรเจกต์ วิธีรัน และแนวทางเขียน test ใหม่

## คำสั่งรัน test

| คำสั่ง | ที่รัน | ทำอะไร |
|--------|--------|--------|
| `task test` | root | รัน backend + frontend tests |
| `task test:backend` | root | Bun test ฝั่ง API |
| `task test:frontend` | root | Vitest (unit + integration + component) |
| `task test:e2e` | root | build + Playwright E2E |
| `cd backend && bun test` | backend | unit + integration ทั้งหมด |
| `cd backend && bun test src/test/integration` | backend | integration เฉพาะ |
| `cd frontend && bun run test` | frontend | Vitest ครั้งเดียว |
| `cd frontend && bun run test:watch` | frontend | Vitest watch mode |
| `cd frontend && bun run build && bun run test:e2e` | frontend | E2E (ต้อง build ก่อน) |
| `cd backend && bun run typecheck` | backend | TypeScript check |
| `cd frontend && bun run typecheck` | frontend | Nuxt typecheck |

## โครงสร้างไฟล์ test

```
backend/
├── bunfig.toml                    # preload test DB
├── src/
│   ├── app.ts                     # createApp() สำหรับ integration test
│   ├── test/
│   │   ├── preload.ts             # ตั้ง DATA_DIR + migrate ก่อนรัน test
│   │   ├── setup.ts               # jsonRequest(), authHeaders()
│   │   ├── helpers.ts             # registerUser, createStore, seed catalog
│   │   └── integration/           # API integration tests
│   └── lib/promotions/
│       ├── engine.test.ts         # unit tests
│       └── contract.test.ts       # shared fixtures กับ frontend

frontend/
├── vitest.config.ts
├── playwright.config.ts
├── tests/
│   ├── setup.ts                   # fake-indexeddb + reset Dexie
│   ├── unit/
│   ├── integration/
│   └── components/
└── e2e/
    ├── helpers/seed.ts
    └── specs/pos-checkout.spec.ts

shared/test-fixtures/
└── promotions.json                # fixtures ร่วม FE/BE
```

---

## 1. Unit Test

**ใช้เมื่อ:** ทดสอบ pure function ไม่พึ่ง HTTP, DB จริง, หรือ browser

**Backend (Bun test):**

```bash
cd backend
bun test src/lib/promotions/engine.test.ts
```

**Frontend (Vitest):**

```bash
cd frontend
bun run test tests/unit
```

**Shared fixtures:** แก้ `shared/test-fixtures/promotions.json` แล้วรัน test ทั้ง backend (`contract.test.ts`) และ frontend (`engine.test.ts`) เพื่อป้องกัน promotion engine drift

---

## 2. Backend API Integration Test

**ใช้เมื่อ:** ทดสอบ HTTP route + middleware + SQLite จริง

Test ใช้ `createApp()` จาก [backend/src/app.ts](../backend/src/app.ts) ผ่าน preload ที่ [backend/src/test/preload.ts](../backend/src/test/preload.ts) ซึ่งสร้าง DB ชั่วคราวที่ `backend/.test-run/`

**ตัวอย่าง:**

```typescript
import { describe, expect, test } from "bun:test";
import { jsonRequest, authHeaders } from "../setup";
import { registerUser, createStore } from "../helpers";

test("non-member gets 403", async () => {
  const owner = await registerUser();
  const outsider = await registerUser();
  const store = await createStore(owner.token);

  const { res } = await jsonRequest(`/api/stores/${store.id}/orders`, {
    headers: authHeaders(outsider.token),
  });
  expect(res.status).toBe(403);
});
```

**สถานการณ์ที่ครอบคลุมแล้ว:**
- `GET /api/health`
- Auth guard (`/api/auth/me`)
- Tenant RBAC (403 ข้าม store)
- Sync delta contract
- Migration สร้าง table `promotions`

---

## 3. Frontend Integration Test (Dexie + Sync)

**ใช้เมื่อ:** ทดสอบ offline-first logic โดยไม่เปิด browser

ใช้ `fake-indexeddb` + mock `ApiClient`:

```bash
cd frontend
bun run test tests/integration
```

**ครอบคลุมแล้ว:**
- `temp_` order ID remap หลัง `drainSyncQueue`
- remap `order_items.order` เมื่อ order ยังเป็น temp ID

---

## 4. Component Test (Vue)

**ใช้เมื่อ:** ทดสอบ UI logic ของ component

ใช้ `@nuxt/test-utils` + environment `nuxt`:

```bash
cd frontend
bun run test tests/components
```

**CartPanel** ทดสอบ checkout gating (ปุ่ม disabled เมื่อจ่ายเงินไม่พอ, แสดงยอดรวม)

**data-testid สำคัญ:**
- `checkout-btn`, `cart-total`, `payment-received`
- `product-card-{id}`, `success-modal`, `sync-pending-count`
- `email`, `password`, `login-btn`

---

## 5. E2E Test (Playwright)

**ใช้เมื่อ:** ทดสอบ user journey จริงใน browser

```bash
cd frontend
bun run build          # จำเป็น — ใช้ preview ไม่ใช่ dev server
bun run test:e2e
```

Playwright จะ start backend (`DATA_DIR=./data-e2e`) และ `nuxt preview` อัตโนมัติ

**Flow ที่ครอบคลุม:**
1. Login → POS → cash checkout → success modal
2. Offline checkout → dashboard แสดง pending sync → reconnect → synced

**ข้อควรระวัง:**
- ใช้ `nuxt preview` (production build) ไม่ใช่ `nuxt dev` เพื่อหลีกเลี่ยง Workbox cache ใน dev
- assert ด้วย CSS class (`text-warning` / `text-success`) แทนข้อความ i18n
- `useOnlineStatus().setup()` ถูกเรียกใน plugin เพื่อให้ offline mode ทำงาน

---

## 6. Static Analysis

```bash
cd backend && bun run typecheck
cd frontend && bun run typecheck
cd frontend && bun run build
```

CI รัน typecheck/build + tests อัตโนมัติผ่าน [.github/workflows/ci.yml](../.github/workflows/ci.yml)

---

## 7. Manual Testing Checklist

```bash
task local       # dev ประจำวัน
task db-admin    # ดู SQLite ที่ localhost:8080
```

**POS Checkout:**
- [ ] Login → เลือก store → POS
- [ ] เพิ่มสินค้า → ยอดรวมถูกต้อง
- [ ] โปรโมชัน / coupon
- [ ] จ่ายเงินสด → receipt
- [ ] stock ไม่พอ → block checkout

**Offline:**
- [ ] DevTools → Offline → สร้าง order
- [ ] Dashboard แสดง pending sync
- [ ] กลับ online → sync สำเร็จ

**RBAC:**
- [ ] Cashier void ไม่ได้ / Manager void ได้

---

## Debug เมื่อ test ล้มเหลว

| ปัญหา | วิธีแก้ |
|-------|--------|
| SQLite I/O error ใน backend test | อย่า import `db/client` ก่อน preload; ใช้ `bun test` ผ่าน `bunfig.toml` |
| Frontend component test ไม่มี vueApp | ตั้ง `environment: "nuxt"` ใน vitest.config |
| E2E product ไม่โผล่ | visit `/` ก่อน `/pos` เพื่อ trigger sync |
| E2E offline ไม่ทำงาน | ตรวจว่า `useOnlineStatus().setup()` ถูกเรียก |
| Promotion FE/BE ไม่ตรง | รัน shared fixtures ทั้งสองฝั่ง |

---

## เพิ่ม test ใหม่

1. **Unit** — วาง `*.test.ts` ข้าง source หรือใน `frontend/tests/unit/`
2. **API integration** — เพิ่มใน `backend/src/test/integration/` ใช้ helpers จาก `helpers.ts`
3. **Sync integration** — mock `ApiClient` ใน `frontend/tests/integration/`
4. **Component** — `frontend/tests/components/` + `data-testid`
5. **E2E** — เพิ่ม spec ใน `frontend/e2e/specs/`
