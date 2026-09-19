# zKCNT POS — PLAN ฟีเจอร์ที่ควรมีเพิ่ม (v0.6+)

สถานะปัจจุบัน (v0.5.0): multi-tenant + offline-first ครบ, POS/สินค้า/สต็อก/โปรโมชั่น/รายงาน/void-refund/PromptPay QR/sync engine/support ticket/platform admin ใช้งานได้
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
- [ ] low stock → แจ้งเตือนผ่าน email (มี Resend อยู่แล้ว) แทนการดูในหน้าอย่างเดียว

### สินค้า unique per piece (งานต้นฉบับ/ชิ้นเดียว)
- [ ] entity `stock_items` (serial ต่อชิ้น, ผูก product, สถานะ in_stock/sold, ระบุชิ้นใน inventory_transactions) — ครบ 5 ที่
- [ ] POS: ถ้าสินค้าเป็นแบบ unique ให้เลือก/สแกนชิ้นที่จะขายก่อนเข้า cart (กันขายซ้ำชิ้น)
- [ ] หน้า inventory: ดูชิ้นเหลือ/ขายแล้วต่อสินค้า + รูปต่อชิ้น (R2 มีอยู่แล้ว)

## Phase 4: Sync & ความเชื่อมั่น offline
- [ ] UI สถานะ sync แบบเห็นทั้ง queue (pending/failed/retry count) ใน layout — `engine.ts`/`queue.ts` มีข้อมูลอยู่แล้ว แค่ยังไม่มีหน้า
- [ ] บันทึกเหตุผล conflict ที่ LWW ทับแล้ว (audit + หน้าตรวจของ owner)
- [ ] self-check ระยะ store: เทียบยอด D1 vs Dexie หลัง sync ครบ (รายงานความต่าง ไม่ auto-fix)

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

## Appendix: สิ่งที่สำรวจแล้ว (ไม่ต้องเพิ่ม)
- barcode: มี field + ค้นจาก search ใน POS (`pos.vue:376`) — สแกนเนอร์ USB-HID พิมพ์แล้ว enter ได้เลย ถ้าอยากได้ scan-mode dedicated ค่อยคิด Phase แยก
- VAT 7% + CSV export มีใน reports แล้ว
- refund/void ระดับทั้งออเดอร์มีแล้ว (`orders.ts:176`)
- promotion engine, audit, feature flags, platform admin ครบ
- automated testing ที่มีอยู่แล้ว: backend integration (auth/orders/sync/rbac/migrate/admin/support/purge), FE sync-engine + cart + promotions tests, E2E 5 specs, CI รัน tests + build + Playwright — ห้ามทำซ้ำใน Phase 7

## ลำดับที่แนะนำ
Phase 1 → 4 → 2 → 5 → 3 → 6 (sync-provability คือสิ่งที่ทำให้เชื่อระบบตอน offline กลางงาน, customer ต้องเคลียร์งานค้างก่อน)
