# Sync & ความเชื่อมั่น offline (Phase 4 จาก PLAN.md) — UI queue, audit LWW conflict, self-check D1 vs Dexie

Branch: `feat/sync-observability` (แตกจาก `develop`)

## สรุปข้อเท็จจริง (Phase 0 investigation)

1. **ข้อมูล queue มีครบฝั่ง client แล้ว** — `db.syncQueue` เก็บ `status/retry_count/error_message/created_at` (`queue.ts:90-102` marks error หลัง retry < 5, เป็น `error` ถาวรที่ retry 5) แต่ UI แสดงแค่ตัวเลข `pendingSyncCount` บน Dashboard (`index.vue:80`) — ไม่มีที่ดูรายการรายตัว
2. **`resolveConflict()` ใน `conflict.ts:8` เป็นโค้ดตาย** — ไม่มีใครเรียก; `pullAll` ใน `engine.ts:142-183` ทำ `bulkPut` ครอบ local แบบไม่เทียบ `updated` เลย → "remote ชนะเสมอ" ขัด invariant LWW ใน AGENTS.md; local edit ที่ใหม่กว่า (ยังค้างใน queue) ถูกทับเงียบ ๆ และไม่มีการบันทึก
3. **audit ฝั่ง backend (`auditEvents`, `lib/audit.ts`) เขียนจาก route เท่านั้น** — conflict เกิดตอน pull ฝั่ง client จึงลง backend audit ไม่ได้ตรง ๆ → เก็บลง Dexie table ใหม่ + ให้ owner เปิดตรวจใน modal เดียวกัน (ไม่ต้องแตะ schema/migration ทั้งสองระบบ)
4. **self-check** — delta endpoint มีแล้ว (`GET /:storeId/sync`) แต่ไม่มี endpoint สรุป count/sum เทียบ; Dexie query ตาม store ทำได้ผ่าน index `store` เดิม → เพิ่ม route `GET /:storeId/sync/verify` ตัวเดียวพอ (read-only, ไม่ใช่ entity ใหม่ → ไม่ต้องครบ 5 ที่)

## Edge cases ที่วิเคราะห์แล้ว

| # | สถานการณ์ | ผลปัจจุบัน | หลังแก้ |
| --- | --- | --- | --- |
| 1 | local เพิ่งแก้ (ใหม่กว่า remote) แล้ว pull ทับ | data หายเงียบ ๆ | local ชนะตาม LWW + บันทึก conflict (local/remote snapshot) |
| 2 | แก้พร้อมกัน 2 อุปกรณ์ (remote ใหม่กว่า) | remote ชนะ |เหมือนเดิม + ไม่ log (ไม่ใช่ data loss) |
| 3 | tombstone (deleted) ส่งมาทับ local ที่ยังแก้ | local ถูกลบ | local ใหม่กว่า → ไม่ลบ + log conflict (queue จะ retry push เอง) |
| 4 | record เดิมไม่มีใน local (สร้างที่อื่น) | bulkPut ปกติ | ไม่ log (ไม่มีอะไรถูกทับ) |
| 5 | record ที่มี conflict ยังมีคิว pending อยู่ | — | คิว retry จะ push ซ้ำหลัง pull → server ได้ค่าใหม่; conflict log คือหลักฐาน |
| 6 | store purge/transaction clear → local ถูกล้างทั้งก้อน | — | local หายไปก่อนเทียบ → verify จะเห็น diff ชั่วคราว; รายงานอย่างเดียว ไม่ auto-fix ตามแผน |
| 7 | offline → กด verify | API fail | disable ปุ่มเมื่อ offline, error จาก API แสดงใน modal |

## Business Goals

- owner/cashier เห็นว่า "ค้างอะไร อยู่สถานะไหน retry กี่ครั้ง ทำไมพัง" ได้จาก layout ภายใน 2 คลิก
- ทุกครั้งที่ LWW ตัดสินทับข้อมูล มีหลักฐานตรวจย้อนหลัง (local vs remote snapshot + เวลา)
- หลัง sync ครบ กดตรวจยอด Dexie vs D1 ได้ทันที เห็นรายการที่ไม่ตรง (รายงาน ไม่แก้ให้อัตโนมัติ)

## Phase 1: หน้าต่างสถานะ sync ใน layout

### UI
- [x] `LayoutSyncStatus` component ใหม่ (chip ใน `Header.vue` ข้างปุ่ม online: badge จำนวน pending, สี warn เมื่อมี status `error`) เปิด modal `<Teleport>` รายการ queue ทั้งก้อน: collection / action / record_id / status / retry_count / error_message / created_at + ปุ่ม "ซิงค์ทันที" (เรียก `performSync`) — อ่านจาก Dexie ตรง ๆ ไม่ต้องพึ่ง backend — done: `components/layout/SyncStatus.vue` + `failedCount` เพิ่มใน `useSync` (นับจาก `getPendingItems` ครั้งเดียว)
- [x] ปุ่ม/ยอด hide เมื่อ `!offline_sync_enabled` (feature flag เดิมของ useSync) — กัน UI โผล่ร้านที่ไม่ใช้ offline

## Phase 2: LWW ให้ตรงจริง + บันทึก conflict

### engine
- [x] `pullAll` ทุก table ผ่าน helper เดียว (`applyPull` ใน engine — คืน tombstone ที่ลบจริงให้ cleanup inventory ของ products): incoming record ที่ `updated` เก่ากว่า local → ข้ามการเขียน (local ชนะ = LWW ตาม invariant) แล้วเขียนลงตารางใหม่
- [x] ตาราง `syncConflicts` ใน Dexie (version 7) (`++id, store, collection, record_id, created`) + interface ใน `lib/types/index.ts` — เก็บ collection, record_id, local_snapshot, remote_snapshot, reason, created; local-only ไม่ sync → ไม่ต้องแตะ schema/migrate/SQL/getTable
- [x] section "conflict" ใน modal (แสดง 50 รายการล่าสุด) เฉพาะ `isManager` ตาม request "หน้าตรวจของ owner"

## Phase 3: Self-check D1 vs Dexie (รายงาน ไม่ auto-fix)

### backend
- [x] `GET /:storeId/sync/verify` ใน `routes/sync.ts` (authMiddleware + requireStoreMember): คืน `{ checked_at, collections: { products, categories, customers, inventory, promotions, orders, order_items } }` เป็น count (orders เพิ่ม sum(total) เฉพาะ completed) โดยนับเฉพาะแถวที่มีชีวิต (filter `deleted_at` ที่ soft-delete) — เพิ่ม integration test happy path ใน `sync.test.ts`

### frontend
- [x] ปุ่ม "ตรวจความตรง" ใน modal (helper `computeLocalVerify` แยกไว้ที่ `lib/sync/verify.ts` ให้ทดสอบได้) → เรียก `api.syncVerify` เทียบกับ Dexie count ต่อ collection + sum orders (completed, เฉพาะที่ sync แล้ว — non-temp id) → ตาราง local / server / diff; ต่าง → แถวสี warn, ไม่มีการเขียนข้อมูลกลับ

## Phase 4: Review & Quality Assurance

- [x] `bunx vitest run tests` = 10 ไฟล์ 42 ผ่าน (เพิ่ม 3 เคส pullAll: local ใหม่กว่าไม่ถูกทับ+log / remote ใหม่กว่าทับ+ไม่ log / tombstone ไม่ลบ local ใหม่กว่า) (vitest + fake-indexeddb pattern เดิม) — เพิ่มเคส pullAll: local ใหม่กว่าไม่ถูกทับ+log / remote ใหม่กว่าทับ+ไม่ log / tombstone ไม่ลบ local ใหม่กว่า
- [x] `bun test src/test/integration` = 28 ผ่าน (เพิ่มเคส verify: seed 1 category+1 product → count ตรง, orders `{0,0}`)
- [x] typecheck: backend 8 error = baseline develop (diff 0), frontend 11 error = baseline develop (diff 0)
- [x] ติ๊กช่อง PLAN.md Phase 4 แล้ว

## Appendix: ผลสำรวจ

| ประเด็น | ข้อเท็จจริง |
| --- | --- |
| retry policy | `markError` (`queue.ts:90`): retry_count++ ทุกครั้งที่ fail, status เป็น `error` ถาวรที่ 5 — ข้อมูลพร้อมแสดง ไม่ต้องแก้ |
| file queue | `fileUploadQueue` มี status/error ของตัวเอง — ไม่รวมใน modal รอบนี้ (YAGNI; รวมเมื่อมีคนรายงาน upload ค้าง) |
| ตำแหน่ง mount | `app.ts:124` `app.route("/api/stores", syncRoutes)` → verify path คือ `/:storeId/sync/verify` ต่อท้าย `/:storeId/sync` เดิมได้ (GET แยก route ไม่ชนกัน) |
| soft-delete | `deleted_at` มีเฉพาะ categories/products/customers/promotions/promotionTargets — verify filter รายตัวตามนี้ |
| orders ใน Dexie | ออร์เดอร์ offline มี id `temp_*` — เทียบ sum กับ server ต้องกันออก ไม่งั้น diff จริงอยู่แล้วยอดค้างคิว ถูกตีความเป็น sync พัง |
| resolveConflict | ไฟล์ `conflict.ts` ไม่ถูก import ที่ไหนเลย — helper ใหม่ใน engine ใช้ตรรกะเทียบ `updated` เดิม (tie → remote ชนะ) ไม่แตะ signature |


---

## ผลimplementation (Phase 4 proof)

- Branch `feat/sync-observability` — ยังไม่ commit (รอ user ตรวจ)
- Manual ที่ค้าง (รอ user ตรวจบน `task local`): เปิด modal ขณะ offline → มีคิวค้างเห็น pending, ขาย offline ให้ retry พังดู badge "ผิดพลาด N", 2 อุปกรณ์แก้สินค้าเดียวกันเทียบ conflict log, กด "เริ่มตรวจ" หลัง sync ให้ตรงกันทุกแถว
