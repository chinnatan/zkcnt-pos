# หน้า Products ขยายเต็มพื้นที่ — UI-only, ลบ wrapper ซ้ำที่ layout ทำให้อยู่แล้ว

Branch: `fix/products-full-width` (แตกจาก `develop` ก่อน implement)

## Business Goals

- หน้า Products แสดงเต็มความกว้าง/พื้นที่เนื้อหาเหมือนหน้าอื่น (Stock, Orders, Promotions) แทนที่จะถูกบังคับ center ในกรอบ `max-w-7xl`
- เลิก double padding — `layouts/default.vue:7` (`main` มี `p-4 lg:p-6` + `overflow-y-auto`) ทับกับ `px-4 py-6 sm:px-6 lg:px-8` ของตัวเอง

## ข้อขัดกับกฎ repo

ไม่มี — ลบ class/div ล้วน ไม่แตะ logic / data / i18n

## Phase 1: ลบ wrapper ใน `frontend/app/pages/products/index.vue`

- [x] ราก template (`:362-363`): แทน `<div class="min-h-screen bg-surface">` + `<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">` ด้วย `<div class="space-y-4">` เดียว ตาม pattern `inventory/index.vue:2`
- [x] ลบ `</div>` ที่ปิด container (`:750`, ก่อน `<!-- Product Modal -->`) — `</div>` รากท้ายไฟล์ (`:1083`) คงไว้เพราะ Teleport/modal/`ProductBulkAddModal` ต้องอยู่ใต้ root element เดียว
- [x] ตรวจ spacing ที่เหลือ (header `mb-6`, tabs `mb-6`) ไม่เพี้ยนหลังหลุด py-6 — margin collapse ของ `space-y-4` (mt-4) ทับ `mb-6` เหลือ 24px เท่าเดิม ไม่ต้องตัด mb-6 เพิ่ม



## Phase 1.5: (requirement เพิ่มเติม) การ์ดรายการบนมือถือชิดขอบเท่ากับส่วนอื่น

- [x] root cause อยู่ในระดับ component ที่ทุกหน้าใช้ร่วมกัน: `UiMobileDataList` ให้ `p-4` ซ้ำ padding ของ `main` ใน layout →การ์ดถูกหดซ้าย/ขวา 32px ขณะที่ header/search ใช้ 16px — แก้ `p-4` → `py-4` (`components/ui/MobileDataList.vue:7`) กระทบทุกหน้า (products, stock, orders, customers, reports, dashboard) ไปทางเดียวกัน ไม่แตะหน้า products เพิ่ม
- [x] ตรวจไม่มี test/e2e อ้าง class `p-4` ของ wrapper นี้



## Phase 2: Review & Quality Assurance

- [x] `bun run typecheck` ใน `frontend/` — error เท่า baseline เดิม (`admin/stores/[id].vue` + `sync-engine.test.ts` pre-existing) ไม่มี error ใหม่จากไฟล์ที่แก้; ไม่พบ test อ้างถึง `pages/products`
- [x] manual บน `task local`: เปิด `/products` จอ wide/mobile — user ตรวจจากหน้าจอจริงแล้วอนุมัติ (พบ padding การ์ดมือถือเกิน → แก้ต่อใน Phase 1.5)