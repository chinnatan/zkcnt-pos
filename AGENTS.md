# zKCNT POS

POS แบบ multi-tenant ที่ทำงาน offline เป็นหลัก Nuxt 3 SPA/PWA (`frontend/`) + Hono API (`backend/`) รันบน Cloudflare Workers/D1/R2 ใน production, Bun + SQLite ใน local ทุกอย่างเข้าผ่าน go-task

## กระบวนการทำงานหลัก (ฟีเจอร์, แก้บั๊ก, refactor)

ห้ามเขียนโค้ดทันที ทำ Phase 0 ก่อน แล้วรอ user อนุมัติ

**Phase 0 — สำรวจบริบท + planning checklist.** สำรวจโค้ดส่วนที่เกี่ยวข้องก่อน (อ่าน `.cursor/rules/*.mdc` ก่อนทำงาน UI) แล้วแตก requirement เป็น checklist เสนอให้ user อนุมัติก่อน implement:

```markdown
# [ชื่อฟีเจอร์] — [ขอบเขตสั้น ๆ หนึ่งบรรทัด]

## Business Goals
- [ผลลัพธ์ที่คาดหวัง — bullet ธรรมดา ห้ามใส่ checkbox]

## Phase 1: [workstream]
### [กลุ่มงานย่อย]
- [ ] [งานย่อยที่ทำได้จริง 1 ประโยค]

## Phase N: Review & Quality Assurance
- [ ] รัน `bun run typecheck` + `task test` เฉพาะ scope ที่แก้
```

กฎการเขียน checklist:
1. Phase จัดตาม workstream ของ requirement — ห้ามบังคับชั้น (backend/frontend/sync) ที่งานไม่ได้แตะ
2. `###` subsection = กลุ่มงานย่อยใน phase; เฉพาะงานที่เป็น entity/ฟีเจอร์ใหม่เต็มระบบ: ใช้ขั้นตอนใน "การเพิ่ม entity" ข้างล่างเป็น subsection ของ phase ที่เกี่ยว
3. `- [ ]` = งานที่ agent ทำจริงเท่านั้น 1 บรรทัด 1 action; ห้ามใส่ "วิเคราะห์ codebase" ซ้ำ (นั่นคือ Phase 0)
4. ผลจากการวิจัย (ตารางเปรียบเทียบ, ไฟล์ที่กระทบ) ใส่ใน Appendix ของ plan ไม่ใช่ใน checklist ที่ user อนุมัติ

กฎการดำเนินงาน:
1. ห้ามเขียนโค้ดก่อน checklist ได้รับอนุมัติ
2. ถ้าขัดกับ rule หรือ skill → ระบุข้อขัดแย้งแล้วถาม user ว่าจะ (A) ทำตาม rule/skill หรือ (B) ทำตามวิธีของผู้ใช้ ห้ามข้ามเงียบ ๆ
3. ติ๊ก `[x]` ทันทีเมื่อแต่ละข้อย่อยเสร็จ
4. ก่อนเริ่มงาน ใช้ git flow สร้าง branch ใหม่ก่อน
5. ก่อนปิดงาน อัปเดตไฟล์ plan (เช่น `sub-plan-*.md`): ติ๊ก `[x]` พร้อมบันทึกผลลัพธ์ / ข้อที่สรุปว่าไม่ต้องทำจริง
6. Commit message เป็นภาษาไทยรูปแบบ Conventional Commits: `<type>(<scope>): <ใจความภาษาไทย>`

## Commands

- เริ่มจาก `task env` — copy `.env.example` → `.env` (จำเป็น มีเฉพาะ root)
- `task local` — dev ประจำวัน: backend ใน Docker + frontend บน Bun host frontend :4000, API :4001 ใช้ `task local:frontend` ถ้า container backend เปิดอยู่แล้ว
- `task test` — backend (`bun test`) แล้ว frontend (`vitest run`) แบบเจาะจง: `cd backend && bun test src/test/integration`, `cd frontend && bun run test tests/unit`
- `bun run typecheck` ใน `backend/` และ `frontend/` — CI ผ่าน/ไม่ผ่านที่ tests + build รันสองตัวนี้ก่อน push
- E2E: `task test:e2e` — **ต้อง `bun run build` ก่อน**; Playwright Serve `nuxt preview` ห้ามใช้ `nuxt dev` (Workbox cache ทำพัง)
- `task cf:dev` — จำลอง Workers + D1 ผ่าน wrangler (แยกจาก `task local`)
- Package manager ใช้ **Bun เท่านั้น** ห้ามสร้าง `package-lock.json`

## ข้อควรระวัง dual runtime / dual database

Backend มีสอง entry: `backend/src/index.ts` (Bun local) และ `backend/src/worker.ts` (Cloudflare) มีสองระบบ migration ที่ต้องแก้ให้ตรงกันทุกครั้งที่เปลี่ยน schema:
- local: `backend/src/db/schema.ts` (Drizzle) + migration ที่เขียนเองใน `src/db/migrate.ts`
- prod: ไฟล์ SQL เลขลำดับใน `backend/migrations/` apply ผ่าน `task cf:db:migrate[:local]`

โค้ด backend ต้องคงความเข้ากันได้กับ Workers (ห้ามใช้ Node API เกินที่ `env.bun.ts` / worker env shims มีให้)

## การเพิ่ม entity (ต้องครบ 5+ ที่ ไม่งั้น sync พัง)

1. Drizzle table ใน `backend/src/db/schema.ts` + รายการใน `src/db/migrate.ts` + ไฟล์ SQL ใน `backend/migrations/`
2. Hono route ใต้ `/api/stores/:storeId/...`
3. Dexie table + indexes ใน `frontend/app/lib/db.ts` (ใช้ compound index `[store+field]` สำหรับ query แยกตาม store)
4. Interface ใน `frontend/app/lib/types/index.ts`
5. ลงทะเบียนใน `getTable()` map ของ `frontend/app/lib/sync/` + delta sync endpoint (`backend/src/routes/sync.ts`)

`.cursor/skills/add-collection/SKILL.md` เป็นของเก่า (อ้าง PocketBase ที่ถูกถอดไปแล้ว) — ห้ามทำตาม

## Invariants ของ multi-tenant + offline-first

- ทุกตารางธุรกิจมี FK `store`; ทุก query filter ด้วย store; route ใช้ middleware `requireStoreMember` / `requireManager` / `requireOwner` (`backend/src/middleware/`)
- `orders`, `order_items`, `inventory_transactions` เป็น immutable — ห้ามมี route PATCH/DELETE
- การอ่านฝั่ง frontend อ่านจาก Dexie เสมอ; เขียนตอน online ยิง API ก่อนแล้วค่อย cache, เขียนตอน offline ลง Dexie + `syncQueue`; conflict ใช้ last-write-wins ที่ `updated`

## ข้อควรรู้เรื่อง testing

- Backend tests อาศัย preload ใน `bunfig.toml` (temp DB ใน `backend/.test-run/`); ห้าม import `db/client` ก่อน preload ไม่งั้น SQLite I/O error รันผ่าน `bun test` ห้ามใช้ raw node
- `shared/test-fixtures/promotions.json` ใช้ร่วมกันระหว่าง backend `contract.test.ts` กับ frontend promotion tests — แก้แล้วต้องรันทั้งสอง suite (ตัวตรวจ promotion engine เพี้ยน)
- Component tests ต้องตั้งค่า vitest `environment: "nuxt"`; E2E: `visit("/")` ก่อน `/pos` เพื่อ trigger sync

## Conventions

- รายละเอียดทั้งหมดอยู่ใน `.cursor/rules/*.mdc` (อ่านก่อนทำงาน UI): ใช้ Vue `<script setup>` เท่านั้น ห้ามมี `<style>` block (ใช้ Tailwind v4 utilities + craft-card variants ใน `@theme` ของ `frontend/app/assets/css/main.css`), modal ผ่าน `<Teleport>`, form modal ห้ามปิดเมื่อคลิก backdrop
- Composables `useX.ts` และ components ถูก auto-import; `frontend/app/lib/` ไม่ auto-import
- UI สองภาษา th/en (`frontend/i18n/locales/`); E2E assert ที่ CSS class ไม่ใช่ข้อความที่แปลแล้ว
- เงินเป็น THB ใช้ `toLocaleString("th-TH", ...)`; เก็บจำนวนเงินเป็น number ตาม schema เดิม — ดูโค้ดข้างเคียงเป็นแนว
- ชื่อตาราง/collection เป็น snake_case; service ใหม่ใน docker-compose ต้องเพิ่ม task start/stop/logs ใน Taskfile ด้วย

## Deploy

- Push/PR → `.github/workflows/ci.yml`; push `main` → auto-deploy Workers + Pages + D1 migrate (`deploy.yml`) แบบ manual: `task deploy:cloudflare`
- Secret ใน prod ใช้ `wrangler secret put` (JWT_SECRET, RESEND_*) ไม่ใช่ `.env` ขั้นตอน release: เพิ่ม `VERSION`, `task release-notes`, แล้ว tag
