# กำหนดเกณฑ์เตือน (low_stock_threshold) ตอนเพิ่ม/ปรับสต็อก — frontend form + ส่งค่าเข้า API

Branch: `feat/stock-threshold-input` (แตกจาก `develop` เมื่อ plan อนุมัติ)

## สรุปสาเหตุ (Phase 0 investigation)

- schema + backend รองรับ `low_stock_threshold` ครบแล้ว (`schema.ts:240`, POST/PATCH `/inventory` ใน `routes/inventory.ts:80,135`) — **ไม่ต้องแตะ schema/migration/sync**
- หน้า inventory แสดงคอลัมน์ "เกณฑ์เตือน" ตลอด (`pages/inventory/index.vue:82-140`) แต่ modal ปรับสต็อกมีเฉพาะ product/type/qty/note → **ไม่มีจุดเดียวใน UI ที่กำหนดหรือแก้ threshold ได้** (ไม่มีที่ไหนเรียก PATCH `/inventory/:id`)
- ค่า default เพี้ยนกันเอง: offline สร้าง record ใหม่ hardcode `low_stock_threshold: 10` (`useInventory.ts:118`) แต่ online ผ่าน POST `/inventory-transactions` สร้างแถวด้วย `0` (`routes/inventory.ts:211`)

**ข้อสรุป: งานหลักอยู่ชั้น frontend (modal + `adjustStock`) บวก backend 1 จุดเล็ก ๆ ให้รับ threshold ผ่าน transaction POST**

## Business Goals

- ตอนเพิ่ม/ปรับสต็อก ผู้ใช้กำหนด "เกณฑ์เตือน" ของสินค้านั้นได้ และค่าที่แก้เห็นผลทันทีในตาราง/badge สถานะ
- offline และ online ให้ผลเหมือนกัน (default สม่ำเสมอ เลิก hardcode 10)
- callers เดิมของ `adjustStock` (products, bulk-add, import) ไม่พังเมื่อไม่ส่ง threshold

## Phase 1: เพิ่มช่องเกณฑ์เตือนใน modal ปรับสต็อก + ส่งค่าถึง DB ทั้งสอง mode

### Backend (`routes/inventory.ts`)
- [x] POST `/:storeId/inventory-transactions` — รับ `low_stock_threshold` (optional): สร้าง inventory ใหม่ใช้ค่านี้ยแทน 0; มีแถวอยู่แล้วและส่งค่ามาด้วย → update `lowStockThreshold` พร้อม `quantity` ใน set เดียวกัน (1 จุด, ทุก caller ได้ผลฟรี)

### Frontend (`composables/useInventory.ts`)
- [x] `adjustStock(productId, type, quantity, note?, threshold?)` — เพิ่มพารามิเตอร์ optional; online: ใส่ `low_stock_threshold` ใน body ของ transaction POST; offline: เขียนค่าลง `data` ของ syncQueue ทั้ง create (แทน hardcode 10) และ update branch + Dexie `update`

### Frontend (`pages/inventory/index.vue`)
- [x] modal ปรับสต็อก: เพิ่ม numeric input "เกณฑ์เตือน" (label ใช้ `common.threshold` ที่มีแล้ว — ไม่ต้องเพิ่ม i18n key) เหนือช่อง note
- [x] เลือกใช้ `watch(productId)` pre-fill `adjustForm.threshold` จากแถว inventory (ค่าเดิมของ `openAdjust` / เลือกเองจากปุ่มใหญ่ได้ผลเหมือนกัน); case ยังไม่มีสินค้า = 0 `adjustForm.threshold = item.low_stock_threshold`; open modal จากปุ่มใหญ่ (ยังไม่มีสินค้า) pre-fill = ค่าเดิมของ default ใหม่ (0)
- [x] `handleAdjust` ส่ง threshold ต่อเข้า `adjustStock`

## Phase 2: Review & Quality Assurance

- [x] typecheck = baseline เดิมเป๊ะ (backend 8, frontend 11 errors — pre-existing `admin/stores/[id].vue` + `sync-engine.test.ts`; ไม่มี error ในไฟล์ที่แก้ — ยืนยันด้วย stash เทียบ backend)
- [x] เพิ่ม `backend/src/test/integration/inventory-threshold.test.ts` — create ด้วย threshold, tx ไม่ส่ง threshold → ค่าเดิมไม่ถูกรีเซ็ต (กันบั๊ก 0 ทับของเก่า), ส่งใหม่ → แก้ได้, default 0; `bun test src/test/integration` = 30 ผ่าน
- [x] `bun run test tests/unit` = 13 ผ่าน; ไม่มี test ของ `adjustStock` เดิม → ไม่เพิ่ม suite (mock `$api`+Dexie หนักกว่าผลที่ได้, LWW ของ `updated` ใน queue data ยืนยันด้วย type แล้ว)
- [ ] manual บน `task local`: online → ปรับสต็อก+ตั้งเกณฑ์ → reload ยังอยู่ + badge "ใกล้หมด" เปลี่ยน; offline → ทำเดียวกัน → sync ขึ้นแล้วค่าตรง

## Appendix: ผลสำรวจ

| ประเด็น | ข้อเท็จจริง |
| --- | --- |
| เหตุผลที่ผ่าน transaction POST ไม่แยก PATCH | online ไม่มี inventory id ในมือก่อน POST (แถวถูก create โดย backend) — ต้อง 2 round-trip + race; แก้ 1 บรรทัดใน set เดียวตรง `routes/inventory.ts:200-215` ไม่ละเมิด invariant (inventory_transactions ยัง immutable — เราแก้ตาราง `inventory` ซึ่งเป็น pattern เดิมที่ route นี้ update quantity อยู่แล้ว) |
| default ใหม่ | ใช้ 0 ตาม backend (เดิม offline hardcode 10 = บั๊กความไม่สม่ำเสมอ) — ผู้ใช้ตั้งค่าเองผ่านฟอร์ม; user อนุมัติ default = 0 แล้ว |
| callers อื่นของ `adjustStock` | `products/index.vue:235`, `ProductBulkAddModal.vue:294`, `ProductImportExportModal.vue:202` — ไม่ส่ง threshold → พฤติกรรมเดิม (สร้างแถวใหม่ด้วย 0 ทั้ง online/offline) |
| ของแถมที่ไม่ต้องทำ (YAGNI) | ปุ่ม inline-edit threshold ในตาราง inventory, ตั้ง threshold ตอนสร้าง product ใหม่นอก modal ปรับสต็อก |
