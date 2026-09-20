# D1 Backup จริง — แก้ marker placeholder ที่ rollback ไม่ได้ว่าทั้งตัว

Branch: ยังไม่แตก — **เลื่อน (2026-09-20): user ตัดสินใจไม่ทำ เพราะ D1 มี restore/automatic backup ของ Cloudflare ให้ใช้อยู่แล้ว** (Time Travel ผ่าน dashboard/wrangler) — ไฟล์ placeholder ใน R2 ยัง rollback ไม่ได้จริงหากเกิน window ของ Time Travel ค่อยรื้อแผนนี้

## Business Goals

- ไฟล์ `backups/d1-*.sql` ใน R2 ต้องเป็น SQL dump จริงที่ `wrangler d1 execute --file` restore กลับได้
- rollback schema/data ได้จริงหลัง auto-migrate (ต่อจาก `sub-plan-auto-deploy.md` Phase 4 ที่อ้าง "เชื่อ cron backup" — ซึ่งตอนนี้อ้างไม่ได้ เพราะ backup ไม่มีอยู่จริง)
- หน้า admin (`ops.backup_last_run`) แสดงสถานะจาก backup จริง ไม่ใช่ placeholder

## ข้อเท็จจริงที่สำรวจแล้ว (Phase 0)

- `backend/src/cron.ts:34-63` — `backupD1ToR2()` อ่านแค่ `sqlite_master` แล้วเขียน **JSON placeholder** (นับจำนวนตาราง 22) ลงคีย์ `.sql` → ** rollback ไม่ได้จริงตามที่สงสัย** ตัว note ในไฟล์ก็ยอมรับเอง ("use wrangler d1 export for full backup")
- D1 ไม่สามารถ dump ตัวเองจาก inside Worker ได้ครบถ้วน (no `VACUUM`, no file output) → ของจริงต้องรันผ่าน **wrangler / CF REST API** ภายนอก
- `.github/workflows/deploy.yml` มี `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` อยู่แล้ว → workflow ใหม่เอา secrets ชุดเดิมมาใช้ได้ ไม่ต้องขอ token เพิ่ม
- README (rows 222-234) เขียนวิธี manual export/restore ไว้แล้ว แต่ไม่มีใครรันอัตโนมัติ
- `wrangler d1 export zkcnt-pos --remote --output=backup.sql` ยืนยันมีจริงใน wrangler เวอร์ชันที่ repo ใช้

## Phase 1: Backup อัตโนมัติด้วย GitHub Actions

### Workflow ใหม่ `.github/workflows/d1-backup.yml`
- [ ] trigger: `schedule` (cron ราว 01:30 UTC หลัง cron marker เดิม) + `workflow_dispatch` ไว้ซ้อมมือ
- [ ] step checkout + setup bun → `bunx wrangler d1 export zkcnt-pos --remote --output=backup.sql`
- [ ] step upload: `wrangler r2 object put zkcnt-pos-uploads/backups/d1-YYYY-MM-DD.sql --file=backup.sql --content-type text/plain`
- [ ] verify step: grep ว่าไฟล์มี `INSERT INTO` ก่อน upload (กัน export เปล่าผ่านเงียบ ๆ)

### Retention
- [ ] ตั้ง R2 lifecycle rule บน prefix `backups/` (เก็บ ~30 วัน) ผ่าน dashboard/wrangler — ไม่เขียนโค้ด delete เอง

## Phase 2: แก้ cron.ts ให้รายงานความจริง

- [ ] ลบการเขียน payload placeholder ใน `backupD1ToR2()` → เปลี่ยนเป็น `UPLOADS.head(key)` ตรวจว่า backup จริงของวันนี้มีหรือยัง แล้วค่อย set `cron.backup.last_run` (frontend/admin ไม่ต้องแก้ เพราะอ่าน key เดิม)
- [ ] ถ้าไฟล์ยังไม่อยู่ ให้ logger.warn ว่า backup ยังมาไม่ถึง (Actions ค้าง/พัง)

## Phase 3: Restore drill + เอกสาร

- [ ] โหลดไฟล์จริงจาก R2 แล้วรัน restore ลง **local D1** (`wrangler d1 execute --local --file=...`) เทียบ row count ตารางหลัก (stores, orders, order_items) ว่าตรงกัน
- [ ] อัปเดต README ส่วน Maintenance: backup เป็น GHA schedule, cron Worker เหลือแค่ status check, คำสั่ง restore ที่ test แล้ว
- [ ] แก้หมายเหตุใน `sub-plan-auto-deploy.md` Phase 4 (safety net ที่อ้างไว้ตอนนี้มีจริงแล้ว)

## Phase 4: Review & Quality Assurance

- [ ] รัน `workflow_dispatch` หนึ่งรอบ → ไฟล์ใน R2 เปิดแล้วเป็น SQL จริง (ขึ้นต้นด้วย BEGIN/CREATE/INSERT)
- [ ] `bun run typecheck` + `bun test` ใน `backend/` เฉพาะ scope cron.ts ที่แก้
- [ ] ติ๊กไฟล์นี้ตามผลจริงก่อนปิดงาน

## ข้อตัดสินใจ (ต้องตอบก่อนทำ Phase 1)

- **ตัวรัน export**: **A (แนะนำ)** — GitHub Actions schedule (secrets มีครบ, ไม่ต้องแตะ Worker) / **B** — Worker cron เรียก CF REST `POST /accounts/.../d1/.../backup` เอง (ต้อง put API token เป็น Worker secret เพิ่ม + โค้ดยุ่งยากกว่า)
- **Retention**: 30 วันพอไหม หรือต้องการเก็บยาวกว่านั้น (monthly snapshot แยก)
- **ขอบเขต**: ทำเฉพาะ D1 หรือให้ GHA workflow นี้ export ทั้ง schema+data ตามเดิม (ค่า default ของ `d1 export` คือเต็ม — แนะนำคง default)

## Appendix: ผลสำรวจทางเลือกอื่น

| ทางเลือก | สรุป |
| --- | --- |
| D1 Time Travel (native) | restore ณ เวลาอดีตได้แต่ retention สั้นตาม plan (≤7 วัน) — เป็น safety net เสริม ไม่ใช่ backup ลง R2 |
| ดump ข้อมูลเองใน Worker (SELECT ทีละตาราง → INSERT script) | ชน D1 read limits/CPU, โค้ดเยอะ เปราะ — ไม่คุ้ม |
| `wrangler d1 backups` (automatic) | ไม่มีคำสั่งนี้ใน wrangler ที่ repo ใช้; D1 ไม่ auto-ลง R2 ให้ |
| CF REST API backup (ทางเลือก B) | ต้องทำเพิ่มตามตาราง "ทางเลือก B ต้องใช้อะไรบ้าง" — ทำงานได้แต่แพงค่าดูแลกว่า A ชัดเจน |

### ทางเลือก B ต้องใช้อะไรบ้าง (ถ้าเลือก B)

| รายการ | รายละเอียด |
| --- | --- |
| Secret ใหม่ | scoped API token (`D1:Edit`) → `wrangler secret put CF_API_TOKEN` + `.dev.vars` สำหรับ local test |
| Config เพิ่ม | `CLOUDFLARE_ACCOUNT_ID` ใน wrangler.toml (DB UUID ไม่ต้องใส่ — อ่านจาก `env.DB.databaseId` ได้) |
| โค้ดใน cron.ts | `POST /accounts/:acct/d1/database/:uuid/backup` → poll สถานะ completed → `GET .../backup/:id/download` → stream ลง `UPLOADS.put` (~40-60 บรรทัด + retry/error handling) |
| ข้อจำกัด plan | ต้อง Workers Paid — cron free plan มี CPU 5ms ไม่พอ stream ไฟล์ |
| รูปแบบไฟล์ที่ได้ | เป็น **.sqlite binary** ไม่ใช่ .sql text → restore local คือ swap ไฟล์, restore remote ต้องผ่าน dashboard/time travel หรือ `sqlite3 .dump` แปลงก่อน |
| Testing | mock fetch ของ CF API เพิ่ม + failure mode ใหม่ (token หมดอายุ, API เปลี่ยน) |
| จุดแข็งเดียวของ B | ทุกอย่างจบใน Worker ไม่ต้องพึ่ง GHA schedule (ที่อาจดีเลย์ 15-60 นาทีช่วง peak) |

