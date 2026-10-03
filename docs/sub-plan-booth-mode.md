# โหมดบูธ — จัดการงานที่ไปออกบูธ, ต้นทุนต่อชิ้นรวมค่าบูธ, รายงานว่างานไหนขายอะไรดี

Branch: `feat/booth-mode` (แตกจาก `develop` เมื่อ plan อนุมัติ)

## Business Goals

- เพิ่มข้อมูล "บูธ/งาน" ได้: ชื่อ, สถานที่, วันที่เริ่ม–สิ้นสุด (จำนวนวันคำนวณเอง), รูป, ค่าบูธ (บาท)
- ตั้งค่าร้านมี dropdown "บูธที่กำลังใช้งาน" — เลือก "ไม่ใช้งานบูธ (แสดงสินค้าทั้งหมด)" (default) = หน้าแคชเชียร์เหมือนเดิมทุกอย่าง; เลือกบูธ = หน้า POS แสดงเฉพาะสินค้าของบูธนั้น และออเดอร์ถูกผูกกับบูธ
- สร้างบูธแล้วดึงสินค้าที่มีสต๊อกเข้ามาให้ทั้งหมด แก้ได้ภายหลัง (เลือกทั้งหมวดหมู่ หรือเลือกรายตัว)
- ค่าบูธถูกเฉลี่ยต่อชิ้น → ต้นทุนต่อชิ้น = ต้นทุนผลิต (`products.cost`) + ค่าบูธเฉลี่ย → เห็นกำไรต่อชิ้นจริง
- หน้ารายงานดูได้ว่างานไหนขายอะไรดี (แยกตามสินค้า/หมวดหมู่ เช่น สติ๊กเกอร์ชิ้น, สติ๊กเกอร์แผ่น, โปสการ์ด, พวงกุญแจ) เพื่อตัดสินใจว่ารอบหน้าควรผลิตอะไรเพิ่ม
- กำไรจริงนับค่าใช้จ่ายอื่นของบูธ (เดินทาง ที่พัก อุปกรณ์) และเห็นจุดคุ้มทุนหน้า POS; ปิดบูธแล้วกรอกของเหลือเพื่อให้ sell-through แม่น
- ทำงาน offline ได้ครบ (อ่านจาก Dexie, เขียนลง Dexie + syncQueue)

## Phase 1: Data model — entity `booths` + `booth_products` + ผูก `orders.booth`

### Backend (dual DB ต้องแก้ให้ตรงกัน)

- [x] เพิ่ม Drizzle table `booths` (store, name, location, start_date, end_date, booth_fee, extra_costs JSON `[{name, amount}]`, closed_at, image, is_active, deleted_at, timestamps) ใน `backend/src/db/schema.ts`
- [x] เพิ่ม Drizzle table `booth_products` (booth, product, qty_brought, qty_left (nullable, กรอกตอนปิดบูธ), deleted_at, timestamps) + unique index `[booth+product]`
- [x] เพิ่มคอลัมน์ `booth` (nullable FK) ใน `orders` — ไม่เพิ่ม route PATCH/DELETE (orders ยัง immutable)
- [x] เพิ่มรายการใน `backend/src/db/migrate.ts` (local) และไฟล์ `backend/migrations/0009_booths.sql` (prod D1)
- [x] Hono routes `/api/stores/:storeId/booths` + `/booths/:id/products` (CRUD, `requireStoreMember` อ่าน / `requireManager` เขียน) + อัปโหลดรูปตามแบบ `catalog.ts` products image
- [x] ให้ `POST orders` รับ/บันทึก `booth` (validate ว่าเป็นของ store เดียวกัน)
- [x] ลงทะเบียน `booths`, `booth_products` ใน `COLLECTION_HANDLERS` + delta sync + `verify` ใน `backend/src/routes/sync.ts`

### Frontend

- [x] เพิ่ม interface `Booth`, `BoothProduct`, ฟิลด์ `booth` ใน `Order`, `active_booth_id?: string` ใน `StoreSettings` ที่ `frontend/app/lib/types/index.ts`
- [x] เพิ่ม Dexie version 8: `booths: 'id, store, [store+is_active], start_date'`, `boothProducts: 'id, booth, [booth+product], product'`, เพิ่ม index `booth` ใน `orders` (`frontend/app/lib/db.ts`)
- [x] ลงทะเบียนใน `getTable()` ของ `frontend/app/lib/sync/engine.ts` + ตรวจ `verify.ts`/`purge-transactional.ts` ว่าครอบคลุม
- [x] เพิ่ม composable `useBooths.ts` (list/create/update/delete, อ่าน Dexie, เขียน API ก่อนตอน online / queue ตอน offline)

### บันทึกผล Phase 1

- Route จริงเป็นแบบ REST ต่อ record: `/booths` (+ `/booths/:id/image`) และ `/booth-products` (แทนที่จะเป็น `/booths/:id/products`) เพื่อให้เข้ากับ generic sync queue (`collectionCreate/Update/Delete`)
- id ของ booth/booth_products สร้างฝั่ง client (server รับ `id` ได้ ตรวจรูปแบบ, ห้าม `temp_`) → ไม่ต้อง remap temp id ตอน sync; `POST /booths` ซ้ำ id เดิมคืน record เดิม (idempotent); `POST /booth-products` ของเดิมที่เคยลบ = revive แถวเดิม
- `queue.ts`: ลำดับ sync `booths` (-1) ก่อน `orders` (0) เพราะ order อ้าง booth; `booth_products` ไปท้ายสุด
- `sync/verify` ทั้งสองฝั่งนับ `booths` เพิ่ม; `purge-transactional` ไม่ต้องแก้ (booths เป็น config ไม่ใช่ transactional)
- การอัปโหลดรูปบูธตอน offline (file queue) **ยังไม่ทำ** — route รูปมีแล้ว จะต่อ UI ใน Phase 2 แบบ online-only ก่อน
- เทสต์: เพิ่ม `backend/src/test/integration/booths.test.ts` (CRUD, revive, sync delta, soft delete, ห้ามอ้างบูธข้าม store); `bun test` ผ่าน 51/51, `vitest` ผ่าน 51/51; apply `0009_booths.sql` ต่อจาก migration เดิมบน SQLite ผ่าน
- typecheck: ไม่มี error ใหม่ในไฟล์ที่แก้ (error เดิมใน `executor.ts`, `orders.ts` batch, `store-transaction-purge`, `support.test.ts`, `tests/integration/sync-engine.test.ts` มีอยู่ก่อนแล้ว)
- ยังไม่ได้รัน `task cf:db:migrate:local` (ต้องใช้ wrangler)

## Phase 2: จัดการบูธ + เลือกสินค้า + ต้นทุนต่อชิ้น

### ตั้งค่า (อ้างอิงภาพตัวอย่าง)

- [x] เพิ่มการ์ด "การจัดการบูธ" (ปุ่มไป `/booths`) และการ์ด "บูธที่กำลังใช้งาน" (dropdown: ไม่ใช้งานบูธ + รายการบูธ) ใน `pages/settings/index.vue` บันทึกลง `store.settings.active_booth_id` (default ว่าง)

### หน้า `/booths` (layout 2 ฝั่ง)

- [x] ฝั่งซ้าย: ช่องพิมพ์ชื่อ + ปุ่ม + สร้างบูธทันที, รายการบูธ (ชื่อ, ช่วงวันที่ + จำนวนวัน, ค่าบูธ, ปุ่มลบ)
- [x] ฝั่งขวา: ฟอร์มแก้ไขบูธ (ชื่อ, สถานที่, วันเริ่ม–จบ, ค่าบูธ, รูป); ยังไม่เลือกบูธแสดง empty state
- [x] เมื่อสร้างบูธ → ดึงสินค้า active ที่มีสต๊อก (`inventory.quantity > 0`) ใส่ `booth_products` พร้อม snapshot `qty_brought`
- [x] ฝั่งขวา: รายการสินค้ามี checkbox + ช่องค้นหา + toggle ทั้งหมวดหมู่ (เลือกรายตัวหรือทั้งหมวด) และแก้ `qty_brought` ได้
- [x] สรุปต้นทุน: `ค่าบูธเฉลี่ย/ชิ้น = booth_fee ÷ Σ qty_brought` แสดงต่อสินค้า: ต้นทุนผลิต + ค่าบูธเฉลี่ย = ต้นทุนรวม/ชิ้น และกำไร/ชิ้น; คำนวณใหม่เมื่อเลือกสินค้าเปลี่ยน
- [x] ส่วน "ค่าใช้จ่ายเพิ่มเติม" ในฟอร์มบูธ (เพิ่ม/ลบแถว ชื่อ + จำนวนเงิน); ค่าเฉลี่ยต่อชิ้นใช้ (ค่าบูธ + ค่าใช้จ่ายเพิ่มเติม) ÷ Σ `qty_brought`
- [x] ปุ่ม "ปิดบูธ": modal กรอก `qty_left` ต่อสินค้า แล้วตั้ง `closed_at` (ไม่ปรากฏเป็นตัวเลือกบูธที่ใช้งานอีก)
- [x] ฟังก์ชันคำนวณเป็น pure function ใน `frontend/app/lib/booths/cost.ts`

### บันทึกผล Phase 2

- เส้นทางเข้า: เมนู "บูธ" ใน sidebar (เฉพาะ manager/owner) → `/booths` (ปรับตาม feedback: ในตั้งค่าเข้าถึงยาก); ในตั้งค่าเหลือเฉพาะ dropdown "บูธที่กำลังใช้งาน"
- ฟอร์มแก้บูธเป็น panel ฝั่งขวา (ไม่ใช่ modal) ตาม layout ภาพตัวอย่าง; มี modal เดียวคือ "ปิดบูธ" (ไม่ปิดเมื่อคลิก backdrop)
- เลือกสินค้าใน `components/booth/BoothDetail.vue`; จำนวนเริ่มต้นเมื่อติ๊กเองคือสต๊อกปัจจุบัน (อย่างน้อย 1)
- ลบบูธที่เป็น `active_booth_id` อยู่ → เคลียร์ค่าใน settings ให้ก่อน
- dropdown "บูธที่กำลังใช้งาน" และอัปโหลดรูปบูธใช้ได้เฉพาะตอน online (`updateStore` เป็น API-only อยู่แล้ว); บูธที่ปิดแล้วไม่อยู่ในตัวเลือก
- เพิ่ม `lib/booths/cost.ts` (`totalBoothCost`, `boothCostPerPiece`, `productEconomics`, `seedBoothProducts`, `boothDayCount`) + `tests/lib/booth-cost.test.ts`
- i18n: เพิ่ม `boothsPage.*` และ `nav.booths` ทั้ง th/en (แทรกแบบ text — `en.json` เดิมมี key ซ้ำ ห้าม rewrite ด้วย JSON dump)
- ผล: vitest 56/56, `bun test` 51/51, ไม่มี typecheck error ในไฟล์ที่แก้
- **ยังไม่ได้ตรวจด้วยตาในเบราว์เซอร์** (ตรวจแค่ typecheck + unit test)

## Phase 3: หน้าแคชเชียร์ตามบูธ

- [x] ใน `pages/pos.vue`: อ่าน `active_booth_id` จาก store settings; ว่าง = พฤติกรรมเดิมทั้งหมด; แสดงป้ายชื่อบูธที่ใช้อยู่ให้แคชเชียร์เห็น
- [x] แถบจุดคุ้มทุนบน POS: `ยอดขายสะสมของบูธ ÷ (ค่าบูธ + ค่าใช้จ่ายเพิ่มเติม + ต้นทุนผลิตที่ขายไป)` แสดงเป็น % และยอดที่ขาดอีกกี่บาท
- [x] ถ้าวันนี้พ้น `end_date` ของบูธที่ใช้งาน (หรือบูธปิดแล้ว) → แสดงคำเตือนบน POS และไม่กรองสินค้า/ไม่ผูกบูธให้ออเดอร์ใหม่ (fallback เป็นโหมดปกติ)
- [x] กรองรายการสินค้า/หมวดหมู่ให้เหลือเฉพาะสินค้าใน `booth_products` ของบูธที่เลือก
- [x] `useOrders.createOrder` ใส่ `booth` ลงใน order (ทั้ง online และ offline queue)

### บันทึกผล Phase 3

- `composables/useActiveBooth.ts`: อ่าน `active_booth_id` → สถานะ `none` / `active` / `ended`; `ended` (ปิดแล้ว, ลบแล้ว, หรือพ้น `end_date` ตามเวลา Bangkok) = POS กลับโหมดปกติ + แถบเตือน ไม่ผูก booth ให้ออเดอร์ใหม่; ก่อน `start_date` ยังใช้ได้ (ซ้อมขาย/ตั้งค่าล่วงหน้า)
- POS: กรองสินค้า + ซ่อนหมวดที่ไม่มีสินค้าของบูธ; booth ที่ไม่มีสินค้าจะเห็นหน้าว่าง (ตั้งใจ)
- แถบคุ้มทุน: `ยอดขายบูธ ÷ (ค่าบูธ+ค่าใช้จ่ายเพิ่มเติม + ต้นทุนผลิตของที่ขาย)` อ่านจาก Dexie (offline ได้) รีเฟรชหลังชำระเงิน; นับเฉพาะ order `completed`
- `useOrders.createOrder` ส่ง `booth` ทั้งเส้นทาง online และ offline queue
- เทสต์: `booth-cost.test.ts` เพิ่ม `isBoothEnded`/`boothBreakEven`; backend เพิ่มเคส order ติด booth + sync delta; vitest 58/58
- **ยังไม่ได้ตรวจ UI ใน POS ด้วยตา** และยังไม่มี E2E (อยู่ Phase 5)

### Addendum หลัง Phase 3 (feedback จาก user)

- **เลือกบูธบนหน้า POS:** เพิ่ม dropdown ในแถบบูธบน POS และเอา dropdown ออกจากตั้งค่า; เปลี่ยนจากค่าระดับร้าน (`settings.active_booth_id`) เป็น **ต่อเครื่อง/ต่อร้านใน localStorage** (`pos_active_booth`) — เหตุผล: `updateStore` ใช้ได้เฉพาะ online + manager แต่แคชเชียร์ต้องสลับบูธได้ แม้ offline หน้างาน; ข้อสมมติข้อ 5 ใน Appendix จึงเปลี่ยน (แต่ละเครื่องเลือกบูธเอง)
- **Date format:** ของเดิมไม่สอดคล้องกัน (th = `3/10/2569` ไม่เติม 0, en = `10/3/2026` เดือนนำหน้า) → ตั้งมาตรฐาน `dd/MM/yyyy` และ `dd/MM/yyyy HH:mm:ss` (24 ชม., เขตเวลา Bangkok) โดย **ภาษาไทยใช้ปี พ.ศ. เหมือนเดิม ภาษาอื่นใช้ ค.ศ.** ผ่าน `formatBangkokDate/DateTime/formatDateKey(…, locale)` ใน `lib/timezone.ts`; `useFormat` ส่ง locale ให้อัตโนมัติ → ทุกหน้าที่เรียกผ่าน `useFormat` เปลี่ยนตาม; แก้ `SyncStatus`, release notes, รายการบูธ ให้ใช้ตัวเดียวกัน
- ยังคงเดิม: label แกนกราฟรายงาน (`formatBangkokDateShort` เช่น "3 ต.ค.") เพราะเป็นป้ายย่อบนกราฟ; `<input type="date"/datetime-local">` ของเบราว์เซอร์ แสดงตาม locale ของเบราว์เซอร์/OS บังคับรูปแบบไม่ได้
- เทสต์: `tests/lib/dateFormat.test.ts` (ข้ามวันตาม Bangkok, zero-pad, พ.ศ./ค.ศ. ตาม locale, date-key ไม่เลื่อนวัน); vitest 61/61

## Phase 4: รายงานตามบูธ

- [x] เพิ่ม `frontend/app/lib/reports/booth.ts` (อ่านจาก Dexie, ไม่แตะ backend report): ต่อบูธ = ยอดขาย, ต้นทุนผลิตรวม, ค่าบูธ, **กำไรจริง = ยอดขาย − ต้นทุนผลิตที่ขายไป − ค่าบูธ − ค่าใช้จ่ายเพิ่มเติม**, จำนวนวัน, ยอดขาย/วัน
- [x] อันดับสินค้าต่อบูธ: จำนวนที่ขาย, รายได้, กำไร, sell-through (`ขาย ÷ qty_brought`; บูธที่ปิดแล้วใช้ `qty_brought − qty_left` เป็นตัวตั้งแทนเมื่อกรอกไว้)
- [x] สรุปตามหมวดหมู่ข้ามทุกบูธ (สติ๊กเกอร์ชิ้น/แผ่น/โปสการ์ด/พวงกุญแจ) + ป้าย "ควรผลิตเพิ่ม" (sell-through สูง) / "ผลิตน้อยลง" (sell-through ต่ำ)
- [x] เพิ่มช่องกรอง "บูธ" (ทั้งหมด / ไม่มีบูธ / รายชื่อบูธ) บน `pages/reports/index.vue` กรอง `orders.booth` ก่อนเข้า `aggregateReports` ให้ KPI, สินค้าขายดี, กราฟรายชั่วโมงเปลี่ยนตาม (ทั้งทาง Dexie และ `buildStoreReports` ฝั่ง backend ที่ใช้ตอน online)
- [x] เพิ่มแท็บ "บูธ" เฉพาะส่วนที่ช่องกรองให้ไม่ได้: กำไรจริง, sell-through, ป้ายแนะนำผลิต (เคารพ `reports_enabled`)
- [x] เพิ่ม key i18n th/en (`frontend/i18n/locales/`) สำหรับ settings, booths, POS, reports

### บันทึกผล Phase 4

- `lib/reports/booth.ts` (`buildBoothReport`): ต่อบูธ = ยอดขาย, ต้นทุนผลิตที่ขายไป, ต้นทุนบูธรวม, กำไรจริง, ยอดขาย/วัน; ต่อสินค้า = นำไป/ขายได้/เหลือ/ขายหมด%/กำไร; สรุปหมวดหมู่ข้ามทุกบูธ นับเฉพาะ order `completed`
- sell-through = (นำไป − เหลือ) ÷ นำไป เมื่อปิดบูธและกรอกของเหลือ มิฉะนั้น ขายได้ ÷ นำไป; ป้าย "ควรผลิตเพิ่ม" ≥ 80%, "ผลิตน้อยลง" ≤ 30% (ค่าคงที่ `SELL_THROUGH_HIGH/LOW` — ปรับได้จุดเดียว)
- สินค้าที่ขายในบูธแต่ไม่ได้อยู่ในรายการ "นำไป" จะแสดงด้วย นำไป = 0 (sell-through ว่าง)
- ช่องกรองบูธบนหน้ารายงาน (ทุกบูธ / ไม่ใช้บูธ / รายชื่อ) ส่ง `booth` ให้ `GET /reports` + `export.csv` (backend กรองเฉพาะ order ของช่วงปัจจุบัน/ก่อนหน้า) และกรอง Dexie ในเส้นทาง offline; ตัวกรองไม่แตะข้อมูลสต๊อก/audit/promotion usage ของรายงาน (ไม่ผูกกับบูธ)
- แท็บ "บูธ" (`components/reports/BoothReportPanel.vue`) อ่านจาก Dexie, ไม่ขึ้นกับช่วงเวลา/ตัวกรองบนหน้า, กดแถวบูธเพื่อดูสินค้า; ตารางเทียบทุกบูธรวมอยู่แล้ว (ที่เคยเลื่อนไป phase ถัดไป)
- เทสต์: `tests/lib/boothReport.test.ts` (4 เคส), backend `reports booth filter`; vitest 65/65, `bun test` ผ่าน
- ยังไม่ได้ตรวจหน้ารายงานด้วยตาในเบราว์เซอร์

### Addendum หลัง Phase 4 — ตรวจหน้าจริงด้วย Playwright (สคริปต์ชั่วคราว ลบแล้ว)

รัน backend (`DATA_DIR=./data-e2e`, port 3001) + `nuxt preview` (port 3000) แยกจาก dev DB, seed ร้าน/หมวด/สินค้า/สต๊อก แล้วขับ UI: login → `/booths` (สร้าง, กรอก, ค่าใช้จ่ายเพิ่มเติม) → POS (เลือกบูธ, ขาย) → รายงาน (ช่องกรอง, แท็บบูธ) → ปิดบูธ → กลับ POS/รายงาน + มือถือ 390px

พบและแก้:
- `/booths` บนมือถือล้นขอบจอ (grid ไม่มี `grid-cols-1`/`min-w-0`) → แก้แล้ว วัด `scrollWidth = clientWidth = 390`
- แท็บบูธแสดง "ผลิตน้อยลง" ให้บูธที่ยังไม่ปิด (ขายได้ 4% กลางงาน) ซึ่งเป็นคำแนะนำผิดเวลา → ป้ายแนะนำแสดงเฉพาะบูธที่ปิดแล้ว และสรุปหมวดหมู่นับเฉพาะบูธที่ปิด (มีข้อความ empty state)
- หัวหน้าหน้า `/booths` บนมือถือตัดบรรทัดสามชั้น → ใช้ชื่อสั้น "บูธ"

พบแต่ไม่ได้เกี่ยวกับงานนี้ (**แก้แล้วตามคำขอ** ยกเว้นข้อวันที่ native):
- รีโหลดหน้า `/reports` ตรง ๆ แสดง "ไม่มีข้อมูล" เพราะ `loadReports` return เมื่อ `activeStoreId` ยังไม่พร้อมตอน mount (เข้าผ่านเมนูปกติได้) → แก้: `useReports` watch `activeStoreId` แล้วโหลดเมื่อร้านพร้อม; ยืนยันด้วยเบราว์เซอร์ว่ารีโหลดตรง ๆ แสดงข้อมูล
- console error `"bar" is not a registered controller` บนหน้ารายงาน → แก้: ลงทะเบียน `BarController` ใน `ReportsSalesChart` (กราฟ bar+line ขาด controller); ยืนยันว่า console สะอาด
- (ยังไม่แก้ — ต้องทำ date picker เอง) ช่องวันที่ native (`type="date"`) แสดงปี ค.ศ. ตาม locale เบราว์เซอร์ ขณะที่รายการแสดง พ.ศ. ตามภาษาแอป

## Phase 5: Review & Quality Assurance

- [x] เทสต์ unit `lib/booths/cost.ts` และ `lib/reports/booth.ts` (voided/refunded ไม่นับ, ค่าบูธ 0, qty_brought 0 ไม่หารศูนย์)
- [x] เทสต์ backend integration: booths/booth_products CRUD, order ผูก booth ข้าม store ไม่ได้, sync push/pull
- [x] E2E: สร้างบูธ → เลือกใน settings → ขายใน POS ที่กรองสินค้า → เห็นในรายงาน (assert CSS class; `visit("/")` ก่อน `/pos`)
- [x] รัน `bun run typecheck` (backend + frontend) + `task test` และทดสอบ migration `task cf:db:migrate:local`
- [x] อัปเดตไฟล์ plan นี้ (ติ๊ก `[x]` + บันทึกผล) และเพิ่ม release note ตามขั้นตอน release

### บันทึกผล Phase 5

- unit: `booth-cost.test.ts` (cost/seed/วัน/isBoothEnded/break-even), `boothReport.test.ts` (กำไรจริง, sell-through, advice เฉพาะบูธที่ปิด, หมวดหมู่), `dateFormat.test.ts`
- backend integration `booths.test.ts` (6 เคส): CRUD/revive/sync delta/soft delete, ห้ามอ้างบูธข้าม store, order ติดบูธ, ตัวกรองรายงาน, สิทธิ์ cashier (อ่านได้ เขียน 403)
- E2E ใหม่ `frontend/e2e/specs/booth-mode.spec.ts`: ไม่เลือกบูธ = เห็นสินค้าทั้งหมด → เลือกบูธแล้วกรองสินค้า → ขายสำเร็จ → ออเดอร์ติดบูธ (เช็กผ่าน `GET /reports?booth=`) และเลือกบูธค้างหลังรีโหลด/ล้างได้; 2/2 ผ่าน (assert ที่ `#pos-booth` + `data-testid` ไม่ใช่ข้อความแปล)
- ผลรวม: `bun test` 54/54, vitest 66/66, Playwright เต็มชุด 6 ผ่าน / 2 ล้ม — **2 ที่ล้มคือ `pos-stock-block` และ `orders-void-rbac` ล้มเหมือนเดิมบน commit ก่อนเริ่มงาน (`918e5e5`) ด้วย (เทียบด้วย worktree แยก) ไม่เกี่ยวกับบูธ**: `pos-stock-block` คลิกการ์ดสินค้าที่ปุ่ม `disabled` จึง timeout; `orders-void-rbac` ล้มตอน `registerExtraUser`
- typecheck: backend/frontend ไม่มี error ใหม่ในไฟล์ที่แก้ (error เดิมใน `executor.ts`, `orders.ts` batch, `store-transaction-purge`, `support.test.ts`, `tests/integration/sync-engine.test.ts`)
- migration: `0009_booths.sql` apply ต่อจาก 0001–0008 บนตาราง SQLite ผ่าน (`orders.booth` + ตารางใหม่ + index); `wrangler d1 migrations apply --local` บน D1 เปล่า **ล้มที่ `0004_add_get_discount_type.sql` (duplicate column) ซึ่งเป็นปัญหาเดิม** — `0001_init.sql` มีคอลัมน์นี้อยู่แล้ว จึง bootstrap D1 ใหม่จาก migration ทั้งหมดไม่ได้ (prod ที่ apply 0004 ไปแล้วไม่กระทบ); ยังไม่ได้ apply 0009 ผ่าน wrangler จริง
- Release note: ไม่แตะ `VERSION`/ไม่สร้าง tag (ขั้นตอน release เป็นของ user: เพิ่ม `VERSION` → `task release-notes` → tag); release notes สร้างจาก commit message ภาษาไทยของ branch นี้อัตโนมัติ
- เก็บกวาด: worktree/สคริปต์/ข้อมูลทดสอบชั่วคราวถูกลบ; `frontend/test-results/` ที่ถูก track ใน git ถูกคืนค่าไม่ให้เปลี่ยน

## Phase ถัดไป (นอก scope รอบนี้)

- คำแนะนำจำนวนผลิตรอบหน้า (ยอดเฉลี่ย/วัน × จำนวนวันของงานถัดไป), ปุ่มคัดลอก/ทำซ้ำบูธ, ตารางเทียบทุกบูธ

## ไม่ทำ (ตัดสินใจแล้ว)

- ราคาเฉพาะบูธ (`price_override`), สต๊อกแยกต่อบูธ/โอนสต๊อก, หลายบูธพร้อมกันต่อเครื่อง, CSV รายงานบูธ

## Appendix

### ข้อสมมติที่ตั้งไว้ (ขอ user ยืนยัน/แก้)

1. **ตัวหารค่าบูธ** = จำนวน "ชิ้น" ทั้งหมดที่นำไปบูธ (Σ `qty_brought`) ไม่ใช่จำนวนชนิดสินค้า — เพราะค่าบูธต่อชิ้นจึงจะสะท้อนต้นทุนจริงต่อชิ้น
2. **สต๊อก** ยังใช้ของร้านก้อนเดียว ไม่แยกสต๊อกต่อบูธ (`qty_brought` เป็นแค่ snapshot ตอนเลือกสินค้า ใช้คำนวณต้นทุนและ sell-through)
3. **รายงานบูธ** (แท็บกำไรจริง/sell-through) คำนวณฝั่ง frontend จาก Dexie; ช่องกรองบูธบนรายงานเดิมต้องส่ง `booth` ให้ backend report ด้วย ยังไม่ทำ CSV export เฉพาะบูธ
4. หมวดหมู่ที่ใช้เทียบ (สติ๊กเกอร์ชิ้น/แผ่น ฯลฯ) คือ `categories` เดิมของร้าน — ไม่สร้างแนวคิดประเภทสินค้าใหม่
5. **บูธที่ใช้งานเลือกบนหน้า POS ต่อเครื่อง** (เก็บใน localStorage ต่อร้าน) ไม่ใช่ระดับร้าน; ไม่ทำระบบศิลปินหลายคนตามภาพตัวอย่าง (ร้านขายของตัวเอง)
6. ออเดอร์เก่าก่อนมีฟีเจอร์ `booth = null` และไม่ปรากฏในรายงานบูธ

### อ้างอิงภาพตัวอย่าง

รายงานมีช่องกรองอีเวนต์, หน้าจัดการ 2 ฝั่ง (สร้างด้วยชื่อ + รายละเอียด), ตั้งค่ามี dropdown อีเวนต์ที่ใช้งาน — รูปแบบ "ซ่อนสินค้า" ในภาพไม่ใช้ เพราะต้องมีจำนวนที่เอาไปเพื่อหารค่าบูธ

### ไฟล์ที่กระทบหลัก

`backend/src/db/{schema,migrate}.ts`, `backend/migrations/0009_booths.sql`, `backend/src/routes/{booths(ใหม่),orders,sync}.ts`, `frontend/app/lib/{db,types/index,sync/engine}.ts`, `frontend/app/composables/{useBooths(ใหม่),useOrders}.ts`, `frontend/app/pages/{pos,settings/index,reports/index,booths/*(ใหม่)}.vue`, `frontend/i18n/locales/*`
