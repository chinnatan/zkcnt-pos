# แก้บั๊กเลือกสินค้าในบูธ — checkbox ทั้งหมด/ล้าง/เลือกในสต๊อก ไม่ตรงกับข้อมูลจริง

Branch: `fix/booth-picker-selection`

## Business Goals
- checkbox ของสินค้า/หมวด และปุ่ม "เลือกทั้งหมด / ล้าง / เลือกที่มีสต๊อก" ตรงกับข้อมูลจริงเสมอ
- ตัวนับ ("เลือกแล้ว N", `x/y` ต่อหมวด) ตรงกับรายการที่เห็น; แถวของสินค้าที่ปิดใช้งาน/ลบไม่นับและไม่แสดง (เก็บแถวไว้ในข้อมูล)
- bulk ที่ล้มเหลวบางรายการต้องแจ้งผู้ใช้ และ UI กลับมาตรงข้อมูลจริง
- ออฟไลน์แล้วซิงก์กลับ สินค้าไม่หาย/ซ้ำ/เด้งกลับ
- "เลือกที่มีสต๊อก" ไม่รวมสินค้าที่ไม่ติดตามสต๊อก (คงเดิม)

## Phase 1: Reproduce ด้วยเทสต์ (ก่อนแก้)
### Pure logic
- [x] สร้าง branch `fix/booth-picker-selection`
- [x] เทสต์สินค้าที่หมวดไม่อยู่ใน `categories` ต้องแสดงในกลุ่ม "ไม่มีหมวด"
- [x] เทสต์ตัวนับต้องนับเฉพาะแถวที่ตรงกับสินค้าที่แสดงอยู่
- [x] fixture ~60 สินค้าหลายหมวด + หมวดถูกลบ + สินค้าปิดใช้งาน + ไม่ติดตามสต๊อก
### Component / composable
- [x] component test: checkbox กลับตรงข้อมูลหลัง bulk ล้มเหลว/ไม่มีงานให้ทำ; bulk สำเร็จ/ล้มเหลวกลางทาง/กดซ้ำเร็ว
- [x] เทสต์ `useBooths`: remove แล้ว add ซ้ำตอนออฟไลน์; fetch ตอนมีรายการค้างใน `syncQueue`

## Phase 2: แก้ตัว picker
- [x] `groupByCategory`: สินค้าที่อ้างหมวดไม่มีอยู่ไปกลุ่ม "ไม่มีหมวด"
- [x] ตัวนับ "เลือกแล้ว N" นับเฉพาะสินค้าที่ยังใช้งานอยู่
- [x] checkbox sync ค่า DOM กลับจากข้อมูลหลัง bulk จบ
- [x] `runBulk`: catch, ทำต่อให้ครบ, นับที่ล้มเหลวแล้วแจ้งผู้ใช้ (i18n th/en)
- [x] กัน `reloadRows` ซ้อนกัน (ทิ้งผลรอบเก่า)
- [x] กัน `selected.get(id)!` เป็น undefined ใน `setAllQty`/`setQty`
- [x] disable "เลือกที่มีสต๊อก" เมื่อไม่มีรายการเข้าเงื่อนไข

## Phase 3: ข้อมูลออฟไลน์ (เฉพาะที่เทสต์พิสูจน์ว่าเป็นจริง)
- [x] `listBoothProducts` เก็บแถวที่รอซิงก์ใน `syncQueue` แทนการลบทั้งบูธ
- [x] `addBoothProduct` ใช้ id เดิมของแถวที่เคยลบ (รวม soft-deleted)

## Phase 4: E2E
- [x] เลือกทั้งหมด → ล้าง → ตัวนับ 0; indeterminate ของหมวด; กรอง + ค้นหา + เลือกทั้งหมด

## Phase 5: Review & Quality Assurance
- [x] `bun run typecheck` + `task test` เฉพาะ scope บูธ; `task test:e2e` spec บูธ
- [x] อัปเดต plan นี้พร้อมบันทึกผล

## บันทึกผล
- **ยืนยันบั๊กด้วยเทสต์ก่อนแก้:** สินค้า 60 ชิ้นแสดงแค่ 40 (หมวดที่ถูกลบทำให้สินค้าหายจากรายการ แต่ปุ่ม "เลือกทั้งหมด" ยังนับรวม), bulk หยุดทันทีที่ error แรก (unhandled rejection), checkbox ค้างค่าที่ DOM เปลี่ยนเอง, ออฟไลน์ remove→add ได้ id ใหม่ไม่ตรง server, fetch ตอนออนไลน์ลบแถวที่ยังรอซิงก์ใน `syncQueue`
- **แก้แล้ว:** `groupByCategory` (หมวดไม่มี → กลุ่มไม่มีหมวด), `selectedCount`, `renderKey` สร้าง checkbox ใหม่จากข้อมูลหลัง bulk, `runBulk` ทำต่อเมื่อบางรายการล้มเหลวแล้วแจ้งผู้ใช้ (`boothsPage.bulkFailed`), `reloadRows` ทิ้งผลรอบเก่า, guard `selected.get(id)!`, ปุ่ม "เลือกที่มีสต๊อก" disable เมื่อไม่มีรายการเข้าเงื่อนไข, `listBoothProducts` เก็บแถวที่รอซิงก์, `addBoothProduct` ใช้ id เดิมของแถวที่ลบออฟไลน์ (เก็บ booth/product ไว้ใน data ของ queue delete — engine ไม่ได้ใช้ data ของ delete จึงไม่กระทบ)
- **ไม่ได้ทำ (ตามที่ตกลง):** "เลือกที่มีสต๊อก" ยังไม่รวมสินค้าที่ไม่ติดตามสต๊อก; ไม่แก้ backend/schema
- **ผลทดสอบ:** vitest frontend 92 ผ่านทั้งหมด, backend `booths.test.ts` 5 ผ่าน, E2E `booth-ux.spec.ts` 3 ผ่าน; `bun run typecheck` มี error เดิมใน `tests/integration/sync-engine.test.ts` (มีอยู่ก่อนงานนี้ ไม่เกี่ยวกับบูธ)
- **หมายเหตุ E2E ในเครื่อง:** `.env` ราก ตั้ง origin/API เป็น :4000/:4001 ทำให้ Playwright login ไม่ผ่านด้วย CORS ต้อง build ด้วย `NUXT_PUBLIC_API_URL=http://localhost:3001` และรัน backend ด้วย `ALLOWED_ORIGIN=http://localhost:3000`
