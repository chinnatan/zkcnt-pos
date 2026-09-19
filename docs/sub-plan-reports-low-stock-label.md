# ของหมดแต่โชว์ "ใกล้หมด" ในการ์ด Reports — แก้การสื่อสาร out vs low ที่ชั้น UI

Branch: `fix/reports-low-stock-label` (แตกจาก `develop` เมื่อ plan อนุมัติ)

## สรุปสาเหตุ (Phase 0 investigation)

- ตัวกรอง `lowStock` ฝั่งข้อมูลใช้ `quantity <= threshold` ทั้ง backend (`backend/src/lib/reports.ts:500`) และ offline aggregate (`frontend/app/lib/reports/aggregate.ts:587`) → รายการ **ของหมด (quantity = 0) ติดมาในลิสต์ "ใกล้หมด" ด้วย** เช่น "0 / 0" (threshold=0) และ "ขาย 1 · เหลือ 0"
- ตัว template (`frontend/app/pages/reports/index.vue:815-845`) ไม่แยกกลุ่ม — ทิ้งทุกแถวเป็น warning "ใกล้หมด" ทั้งหมด = ปัญหาการสื่อสารชั้น UI ไม่ใช่ข้อมูล
- แยก helper มาตรฐานมีอยู่แล้วและถูกต้อง: `stockStatusOf()` ใน `frontend/app/lib/stock.ts:12` แยก `out` (qty<=0) / `low` / `ok` — หน้า inventory ใช้ผ่าน `stockStatusLabel` (`useLabels.ts:40`, key `stock.outOfStock` = "หมดสต็อก") มีเทสต์ที่ `frontend/tests/lib/stock.test.ts` แล้ว

**ข้อสรุป: ไม่แตะ schema / API / migration / sync contract** — แก้ที่ `reports/index.vue` + i18n อย่างเดียว

## Business Goals

- สินค้าที่ quantity = 0 ต้องแสดงเป็น "หมด" ( danger ) ไม่ใช่ "ใกล้หมด" ในการ์ด Reports ทั้งสองกลุ่ม (รายการปกติ + ขายดี)
- "ใกล้หมด" (warning) เหลือเฉพาะรายการ `0 < quantity <= threshold`
- ครบสองภาษา th/en โดยไม่เปลี่ยน contract ข้อมูล

## Phase 1: การ์ด Reports — รวมเป็นลิสต์เดียวพร้อม status badge (frontend only)

> Iteration 2 (จาก feedback user): การแยก 2 หัวกลุ่ม "หมดสต็อก/ใกล้หมด" + เซกชัน "ขายดีแต่หมด/ใกล้หมด" ทำให้สินค้าซ้ำปรากฏ 2 ที่ ยังงงอยู่ → รวมเป็น **ลิสต์เดียว** แต่ละแถวมี badge สถานะ (复用 `stockQuantityBadge` + `stockStatusLabel`) ยอดขายช่วงแสดงเป็น sub-caption "ขายไปแล้ว N ชิ้นในช่วงนี้" และลบเซกชันขายดี/คีย์ i18n ที่ไม่ใช้แล้ว

### การ์ด "สินค้าหมด/ใกล้หมด"

- [x] อ่าน `.cursor/rules/vue-components.mdc` ก่อนแก้ template
- [x] `reports/index.vue` — `lowStockRows` computed รวม `data.lowStock` + qtySold จาก `lowStockFastMovers` (map ตาม productId) และ flag `out` จาก `stockStatusOf`; template เป็นลิสต์เดียว: แถว out = `bg-danger-50` + badge "หมดสต็อก", แถว low = warning bg + badge "สต็อกใกล้หมด" + `qty / threshold`
- [x] h3 การ์ด = `reportsPage.lowStockCard` "สินค้าหมด/ใกล้หมด" (en "Out of Stock & Low Stock"); ลบเซกชัน `fastMoversLowStock` และคีย์ `reportsPage.lowStock`, `fastMoversLowStock`, `soldAndStock`, `soldAndOut` ออกจาก th/en (grep ยืนยันไม่มีที่อื่นใช้); เพิ่ม `soldDuringPeriod`; data layer (`lowStockFastMovers` ใน backend/aggregate/useReports) ไม่แตะ
- [x] banner `stock.lowStockAlert` หน้า inventory — **สรุป: ไม่แก้** (user ตัดสินใจคงข้อความเดิม นับรวมของหมด)

## Phase 2: Review & Quality Assurance

- [x] `bun run typecheck` = 11 error เท่า baseline develop (pre-existing: `admin/stores/[id].vue` + `sync-engine.test.ts` — ไม่มี error ใน scope); `bun run test tests/lib` = 17 ผ่าน (มี `stockStatusOf` test ครอบคลุม helper อยู่แล้ว ไม่เพิ่ม suite สำหรับ template)
- [x] manual บน `task local`: ยืนยันกับข้อมูลจริงแล้ว — badge "หมดสต็อก" แสดงถูกไม่มีซ้ำ/ไม่มี "0 / 0" และตัวเลขขาย 10 ชิ้นตรงกับ DB (ชาไทย 4+3+2+1 วันนี้) ไม่ใช่บั๊ก filter

## Appendix: ผลสำรวจ

| ประเด็น | ข้อเท็จจริง |
| --- | --- |
| ข้อมูล `lowStock` | = out ∪ low ตามดีไซน์ (attention list) — sorting asc ด้วย quantity แล้วของหมดอยู่บนสุด; ไม่แก้ semantics ฝั่ง backend/aggregate ให้ตรงกันสองระบบไว้แล้ว |
| แถบ "0 / 0" ใน screenshot | สินค้า threshold=0, qty=0 → `0 <= 0` ติดลิสต์; หลังแก้จะไปอยู่กลุ่ม "หมด" |
| หน้าอื่นที่มี pattern เดียวกัน | `useInventory.lowStockItems` (banner หน้านี้ + ที่ใช้ร่วม) — รวมไว้ในโฟกัสให้ user ตัดสิน |
| ไฟล์กระทบ | `frontend/app/pages/reports/index.vue`, `i18n/locales/th.json`, `i18n/locales/en.json` (+ `inventory/index.vue`, `stock.json keys` เฉพาะถ้ายอมรับโฟกัส) |
| สิ่งที่ไม่แตะ | API, Dexie, sync, migration, `shared/test-fixtures` |
