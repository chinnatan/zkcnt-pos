# สินค้าขายแล้ววันนี้ X/Y — เปลี่ยนการ์ด "สินค้า" บนแดชบอร์ดเป็นสัดส่วนยอดขายวันนี้/สินค้ามีสต๊อก

Branch: `feat/dashboard-sold-today` (แตกจาก `develop` เมื่อ plan อนุมัติ)

## Business Goals

- การ์ด "สินค้า" บนแดชบอร์ดแสดง `X/Y` (เช่น `12/73`) โดย X = จำนวนสินค้าไม่ซ้ำที่ขายได้แล้ววันนี้จากออเดอร์สถานะ completed (รวมของแถมโปรโมชัน เพราะของแถมมี `quantity > 0` ใน `order_items` แม้ราคา 0) และ Y = จำนวนสินค้าที่มีสต๊อกขายได้ (ตัวอย่าง: ทั้งหมด 75, หมดสต๊อก 2 → 73)
- ตัวเลข Y ต้องกรอง `is_active` + ไม่ deleted (ของเดิม `db.products.count()` ไมได้กรอง)
- ทำงาน offline ได้ครบเพราะอ่านจาก Dexie อย่างเดียว — ไม่แตะ backend/schema/sync

## Phase 1: Dashboard stats — นับ X และ Y จาก Dexie

### Logic ใน `frontend/app/lib/dashboard.ts`

- [x] ขยาย `TodayStats` เพิ่ม `productsSoldToday` — รวบรวม id ของ completed orders วันนี้ (query เดียวกับที่นับยอดขายอยู่แล้ว) แล้วหา unique `product` จาก `db.orderItems.where("order").anyOf(orderIds)`
- [x] เพิ่ม `productsInStock` — นับ products ที่ `is_active` และ `deleted_at` ว่าง และ (`track_inventory = false` หรือ inventory `quantity > 0`)
- [x] อัปเดต `pages/index.vue` ให้ `loadDashboardData()` ใช้ค่าใหม่แทน `productCount` จาก `db.products.count()`

### เทสต์

- [x] เพิ่มเคสใน `frontend/tests/lib/dashboard.test.ts`: voided/refunded ไม่นับ, รายการของแถม (`unit_price = 0`, `free_quantity > 0`) นับเป็นสินค้าขายได้, product `track_inventory=false` นับใน Y, product `quantity=0` ไม่计入 Y

## Phase 2: UI + i18n

- [x] อ่าน `.cursor/rules/*.mdc` ก่อนแก้ template (ไม่พบไฟล์กฎใน repository)
- [x] การ์ด polaroid ใน `pages/index.vue` แสดง `{{ X }}/{{ Y }}` และ label ใหม่ "ขายแล้ววันนี้" (คง layout/variant เดิม ไม่เพิ่มการ์ดใหม่)
- [x] เพิ่ม key th/en ที่ `frontend/i18n/locales/` (`dashboard.soldToday`)

## Phase 3: Review & Quality Assurance

- [x] รัน `bun run typecheck` + vitest เฉพาะ scope ที่แก้ (`tests/lib/dashboard.test.ts`) ใน `frontend/` — Vitest ผ่าน 4/4 เมื่อเพิ่ม `--hookTimeout 30000`; typecheck ยังล้มจาก existing errors ใน `tests/integration/sync-engine.test.ts` (ไม่เกี่ยวกับ diff นี้)
- [ ] manual บน `task local`: ยืนยัน X/Y กับข้อมูลออเดอร์จริงวันนี้

ผลเพิ่มเติม: `git diff --check` ผ่าน; ยังไม่ได้รัน manual `task local` ในเซสชันนี้

## Appendix: ผลสำรวจ + ข้อสมมติที่ต้องอนุมัติ

| ประเด็น | ข้อเท็จจริง / ข้อเสนอ |
| --- | --- |
| ของแถมนับยังไง | `order_items` เก็บของแถมเป็นแถว `quantity > 0` (มี `promotion_id`/`free_quantity`) → การนับแบบ unique product id รวมของแถมอัตโนมัติ ไม่ต้องเดาจากราคา |
| untracked products | สินค้า `track_inventory=false` มักไม่มี inventory row — **เสนอว่านับเป็น "มีสต๊อก"** เพราะขายได้เสมอ (ถ้า user อยากนับเฉพาะที่มี inventory row > 0 บอกได้) |
| ขายแล้วสต๊อกหมดวันนี้ | สินค้านั้นหลุดจาก Y แต่ยังอยู่ใน X → อาจเห็นเช่น `3/72` — เสนอยอมรับ เพราะสื่อว่า "เพิ่งขายหมด" |
| คืนสินค้าทั้งใบ | order เป็น `refunded` →หลุด filter `completed` ทั้งใบ (X และยอดเงิน) สอดคล้อง behavior ยอดขายวันนี้ปัจจุบัน |
| สินค้าถูกลบแต่เคยขายวันนี้ | ยังนับใน X, ไม่มีใน Y — ขอบเขตเล็กมาก เสนอไม่จัดการ |
| `getTodayStats` ปัจจุบัน | filter ด้วย `o.created` ในกรอบวันตามเวลากรุงเทพฯ — ใช้ต่อไม่เปลี่ยน semantics |
| ไฟล์กระทบ | `frontend/app/lib/dashboard.ts`, `frontend/app/pages/index.vue`, `frontend/i18n/locales/{th,en}.json`, `frontend/tests/lib/dashboard.test.ts` |
| สิ่งที่ไม่แตะ | backend, Dexie schema/indexes, sync, migration |
