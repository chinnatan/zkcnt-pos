# ยอดขาย Dashboard กับ Reports ไม่ตรงกัน — แก้การคำนวณ todaySales ที่ถูกตัดด้วย limit 10

Branch: `fix/dashboard-report-sales-mismatch` (แตกจาก `develop` แล้ว)

## สรุปสาเหตุ (Phase 0 investigation)

### สาเหตุหลัก — Dashboard นับยอดขายจากออร์เดอร์แค่ 10 รายการล่าสุด

`frontend/app/pages/index.vue:228-235`:

```ts
await fetchOrders(10);            // ดึงแค่ 10 รายการล่าสุด (API ?limit=10 / Dexie slice)
const todayOrders = orders.value.filter(
  (o) => getBangkokDateKey(o.created) === today && o.status === "completed",
);
todaySales.value = todayOrders.reduce((sum, o) => sum + o.total, 0);
```

ฝั่ง Reports aggregate ทุกออร์เดอร์ในช่วง (backend SQL ไม่มี limit ที่ `backend/src/lib/reports.ts:248`, offline scan Dexie ทั้งตาราง) → **ร้านที่ขายเกิน 10 ออร์เดอร์/วัน Dashboard จะแสดงต่ำกว่า Reports เสมอ และยิ่งขายดียิ่งห่าง**

### สาเหตุรอง — คนละ source of truth

`fetchOrders` ตอน online ทับ `orders.value` ด้วยผลลัพธ์จาก API (`useOrders.ts:169`) ทำให้ออร์เดอร์ offline ที่ยังค้างใน syncQueue (`temp_*` ใน Dexie แต่ยังไม่ขึ้น server) หายไปจากตัวเลข Dashboard — ขัด invariant "อ่านจาก Dexie เสมอ" ใน AGENTS.md

### จุดที่ *ไม่ใช่* สาเหตุ (ตรวจแล้วตรงกัน)

- status filter: ทั้งสองฝั่งนับเฉพาะ `completed` (`index.vue:232` = `reports.ts:205`)
- ขอบวัน: ทั้งสองฝั่งใช้ Asia/Bangkok (`getBangkokDateKey` vs `getBangkokStartOfDay` → ISO)

## Edge cases ที่วิเคราะห์แล้ว

| # | สถานการณ์ | ผลปัจจุบัน | หลังแก้ |
| --- | --- | --- | --- |
| 1 | วันนี้มี >10 ออร์เดอร์ | Dashboard ต่ำกว่าจริง | ตรง (นับทุกออร์เดอร์ของวัน) |
| 2 | 10 รายการล่าสุดมีย้อนวัน/voided/refunded มาเบียดช่อง | todaySales หายเพิ่ม | ไม่เกี่ยวแล้ว (query ตรงขอบวัน) |
| 3 | ออร์เดอร์ offline ยังไม่ sync | online reports (server) ไม่มี แต่ Dexie มี → Dashboard(ใหม่)กับ Reports online ไม่ตรงชั่วคราว | ยังต่างตาม design ของ sync — ระบุ limitation ใน plan, ไม่แก้ scope นี้ |
| 4 | server เขียน `created` เป็นค่าใหม่ตอน sync (clock skew) | ออร์เดอร์อาจย้ายวันหลัง sync | พฤติกรรมเดียวกับ Reports — ยอมรับ, record-level |
| 5 | clock รายอุปกรณ์เพี้ยนช่วงใกล้เที่ยงคืน | เข้าวันนี้/วันผิด — เหมือนกันทุกหน้า | ไม่ worse ขึ้น |
| 6 | `generateOrderNumber` ใช้วันที่ UTC (`useOrders.ts:400`) | เลขออร์เดอร์แสดงวันก่อนหน้าช่วง 00:00–07:00 | cosmetic — ไม่แตะ (YAGNI) |

## Business Goals

- ตัวเลข "ยอดขายวันนี้" บน Dashboard เท่ากับ Reports ตอนเลือกช่วง "วันนี้" ทุกกรณี (ยกเว้น case 3 ชั่วคราวก่อน sync)
- Dashboard อ่านยอดรวมจาก Dexie ตาม invariant offline-first ไม่ต้องพึ่ง pagination ของ API list

## Phase 1: แก้ todaySales/todayOrderCount (frontend only)

### การคำนวณใหม่
- [x] extract เป็น helper `getTodayStats(storeId, now?)` ในไฟล์ใหม่ `frontend/app/lib/dashboard.ts` — query `db.orders.where("[store+status]").equals([storeId,"completed"])` แล้วกรอง `created` ในช่วง `[getBangkokStartOfDay(now), +24h)` (เทียบ ISO string ปลอดภัยเพราะทุกค่ามาจาก `toISOString()`) — หน้า `index.vue` เรียกแทน filter เดิม และลบ `getBangkokDateKey` ที่ไม่ได้ใช้แล้ว
- [x] คง `fetchOrders(10)` ไว้เฉพาะตาราง "ออร์เดอร์ล่าสุด" — เรียกก่อน `getTodayStats` เพื่อให้ API record ใหม่เข้า Dexie ก่อน sum (นับรวม temp order ที่ยังไม่ sync ด้วย)

### เทสต์
- [x] `frontend/tests/lib/dashboard.test.ts` (vitest + fake-indexeddb ตาม setup เดิม): 15 ออร์เดอร์ของวัน → นับครบทุกตัว; กรณีย้อนวัน/voided/refunded/ต่าง store → ไม่ถูกนับ — 2 ผ่าน

## Phase 2: Review & Quality Assurance
- [x] `bun run test tests/lib tests/unit` = 29 ผ่าน; `bun run typecheck` = 11 error เท่า baseline develop (pre-existing ใน `admin/stores/[id].vue` + `sync-engine.test.ts` ไม่เกี่ยวกับ scope)
- [ ] manual บน `task local`: ขาย >10 ออร์เดอร์เทียบ Dashboard vs Reports period "today" ให้ตรงกัน (รอ user ตรวจ)

## Appendix: ผลสำรวจ

| ประเด็น | ข้อเท็จจริง |
| --- | --- |
| Reports online | `GET /stores/:id/reports` → `buildStoreReports` sum ทุก completed order ในช่วง ISO (`backend/src/lib/reports.ts:138-145,205,248`) |
| Reports offline | `loadLocalReports` scan `db.orders` ทั้ง store ผ่าน `aggregateReports` (`useReports.ts:65-146`) |
| Reports default | `period = "last7"` (`useReports.ts:39`) — ผู้ใช้เทียบ "วันนี้" ต้องเลือก preset today เอง; Dashboard ไม่มี preset |
| Dexie indexes | `orders: 'id, store, [store+status], client_id, order_number, cashier, created'` — เพียงพอสำหรับ query ใหม่ ไม่ต้องแตะ schema |
| ผลกระทบไฟล์อื่น | ไม่มีหน้าอื่นใช้ pattern "sum จาก fetchOrders slice" (grep แล้ว) |
