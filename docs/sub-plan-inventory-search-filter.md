# ค้นหา + กรองสถานะในหน้า Stock — UI-only, ข้อมูลจาก Dexie อยู่แล้วไม่ต้องแตะ backend

Branch: `feat/inventory-search-filter` (แตกจาก `develop`)

## ผลการตัดสินใจ
อนุมัติ **B** — search + filter สถานะ + filter หมวดหมู่สินค้า

## Business Goals
- คนคลังสินค้าหาสินค้าชื่อ/SKU เจอเร็ว ไม่ต้อง scroll โต๊ะละหลายร้อยรายการ
- กรองดูเฉพาะของใกล้หมด / ของหมด ได้ทันที (ต่อยอด low-stock alert ที่มีอยู่)

## ข้อขัดกับกฎ repo
ไม่มี — frontend ล้วน, ไม่แตะ schema / Dexie / sync / API

## Phase 1: ค้นหา + กรองในหน้า inventory
### ตัวช่วยกรอง (lib)
- [x] เพิ่ม `stockStatusOf(quantity, threshold): "out" | "low" | "ok"` ใน `frontend/app/lib/stock.ts` + `stockStatusLabel` (`useLabels.ts`) เรียกใช้แทน if-chain เดิม แล้ว
### UI (`frontend/app/pages/inventory/index.vue`)
- [x] เพิ่ม search box (ชื่อ/SKU, ไม่สนตัวพิมพ์) — filter ใน computed `filteredInventory` ตัวใหม่ (แยกจาก `inventoryWithProducts` ที่ join product/category)
- [x] เพิ่ม dropdown กรองสถานะ: ทั้งหมด / inStock / lowStock / outOfStock ใช้ `stockStatusOf`
- [x] เพิ่ม dropdown กรองหมวดหมู่ (ดึง `categories`/`fetchCategories` จาก `useProducts` ที่มีอยู่แล้ว, เทียบ `product.category`)
- [x] เพิ่ม `stock.searchPlaceholder` / `stock.allStatuses` / `stock.allCategories` / `stock.noResults` ใน `frontend/i18n/locales/th.json` และ `en.json` (option สถานะใช้ key `stock.inStock|lowStock|outOfStock` เดิม)
- [x] ปรับ empty state: noData (ไม่มีข้อมูลเลย) กับ noResults (ตัวกรองทำให้ว่าง) แยกกัน
- [x] (แก้ตาม user) จัด filter bar ให้เป็น pattern เดียวกับหน้าสินค้า — toolbar เหนือตาราง (`grid sm:grid-cols-[minmax(0,1fr)_auto]`), search box + pill รวม 2 select (status | divider | category) แบบ `products/index.vue:439-471`, และ `UiMobileDataList table-from="lg"`

## Phase 2: Review & Quality Assurance
- [x] เพิ่ม assert ของ `stockStatusOf` (ขอบ 0 / = threshold / < threshold) ใน `frontend/tests/lib/stock.test.ts` — `bun run test tests/lib` = 17 ผ่าน
- [x] `bun run typecheck` ใน `frontend/` — error เท่า baseline เดิม (admin/stores + sync-engine.test pre-existing) ไม่มี error ใหม่จากไฟล์ที่แก้
- [ ] manual บน `task local`: ค้นหา + กรองทำงานทั้ง table และ mobile card view (รอ user ตรวจ)

## ข้อตัดสินใจ (ต้องตอบก่อน implement)
- **A (แนะนำ, diff น้อยสุด)** — search (ชื่อ/SKU) + filter สถานะ อย่างเดียว ตาม requirement ที่ระบุมาตรง ๆ
- **B** — เพิ่ม filter หมวดหมู่สินค้าด้วย (product มี `category` อยู่แล้ว แต่หน้า inventory ยังไม่ได้ join category → ต้องเพิ่ม state + option list)

## Appendix: สิ่งที่สำรวจแล้ว
| ประเด็น | ข้อเท็จจริงในโค้ด |
| --- | --- |
| แหล่งข้อมูล | `inventoryItems` จาก `useInventory` อ่าน Dexie/local แล้ว join `products` ใน computed (`inventory/index.vue:217-226`) → search/filter ทำ client-side ได้เลย ไม่ต้องมี endpoint |
| pattern ที่ใช้ซ้ำได้ | search+category filter แบบ computed ใน `products/index.vue:19,124-138,443` |
| ตรรกะสถานะ | มีที่เดียว `useLabels.ts:38-41` (out: q<=0, low: q<=threshold, in: อื่น) — badge สีอยู่ `statusColors.ts:23` |
| mobile view | `UiMobileDataList` รับ slot table/cards — filter ที่ computed ตัวเดียวครอบคลุมสอง view |
