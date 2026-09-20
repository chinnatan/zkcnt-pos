# Filter หมวดหมู่ตามลำดับ + ยอดขายดีในหน้า POS — frontend ล้วน ไม่แตะ schema/sync/API

Branch: `feat/pos-category-bestseller-filter` (แตกจาก `develop`) — สถานะ: implement แล้ว

## Business Goals
- หมวดย่อยในหน้า POS เรียงตรงตามที่กำหนด `sort_order` ตอนสร้างหมวด (ตอนนี้ API เรียงให้แต่ Dexie อ่านดิบ → สลับที่ตอน offline/sync)
- เลือกดูสินค้า "ขายดี" ในหน้า POS ได้ จากยอดจำนวนชิ้นที่ขายแล้ว (orders สถานะ completed)

## ข้อขัดกับกฎ repo
ไม่มี — ไม่แตะ Drizzle/SQL migration/Dexie schema/sync (`sort_order` เป็น Dexie index อยู่แล้ว, `orders`+`order_items` sync ลง Dexie แล้ว)

## Phase 1: เรียงหมวดหมู่ POS ตาม sort_order
### useProducts
- [x] ใน `fetchCategories` (`frontend/app/composables/useProducts.ts:163-186`) sort result ด้วย `sort_order` แล้วด้วย `name` ASC — ครอบทั้ง online path (กัน API/sync ไม่ได้เรียง) และ Dexie fallback path ในที่เดียว
- [x] ตรวจ `products/index.vue` ที่เรียก `fetchCategories` ด้วยว่า sorted array ไม่กระทบ UI เดิม (back-end เรียงอยู่แล้ว → display ไม่มีผล)

## Phase 2: filter/sort "ยอดขายดี"
### lib
- [x] เพิ่ม helper สร้าง `Map<productId, qty>` จาก `db.orders` (completed, filter ด้วย store) + `db.orderItems` ใน `frontend/app/lib/pos/productSales.ts` — pattern เดียวกับ `useReports.ts:81-83` / `buildProductAgg` ใน `lib/reports/aggregate.ts:184-213` แต่ return แค่ qty map เบากว่า
### sort option
- [x] เพิ่ม `"bestSelling"` ใน `POS_PRODUCT_SORT_OPTIONS` + case ใน `comparePosProducts` (`frontend/app/lib/pos/productSort.ts`) — qty DESC, เสมอกันเรียง name ASC; ท้ายสุด tie → default เดิม (prefs whitelist ผ่าน options list อัตโนมัติ ไม่ต้องแก้ `usePosProductListPrefs.ts`)
- [x] ผูก qty map เข้ากับ `filteredProducts`/`sortPosProducts` ใน `pos.vue:364-390` (โหลดต่อ store และ refresh หลัง checkout)
### UI
- [x] เพิ่ม `<option>` ยอดขายดีใน sort dropdown (`pos.vue:35-46`) + key `pos.sortBestSelling` ใน `frontend/i18n/locales/th.json` ("ขายดี") และ `en.json` ("Best selling")

## Phase 3: Review & Quality Assurance
- [x] เพิ่ม test ใน `frontend/tests/lib/productSort.test.ts` และ `frontend/tests/lib/productSales.test.ts`: bestSelling qty DESC + tie name ASC + missing product = qty 0; qty map ข้าม order ที่ไม่ใช่ completed
- [x] รัน `bun run typecheck` (frontend) + `bun run test tests/lib` ตาม scope — tests ผ่าน 6 ไฟล์/21 tests; typecheck ยัง fail จาก baseline เดิมที่ `admin/stores/[id].vue` และ `tests/integration/sync-engine.test.ts` ไม่มี error ใหม่จากฟีเจอร์นี้
- [ ] manual บน `task local`: หมวด pill เรียงตาม sort_order ทั้ง online/offline, เลือก sort ขายดีแล้วลำดับตรงตามยอดจริง, ค่า sort ค้างอยู่ใน localStorage หลัง reload

## ผลการตัดสินใจ
อนุมัติ **A** — "ขายดี" เป็นตัวเลือกใน sort dropdown (qty DESC จาก completed orders ตลอดเวลา) ไม่ทำ pill top-N

## Appendix: สิ่งที่สำรวจแล้ว
| ประเด็น | ข้อเท็จจริงในโค้ด |
| --- | --- |
| ลำดับหมวด | `categories.sort_order` ครบทั้ง stack: schema `backend/src/db/schema.ts:119`, SQL `migrations/0001_init.sql:68`, Dexie index `frontend/app/lib/db.ts:43`, type `lib/types/index.ts:79` — API ก็ orderBy ให้แล้ว (`catalog.ts:60`) จุดหายอยู่ฝั่ง client pos.vue:66 ที่ render ตาม array ดิบ |
| ยอดขาย client-side | `orders`+`orderItems` sync ลง Dexie (`sync/engine.ts:180-190`) และ offline checkout เขียนลงเอง (`useOrders.ts:171-200`) → คำนวณ offline ได้; reports ทำ aggregation แบบเดียวกันอยู่แล้ว 2 ที่ (backend `lib/reports.ts:50-79`, frontend `lib/reports/aggregate.ts:184-213`) |
| ข้อจำกัด | `orderItems` ไม่มี index `store` (`db.ts:47`) → ต้อง scope ผ่าน id ของ completed orders ก่อนเหมือน `useReports.ts:82`; เป็น full-scan ต่อ store — `ponytail:พอ orderItems โตหลักหมื่นค่อยเพิ่ม compound index [store+order]` |
| ไม่มีสินค้า sold-count | `products` ไม่มีคอลัมน์ยอดขาย (schema.ts:125-145) — ไม่จำเป็นต้องมี เพราะ aggregation จาก order_items สดทุกครั้ง |
