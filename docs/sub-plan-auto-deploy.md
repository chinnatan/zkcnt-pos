# Auto-deploy ผ่าน GitHub Actions — เชื่อม deploy.yml ที่เขียนรอไว้ให้ใช้งานได้จริง

Branch: ยังไม่แตก (งานส่วนใหญ่เป็น config + verification ไม่ใช่โค้ด)

## Business Goals

- merge เข้า `main` แล้วขึ้น production เอง (D1 migrate → Workers → Pages) โดยไม่ต้องรัน `task deploy:cloudflare` บนเครื่องใคร
- รู้สถานะ deploy ย้อนหลังได้ (Actions run log แทนการเดาว่าเครื่องไหน deploy ครั้งล่าสุด)
- migrate ออโต้ไม่พังข้อมูล production

## ข้อเท็จจริงที่สำรวจแล้ว (Phase 0)

- `.github/workflows/deploy.yml` **มีอยู่แล้วและครบ workflow** (มีมาตั้งแต่ commit `d898040`) — push `main` หรือ `workflow_dispatch` → test → `wrangler d1 migrations apply --remote` → `wrangler deploy` → build → `wrangler pages deploy`
- **โค้ดไม่ต้องเพิ่ม** — ที่ยังไม่ auto-deploy น่าจะเพราะ missing config ฝั่ง GitHub/Cloudflare มากกว่า
- ตัว workflow ต้องได้:
  - GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
  - GitHub Variable: `NUXT_PUBLIC_APP_URL` (rows 69) — ยังไม่ได้ set จะ build ต่อได้แต่ค่าจะเป็นว่าง
- `wrangler pages deploy --project-name=zkcnt-pos` **fail ถ้า Pages project ยังไม่เคยถูกสร้าง** (ไม่มี auto-create)
- prod domain จริง: `pos.zkcnt.com` — Workers route `/api/*` + `/uploads/*` (wrangler.toml) ส่วนที่เหลือต้องตกที่ Pages
- `main` ค้างอยู่ที่ 0.5.0, งานปัจจุบันอยู่บน `develop` → merge แล้วยิง deploy จริงทันที รวม D1 remote migrations ที่ค้างอยู่
- Cron backup D1 ที่ 01:00 UTC มีอยู่แล้ว (README Maintenance) = safety net ของ auto-migrate
- เครื่องนี้ไม่มี `gh` CLI → ตรวจ secrets/run history ผ่าน web UI แทน



## Phase 1: ตรวจสอบสถานะปัจจุบัน



### ฝั่ง GitHub (Settings → Secrets and variables → Actions)

- [x] ตรวจว่า `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` ถูก set หรือยัง
- [ ] ตรวจว่า repo variable `NUXT_PUBLIC_APP_URL` = `https://pos.zkcnt.com`
- [ ] ดู Actions tab ว่า deploy.yml เคย run / เคย fail ที่ step ไหนบ้าง



### ฝั่ง Cloudflare

- [x] ยืนยัน Pages project `zkcnt-pos` มีอยู่ +ผูก custom domain `pos.zkcnt.com`
- [x] ยืนยัน Workers `zkcnt-pos-api` + routes `/api/*`, `/uploads/*` active



## Phase 2: ตั้งค่าส่วนที่ขาด

- [x] สร้าง Cloudflare API Token (scoped) — permissions: `Workers Scripts: Edit`, `D1: Edit`, `Pages: Edit`, `Zone: Read` (สำหรับ zone `zkcnt.com`), Account ID ของบัญชี
- [x] set secrets/variable ใน GitHub ที่ขาดจาก Phase 1 — สาเหตุจริง: ตั้งเป็น Environment secret ของ `PRODUCTION` แต่ job ไม่เคยประกาศ `environment:` → secret ไม่ถูกส่ง (แก้ใน commit `2d7a81b`, ลบ job cf-check ใน `739a888`)
- [x] สร้าง Pages project ถ้ายังไม่มี: `wrangler pages project create zkcnt-pos --production-branch main`
- [ ] ทดลองรัน deploy.yml แบบ manual ผ่าน `workflow_dispatch` (branch `main`) → ผ่านครบทุก step



## Phase 3: ทดสอบ flow จริง (ใช้ครั้ง merge develop → main ถัดไป)

- [ ] ก่อน merge: รัน `task cf:db:migrate:local` ให้ migration suite ผ่านบน local ก่อน
- [ ] merge develop → main แล้วเฝ้า Actions run จน deploy job เขียว
- [ ] ตรวจ `pos.zkcnt.com` — แอปเวอร์ชันใหม่ขึ้น, `/api/*` ทำงาน, login ได้ (JWT_SECRET ไม่เปลี่ยนต้องหลุด)
- [ ] ตรวจ sidebar/About แสดง `APP_VERSION` + release notes ตรงกับ VERSION



## Phase 4: Safety hardening (เลือกก่อนทำ)

- [ ] ตัดสิน trigger: (A) push `main` อัตโนมัติเลย (สภาพปัจจุบัน) หรือ (B) เพิ่ม GitHub Environment `production` + required reviewer กัน merge พลาด
- [ ] (ถ้าเลือก A) พิจารณา backup D1 ก่อน auto-migrate: เพิ่ม step `wrangler d1 exports remote` ลง R2 หน้า migrate step
- [ ] (optional) pin เวอร์ชัน wrangler ใน workflow (`bunx wrangler@X`) กัน behavior เปลี่ยนเงียบ ๆ



## Phase 5: เอกสาร

- [ ] อัปเดต README ส่วน Deploy & CI/CD ให้ตรงความจริง (token permissions ที่ใช้, วิธี dispatch manual, ผลข้างเคียงของ merge → migrate)
- [ ] ติ๊กไฟล์นี้ตามผลจริงก่อนปิดงาน



## Phase 6: Review & Quality Assurance

- [ ] ยืนยัน Actions run ถัดไปที่ push `main` ทั้ง ci.yml และ deploy.yml ผ่าน
- [ ] ไม่มี code change ใน repo (ยกเว้นจะเลือกทำ Phase 4) → ไม่ต้องรัน typecheck/test



## ข้อตัดสินใจ (ต้องตอบก่อนทำ Phase 2–4)

- **Trigger**: **A (แนะนำ, diff ศูนย์)** — คง push `main` = deploy เลย เพราะ flow ปัจจุบัน merge ทีหลัง release + มี VERSION gate คุมจังหวะอยู่แล้ว / **B** — เพิ่ม environment approval (ตั้งค่าใน repo Settings อย่างเดียว ไม่แตะไฟล์)
- **Pre-migrate backup**: **A (แนะนำ)** — เชื่อ cron backup 01:00 UTC ที่มีอยู่ / **B** — เพิ่ม export step ก่อน migrate ทุก deploy (ช้าขึ้น ~1 นาที, ปลอดภัยกว่ากับ schema change)



## Appendix: ความเสี่ยงที่ควรรู้


| ประเด็น                   | รายละเอียด                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| merge = production        | ทุก push เข้า `main` รัน D1 remote migrations ก่อน deploy — migration ที่ revert ไม่ได้ (drop column) จะแรงกับข้อมูลจริง |
| JWT_SECRET                | อยู่ใน Workers secrets ไม่ใช่ workflow → auto-deploy ไม่แตะ แต่ `wrangler deploy` อย่างเดียวไม่ make secret หาย          |
| `--var` override          | workflow inject `APP_VERSION`/`BUILD_ID` ทับ `[vars]` ใน wrangler.toml (ที่ค้าง 0.1.0) — ตรงนี้ ok แล้ว                  |
| Pages + Workers ชน domain | ต้องให้ `/api/*`, `/uploads/*` เป็น Workers route ก่อน Pages fallback ไม่อย่างนั้น SPA จะกลืน path                       |


