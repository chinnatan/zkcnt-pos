# ช่วงเวลา "7 วันย้อนหลัง" ในหน้ารายงาน — แก้ presets ปฏิทินสัปดาห์ที่ใช้กับงานออกบูธไม่ได้

Branch: `fix/reports-last7-period` (แตกจาก `develop` แล้ว)

## Business Goals
- คนออกบูธ ศ–อา ดูยอดขาย "ต่อเนื่อง 7 วันล่าสุด" ได้ในคลิกเดียว ไม่ต้องคำนวณวันเอง
- เลิกใช้ preset ที่ทำให้ข้อมูลว่างเพราะถูกตัดด้วยขอบสัปดาห์จันทร์–อาทิตย์
- งบ compare-growth ยังเทียบช่วงยาวเท่ากัน (7 วัน vs 7 วันก่อนหน้า) ได้อยู่

## ข้อขัดกับกฎ repo
ไม่มี — เป็น UI-only (frontend) + แก้ type union ฝั่ง backend, ไม่แตะ schema/Dexie/sync

## ผลการตัดสินใจ
อนุมัติ **A** — เพิ่ม `last7` คง `สัปดาห์นี้` ไว้ เปลี่ยน default ของหน้ารายงานเป็น `last7`

## Phase 1: preset `last7` (frontend)
### ช่วงเวลา
- [x] เพิ่ม `"last7"` ใน `ReportPeriod` (`frontend/app/lib/types/reports.ts:1`)
- [x] `getPeriodRange` case `last7` = `now` ย้อน 6 วัน (รวมวันนี้) ที่ Bangkok start-of-day → `until = now` (`frontend/app/lib/reports/aggregate.ts:44-72`)
### UI
- [x] เพิ่ม option `last7` ใน dropdown ก่อน `week` (`frontend/app/pages/reports/index.vue:15-18`)
- [x] เพิ่ม `reportsPage.last7Days` ใน `frontend/i18n/locales/th.json` + `en.json` (แถว 336)
- [x] ตั้ง default `period` ของหน้ารายงานเป็น `last7` ใน `useReports` (`frontend/app/composables/useReports.ts:39`) — ตัดสินใจตาม A/B ข้างล่าง
### Backend (แค่ type ให้ตรง contract)
- [x] เพิ่ม `"last7"` ใน union ของ `period` query 2 จุดใน `backend/src/routes/reports.ts:26,50` และ signature ใน `backend/src/lib/reports.ts:132` (`buildTimeSeries` ไม่ต้องแก้ — โหนดิฟอลต์ bucket รายวันอยู่แล้ว)

## Phase 2: Proof
- [x] (ไม่มีเทสต์ backend ที่แตะ reports) เพิ่ม `frontend/tests/lib/reportsPeriod.test.ts` แทน — ผ่าน + `cd frontend && bun test tests/unit` (scope ที่แตะ)
- [x] `bun run typecheck` ทั้ง `frontend/` และ `backend/`
- [ ] manual บน `task local`: ศ–อา ของสัปดาห์ก่อนต้องมีข้อมูลรวมบนหน้าจอ `last7` (รอ user ตรวจ)

หมายเหตุ typecheck: frontend 11 error / backend 8 error เท่ากันทั้งก่อนและหลังแก้ (pre-existing บน develop ไม่เกี่ยวกับ scope นี้) และ `bun run test tests/lib tests/unit` = 27 ผ่าน

## ข้อตัดสินใจ (ต้องตอบก่อน implement)
- **A (แนะนำ, diff น้อยสุด)** — เพิ่ม `last7` และเปลี่ยน default เป็น `last7`, คง `สัปดาห์นี้` ไว้สำหรับคนที่ต้องการปฏิทินสัปดาห์
- **B** — แทนที่ `สัปดาห์นี้` ด้วย `7 วันย้อนหลัง` เลย (dropdown สั้นลง, ใครต้องการปฏิทินสัปดาห์ใช้กำหนดช่วงเอง)

## Appendix: สิ่งที่สำรวจแล้ว
| ประเด็น | ข้อเท็จจริงในโค้ด |
| --- | --- |
| สัปดาห์เริ่มวันอะไร | **จันทร์** — `frontend/app/lib/timezone.ts:70-75` (`dayOfWeek === 0 ? 6 : dayOfWeek - 1` คือถอยจากอาทิตย์กลับไปจันทร์) อาทิตย์ถือเป็นวันสุดท้ายของสัปดาห์เดียวกัน |
| ขอบเขต "สัปดาห์นี้" | จ. 00:00 (Bangkok) → `now`, ถ้ากดวัน Mon/Tues จะเหลือหน้าต่าง 1–2 วันเท่านั้น → นี่น่าจะเป็นสาเหตุที่หน้าจอออกมาเป็น 0.00 (ไม่ใช่ error) |
| เปรียบเทียบช่วงก่อนหน้า | คิดจาก `duration` ล้วน ๆ ไม่ผูกกับปฏิทิน (`aggregate.ts:74-81`) → ใช้กับ `last7` ได้ทันที |
| custom range เดิม | ตอน mount ก็ preset เป็น 7 วันล่าสุดอยู่แล้ว (`reports/index.vue:1031-1037`) = สัญญาณว่าผู้ใช้ต้องการ rolling 7 days |
| backend | รับ `since`/`until` เป็นตัวกรองจริง, `period` ใช้เลือก granularity ของกราฟเท่านั้น (`backend/src/lib/reports.ts:625-628`) → ไม่ต้อง migrate / ไม่แตะ SQL |
