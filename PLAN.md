# zKCNT POS — PLAN ฟีเจอร์ที่ควรมีเพิ่ม (v0.6+)

สถานะปัจจุบัน (v0.5.2): multi-tenant + offline-first ครบ, POS/สินค้า/สต็อก/โปรโมชั่น/รายงาน/void-refund/PromptPay QR/sync engine/support ticket/platform admin ใช้งานได้ + sync observability (Phase 4 เสร็จแล้ว)
แหล่งที่มาของช่องว่าง: หน้าลูกค้าถูกปิด (`frontend/app/lib/features.ts:1`), จ่ายได้ครั้งละ 1 method (`orders.ts:323`) — บริบทใช้งานจริงคือออกบูธงาน art เป็นครั้งคราว ไม่ใช่หน้าร้านเปิดทุกวัน (ตัด cashier shift / Z-report ออกจากแผน)

## Business Goals
- ปิดช่องว่างที่ทำให้ใช้แทน POS เดิมตอนออกบูธไม่ได้: เก็บบิล, รับคืนสินค้า, จ่ายผสม, ปิดยอดต่องาน, งาน unique
- ทำให้ข้อมูล offline เชื่อถือได้สำหรับเจ้าของร้าน (sync status ที่โปร่งใส)
- เตรียมพื้นฐาน cost/supplier เพื่อกำไรขั้นต้นในรายงาน

## Phase 1: POS core ที่ยังขาด (impact สูงสุด, ทำก่อน)
### Held orders (เก็บบิล)
- [ ] เก็บ cart ที่ยังไม่ submit ลง Dexie + sync ได้ (สถานะ `held` บน orders หรือตาราง `held_carts`)
- [ ] UI recall/replace cart บน POS

### การรับคืนสินค้า (partial refund)
- [ ] endpoint refund แบบต่อรายการ (immutable order เดิม, สร้าง return order อ้างอิงต้นทาง) + คืน stock ผ่าน inventory_transactions
- [ ] UI เลือก item/จำนวนในหน้า order detail + พิมพ์ใบลดหนี้

### Split payment
- [ ] `order_payments` (หลายรายการต่อออเดอร์: cash+qr, เปลี่ยนทอน) — เพิ่มใน schema/Dexie/sync
- [ ] ปรับ CartPanel ให้บวก method ได้หลายแถว, total = sum(payments)

### สรุปยอดขายต่องาน/อีเวนต์
- [ ] entity `events` (ชื่องาน, ช่วงวัน, store) + ฟิลด์ `event` บน orders — ครบ 5 ที่ (schema/migrate/SQL, route, Dexie, types, getTable+delta)
- [ ] POS: เลือกงานที่กำลังออกบูธอยู่ครั้งเดียวต่อ session, ฝัง event id ในออเดอร์ที่ขาย
- [ ] รายงานสรุปต่องาน (ยอดขายตาม method/วัน ภายในช่วงงาน) + export CSV

## Phase 2: เปิดใช้ระบบลูกค้า + สมาชิก
- [ ] แก้ไขข้อมูลในหน้า customers (ค้างจากงานเก่า) แล้ว flip `CUSTOMERS_ENABLED`
- [ ] membership tiers + points accrue/redeem บนออเดอร์ (promotions engine เป็นแบบอย่าง)
- [ ] POS: ค้นลูกค้าด้วยเบอร์โทร/สิทธิ์ ณ หน้าขาย, แสดงแต้มคงเหลือ
- [ ] ประวัติซื้อต่อลูกค้า + รายงานลูกค้านิยม

## Phase 3: Inventory ถัดไป (cost → กำไรขั้นต้น)
- [ ] `suppliers` + `purchase_orders` + receive (เพิ่ม stock via inventory_transactions)
- [ ] ปรับปรุงต้นทุนถัวเฉลี่ย (weighted average cost) ใน `products.cost`
- [ ] รายงานกำไรขั้นต้น (ขาย−ทุน) ต่อสินค้า/หมวด ใน reports
- [ ] สื่อสารของหมด vs ใกล้หมดให้ตรง — ทำไปแล้วบางส่วน: กำหนดเกณฑ์เตือนใน modal ปรับสต็อก (`docs/sub-plan-stock-threshold-input.md`), badge รวมลิสต์เดียวในหน้ารายงาน (`docs/sub-plan-reports-low-stock-label.md`), ค้นหา/กรองสถานะในหน้าสต็อก (`docs/sub-plan-inventory-search-filter.md`)
- [ ] low stock → แจ้งเตือนผ่าน email (มี Resend อยู่แล้ว) แทนการดูในหน้าอย่างเดียว

### สินค้า unique per piece (งานต้นฉบับ/ชิ้นเดียว)
- [ ] entity `stock_items` (serial ต่อชิ้น, ผูก product, สถานะ in_stock/sold, ระบุชิ้นใน inventory_transactions) — ครบ 5 ที่
- [ ] POS: ถ้าสินค้าเป็นแบบ unique ให้เลือก/สแกนชิ้นที่จะขายก่อนเข้า cart (กันขายซ้ำชิ้น)
- [ ] หน้า inventory: ดูชิ้นเหลือ/ขายแล้วต่อสินค้า + รูปต่อชิ้น (R2 มีอยู่แล้ว)

## Phase 4: Sync & ความเชื่อมั่น offline
- [x] UI สถานะ sync แบบเห็นทั้ง queue (pending/failed/retry count) ใน layout — `engine.ts`/`queue.ts` มีข้อมูลอยู่แล้ว แค่ยังไม่มีหน้า → chip + modal ใน Header (`components/layout/SyncStatus.vue`)
- [x] บันทึกเหตุผล conflict ที่ LWW ทับแล้ว (audit + หน้าตรวจของ owner) → `pullAll` เลิกทับเงียบ ๆ (local ใหม่กว่า = อยู่ต่อ + log `syncConflicts` Dexie) แสดงใน modal เฉพาะ manager — ดู `docs/sub-plan-sync-observability.md`
- [x] self-check ระยะ store: เทียบยอด D1 vs Dexie หลัง sync ครบ (รายงานความต่าง ไม่ auto-fix) → `GET /:storeId/sync/verify` + ปุ่ม "ตรวจความตรง" ใน modal เดียวกัน (กัน `temp_*` ออกจากฝั่ง local)

## Phase 5: เติมมาตรฐานใบเสร็จ/ไทย
- [ ] ข้อมูลร้านสำหรับภาษี: store TIN, branch, ใบกำกับภาษี/ใบลดหนี้ header
- [ ] จำนวนเงินเป็นตัวอักษรภาษาไทยบนใบเสร็จ (มีสูตรเดียว, ไม่ต้องพึ่ง lib)
- [ ] export ข้อมูลร้าน (CSV/JSON) สำหรับ backup + PDPA (ดึง/ลบข้อมูลลูกค้า)

## Phase 6: Security & admin เล็กน้อย
- [ ] หน้า session management (อุปกรณ์ที่ login อยู่, revoke) — `clientSessions` มีแล้ว
- [ ] 2FA (TOTP) สำหรับ role owner
- [ ] audit log viewer ฝั่ง store owner (ปัจจุบันมีเฉพาะ platform admin)

## Phase 7: Automated testing (setup ช่องว่างที่เหลือ)
- [ ] Migration parity test: apply `src/db/migrate.ts` และ `backend/migrations/*.sql` ลง temp DB สองตัวแล้ว diff `.schema` ให้ fail เมื่อไม่ตรง (กัน drift ที่ AGENTS.md เตือน)
- [ ] Workers runtime smoke test: รัน integration ผ่าน `worker.ts` + local D1 (miniflare/wrangler) ให้แน่ใจว่าไม่ใช้ Node API เกิน shim — ตอนนี้ทดสอบแค่ entry Bun
- [ ] เพิ่ม `bun run typecheck` ของ backend + frontend เป็น step ใน `ci.yml` (ปัจจุบัน CI ไม่มี)
- [ ] เก็บ coverage จาก `bun test --coverage` + vitest coverage สรุปผลใน CI (report อย่างเดียว ยังไม่ตั้ง threshold)
- [ ] เพิ่ม lint gate (oxlint พอ, ไม่ต้อง configซับซ้อน) ทั้งสอง package + ใน CI — repo ยังไม่มี lint เลย
- [ ] E2E smoke สำหรับ invariants หลัก: ขาย offline → กลับ online แล้วยอดตรงกัน (Dexie vs API)

## Phase N: Review & Quality Assurance
- [ ] ทุก entity ใหม่ครบ 5 ที่ตาม AGENTS.md (schema+migrate+SQL / route / Dexie / types / getTable+delta)
- [ ] รัน `bun run typecheck` + `task test` เฉพาะ scope ที่แก้
- [ ] เพิ่ม integration test ให้ endpoint ใหม่น้อยที่สุด happy + void/conflict path
- [ ] E2E: `task test:e2e` (build ก่อน) สำหรับ flow POS ที่แก้

---

## เสร็จแล้ว (รายละเอียดใน `docs/sub-plan-*.md` — ใช้เป็น know-how ของการแตกงาน)

### Auto-deploy ผ่าน GitHub Actions (`docs/sub-plan-auto-deploy.md`)
- [x] ตรวจพบสาเหตุจริง: ตั้ง secrets เป็น Environment secret ของ `PRODUCTION` แต่ job ไม่ประกาศ `environment:` → secret ไม่ถูกส่ง (แก้ใน `2d7a81b`)
- [x] สร้าง Cloudflare API Token แบบ scoped (Workers Edit / D1 Edit / Pages Edit / Zone Read) + ยืนยัน Pages project `zkcnt-pos` กับ Workers routes `/api/*`, `/uploads/*`
- [ ] ค้าง: manual `workflow_dispatch` บน `main`, ตรวจ variable `NUXT_PUBLIC_APP_URL`, ตัดสิน trigger (auto vs approval) — ดู Phase 2–4 ในไฟล์

### Dashboard ยอดขายไม่ตรง Reports (`docs/sub-plan-dashboard-sales-mismatch.md`)
- [x] สาเหตุ: `fetchOrders(10)` แล้ว sum จาก slice 10 รายการล่าสุด → helpers นับต่ำกว่าจริงทุกครั้งที่ขายเกิน 10 ออร์เดอร์/วัน
- [x] แก้: helper `getTodayStats` ใน `frontend/app/lib/dashboard.ts` query Dexie ผ่าน compound index `[store+status]` กรองขอบวัน Bangkok; `fetchOrders(10)` คงไว้เฉพาะตาราง "ออร์เดอร์ล่าสุด"
- [x] proof: `tests/lib/dashboard.test.ts` (vitest + fake-indexeddb) ครอบ >10 รายการ/วัน, ย้อนวัน, voided/refunded, ต่าง store

### Reports preset "7 วันย้อนหลัง" (`docs/sub-plan-reports-last7.md`)
- [x] เพิ่ม `last7` ใน `ReportPeriod` + `getPeriodRange` (now ย้อน 6 วัน ที่ Bangkok start-of-day) + เปลี่ยน default หน้ารายงานเป็น `last7`
- [x] backend แก้แค่ type union 3 จุด — `period` ใช้เลือก granularity เท่านั้น ไม่แตะ SQL/schema
- [x] proof: `tests/lib/reportsPeriod.test.ts` + typecheck ทั้งสอง package

### Sync observability (Phase 4 ทั้งหมด, `docs/sub-plan-sync-observability.md`)
- [x] chip + modal สถานะ sync ทั้ง queue (pending/failed/retry) ใน Header (`components/layout/SyncStatus.vue`)
- [x] `pullAll` เลิกทับเงียบ ๆ — local ใหม่กว่าอยู่ต่อ + log `syncConflicts` Dexie, แสดงใน modal เฉพาะ manager
- [x] self-check เทียบยอด D1 vs Dexie: `GET /:storeId/sync/verify` + ปุ่ม "ตรวจความตรง" ใน modal เดียวกัน

### ค้นหา + กรองในหน้าสต็อก (`docs/sub-plan-inventory-search-filter.md`)
- [x] helper `stockStatusOf` ใน `lib/stock.ts` + search ชื่อ/SKU + dropdown สถานะ/หมวดหมู่ client-side จาก Dexie — UI-only ไม่แตะ backend; `tests/lib/stock.test.ts` ครอบ

### หน้า Products เต็มพื้นที่ (`docs/sub-plan-products-full-width.md`)
- [x] ลบ wrapper `max-w-7xl` ซ้ำ layout → patternเดียวกับหน้าอื่น; root cause padding การ์ดมือถือเกินแก้ที่ `UiMobileDataList` ตัวเดียว กระทบทุกหน้าไปทางเดียวกัน

### ของหมดโชว์ "ใกล้หมด" ใน Reports (`docs/sub-plan-reports-low-stock-label.md`)
- [x] สาเหตุ: filter `lowStock` = `qty <= threshold` รวมของหมดมาด้วย (design เดิมสองฝั่ง) → แก้ชั้น UI เป็นลิสต์เดียวพร้อม badge หมด/ใกล้หมด复用 `stockStatusOf`, ลบเซกชันขายดีซ้ำซ้อน

### กำหนดเกณฑ์เตือนตอนปรับสต็อก (`docs/sub-plan-stock-threshold-input.md`)
- [x] modal ปรับสต็อกมีช่อง "เกณฑ์เตือน" + POST `/inventory-transactions` รับ `low_stock_threshold` (สร้าง/แก้ใน 1 จุด), offline mirror ผ่าน syncQueue, เลิก hardcode default 10
- [x] บั๊กที่เจอตอน manual: ปรับเฉพาะเกณฑ์ (delta=0) ถูก early-return ทิ้ง → guard ใหม่ `txQuantity === 0 && !thresholdChanged` + PATCH `/inventory/:id`; proof: `inventory-threshold.test.ts`
- [ ] ค้าง: manual ซ้ำรอบสุดท้ายบน `task local` (เปลี่ยนเฉพาะเกณฑ์ → badge เปลี่ยนทันที + offline→sync แล้วค่าตรง)

### Know-how ที่ใช้ซ้ำได้ (จากทุกไฟล์ sub-plan)
1. sub-plan ทุกไฟล์มีโครงสร้าง: Branch → สรุปสาเหตุ/ข้อเท็จจริง (Phase 0) → Business Goals → ตาราง edge cases → Phase checklist → Proof → Appendix ผลสำรวจ
2. bug fix ไล่จาก source of truth: grep ทุก caller ของ pattern ที่พังก่อนแก้ (เคสนี้ไม่มีหน้าอื่น sum จาก slice ซ้ำ)
3. แก้ที่ชั้น helper + compound index เดิมพอ → ไม่ต้องแตะ Dexie schema / sync / migration
4. UI-only + type union = ยอมรับข้ามชั้น backend ได้ แต่ต้อง sync type contract ทั้งสองฝั่ง
5. ติ๊ก `[x]` พร้อมสาเหตุ/commit ในบรรทัด, ข้อที่รอ user ตรวจคง `[ ]` พร้อมหมายเหตุ (เช่น "รอ user ตรวจ")
6. typecheck baseline: เก่า error = เดิม develop → record ตัวเลข baseline ไว้ใน proof ว่าไม่เพิ่ม (ปัจจุบัน FE 11 / BE 8)
7. งาน UI ซ้ำหลายหน้า ให้แก้ที่ shared component/helper ตัวเดียว (`UiMobileDataList`, `stockStatusOf`) แทน loop รายหน้า
8. manual round แลก้พบบั๊กจริง (delta=0 early-return) → ซ้ำ: "รอ user ตรวจ" ต้องคง `[ ]` จนกว่าจะผ่านรอบใหม่

---

## Appendix: สิ่งที่สำรวจแล้ว (ไม่ต้องเพิ่ม)
- barcode: มี field + ค้นจาก search ใน POS (`pos.vue:376`) — สแกนเนอร์ USB-HID พิมพ์แล้ว enter ได้เลย ถ้าอยากได้ scan-mode dedicated ค่อยคิด Phase แยก
- VAT 7% + CSV export มีใน reports แล้ว
- refund/void ระดับทั้งออเดอร์มีแล้ว (`orders.ts:176`)
- promotion engine, audit, feature flags, platform admin ครบ
- automated testing ที่มีอยู่แล้ว: backend integration (auth/orders/sync/rbac/migrate/admin/support/purge), FE sync-engine + cart + promotions tests, E2E 5 specs, CI รัน tests + build + Playwright — ห้ามทำซ้ำใน Phase 7

## ลำดับที่แนะนำ
Phase 1 → 2 → 5 → 3 → 6 (Phase 4 เสร็จแล้วใน v0.5.2 — sync-provability ผ่านไปแล้ว, customer ต้องเคลียร์งานค้างก่อน)
