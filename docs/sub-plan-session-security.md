# Security Phase 6 (ส่วนใหญ่) — tokenVersion revoke, บังคับปิดร้าน, flag registry, หน้า sessions ฝั่ง store, audit owner

Branch: `feat/session-security` (แตกจาก `develop`)

ครอบคลุม PLAN.md Phase 6: ข้อ 1, 2, 4 (platform) + ข้อ session management, audit viewer (store) — ไม่รวม ตั้ง/ถอด platform admin ผ่าน UI, 2FA, sync drill-down

## สรุปข้อเท็จจริง (Phase 0 investigation)

1. **`authMiddleware` ไม่แตะ DB จริง** (`backend/src/middleware/auth.ts:12-34`) — verify JWT อย่างเดียว, access 7d / refresh 30d (`lib/jwt.ts:17,25`); `PATCH /admin/users/:userId` (`routes/admin.ts:132`) เปลี่ยนแค่ `users.is_active` → token เดิมยังใช้ได้จนหมดอายุ (มากสุด 7 วัน) ส่วน refresh ถูกบล็อกแล้วที่ `routes/auth.ts:162` (`isActive`) แต่ยังไม่บล็อกเคส revoke อื่น
2. **ฝั่ง client มี fallback ครบแล้ว** — `lib/api/client.ts:140-178`: 401 → try refresh → refresh พัง = `logout()` ดังนั้นเมื่อ backend ตอบ 401/403 จากการ revoke ก็ไม่ต้องเพิ่มโค้ด frontend
3. **`getMembership` (`middleware/store-access.ts:16-29`) join แค่ `store_members`** — ไม่เคยแตะ `stores.is_active`; ทุก store route (รวม `routes/sync.ts` ทั้ง 4 จุด) วิ่งผ่าน middleware / `assertStore*ByStoreId` ตัวนี้หมด ยกเว้น **`POST /client/heartbeat` (`routes/client.ts:29-43`) ที่ query `store_members` เอง** → ต้องเปลี่ยนให้เรียก helper เดียวกัน ไม่งั้น heartbeat ยังวิ่งต่อหลังปิดร้าน
4. **flag กระจาย 3 ที่**: union type + message ใน `backend/src/lib/feature-flags.ts`, union type + `isStoreFeatureEnabled` (hardcode default = true เมื่อ key ไม่มี) ใน `frontend/app/lib/feature-flags.ts` และรายการ toggle hardcode ใน `pages/admin/stores/[id].vue:110-114`; `features.ts:1` (`CUSTOMERS_ENABLED=false`) เป็นละที่ละ 4 (static, ใช้ใน middleware customers, Sidebar, reports) — backend/frontend ไม่มี shared TS package (ใช้ร่วมกันแค่ JSON fixtures) → registry "ชุดเดียว" ทำได้ที่สุด = ชุดละ 1 ไฟล์ต่อ app (ลดจาก 3 ที่เหลือ 2) derive type จาก array `as const`
5. **audit ฝั่ง store มีหน้าแล้ว** — `pages/settings/audit.vue` + composable `useAuditEvents.ts` ชี้เข้า `GET /:storeId/audit-events` (`routes/audit.ts:194`, `requireStoreManager`) ซึ่ง filter ต่อ store ครบแล้ว → ข้อต้องการที่บอกว่า "มีเฉพาะ platform admin" เป็นข้อมูลเก่า; ช่องว่างจริงคือ **`admin.*` รั่วเข้าสายตา owner**: event ของ platform admin เขียนพร้อม `store: storeId` (`routes/admin.ts:87-109`) →โผล่ในลิสต์/CSV ของร้าน แต่ `buildAuditFilters` (`routes/audit.ts:19`) ไม่เคยตัดออก
6. **`clientSessions` keyed ด้วย uniqueIndex(user, store)** (`db/schema.ts:416`) — หนึ่งแถวต่อ "user × store" ไม่ใช่ต่ออุปกรณ์จริง และ `admin GET /devices` (`routes/admin.ts:221` → `listClientSessions`) ยังไม่มี revoke ใด ๆ → ตัวบังคับคือ `tokenVersion` ของ user ทั้งตัว (revoke ทั้ง user ไม่ใช่ทั้งอุปกรณ์เดียว ตามที่ requirement ระบุเอง)
7. **schema ปัจจุบัน `users` ไม่มี `token_version`** (`schema.ts:16-26`) → ต้องขึ้นครบ 2 ระบบ migration: Drizzle + `ALTER` ใน `src/db/migrate.ts` (pattern เดียวกับ `is_active` ที่ migrate.ts:334) + `backend/migrations/0008_*.sql` (clientSessions/Dexie ไม่แตะ — ไม่ใช่ entity ใหม่ที่ sync)

## Edge cases ที่วิเคราะห์แล้ว

| # | สถานการณ์ | ผลปัจจุบัน | หลังแก้ |
| --- | --- | --- | --- |
| 1 | disable user แล้ว user ถือ access token เดิม | ใช้ต่อได้จนถึง 7 วัน | 401 ทันที (authMiddleware เช็ก `isActive` + `tv` กับ DB) |
| 2 | revoke-sessions (bump tv) แล้ว user กด re-enable | — | token เก่าตายถาวร (tv ใน token < ใน DB), ต้อง login ใหม่ |
| 3 | token เก่าที่ออกก่อน deploy (ไม่มี claim `tv`) | — | treat เป็น `tv=0` = ค่า default ของ column → ยังใช้ได้จนหมดอายุ ไม่ kick ทุกคนพร้อมกันตอนปล่อย |
| 4 | store ถูก deactivate ขณะ cashier เปิด POS offline | API/sync ยังผ่าน, heartbeat ยัง update | ทุก store route + sync + heartbeat → 403; งานใน queue ค้างรอ open อีกครั้ง (LWW เดิมไม่พัง) |
| 5 | manager revoke ตัวเองจากหน้า sessions | — | ทำได้ (equiv "log out ทุกอุปกรณ์") client จะ logout ตาม flow 401 เดิม |
| 6 | owner try revoke ผู้ใช้ที่เป็น platform admin | — | 403 กันไว้ (สอดคล้อง "Cannot disable platform admin" ที่ `admin.ts:145`) |
| 7 | ร้านเก่าที่ไม่เคยตั้ง flag `customers_enabled` | — | registry default: 3 flag เดิม = true (พฤติกรรมเท่าเดิม), `customers_enabled` = false → Phase 2 สลับ per-store ได้ทันที |
| 8 | store owner เปิดหน้า audit | เห็น `admin.store_deactivate` ของ platform ปน | list + export.csv ตัด `admin.*` ออก (ฝั่ง `/admin/audit` เห็นครบเหมือนเดิม) |

## Business Goals

- คำสั่ง disable user / revoke sessions / deactivate store มีผลกับทุกรายการ API + sync ภายใน request ถัดไป ไม่ใช่รอ token หมดอายุ
- platform admin และ store manager จัดการอุปกรณ์/ session ที่ login อยู่ได้จาก UI ทั้งสองฝั่ง ด้วยกลไกบังคับเดียวกัน
- รายการ feature flag มีที่มาเดียว เพิ่ม `customers_enabled` ใน Phase 2 ได้ด้วยการแก้ registry ที่เดียว
- owner เห็น audit ของร้านตัวเองโดยไม่เห็นงานภายในของ platform

## Phase 1: tokenVersion + บังคับใน authMiddleware (รากของทุกข้อ)

### schema (2 ระบบ migration ตรงกัน)
- [x] `tokenVersion: integer("token_version").notNull().default(0)` ใน `users` (`backend/src/db/schema.ts`) + guarded ALTER ใน `src/db/migrate.ts` + `backend/migrations/0008_token_version.sql`

### backend auth
- [x] เพิ่ม `tv` claim ใน access/refresh JWT และส่ง `tokenVersion` ตอน register/login/refresh
- [x] `authMiddleware` และ `optionalAuthMiddleware` ตรวจ `isActive` + `tokenVersion` จาก DB
- [x] `POST /auth/refresh` ปฏิเสธ refresh token ที่ถูก revoke
- [x] `updateUserActive` ตอน disable bump `tokenVersion`

## Phase 2: ปิดร้านแล้วหยุดจริง

- [x] `getMembership` join `stores` และ require `stores.is_active=true` ครอบ store API/sync ทั้งหมด
- [x] `POST /client/heartbeat` ใช้ `assertStoreMemberByStoreId` เดียวกับ store routes
- [x] ร้าน inactive ถูกตอบ 403 ผ่าน guard กลาง (ใช้ Forbidden เดิมเพื่อไม่เพิ่ม error contract ใหม่)

## Phase 3: endpoint revoke + หน้า sessions (admin + store reuse กลไกเดียว)

### backend
- [x] เพิ่ม admin revoke endpoint ที่ bump `tokenVersion` และเขียน audit
- [x] เพิ่ม store sessions endpoint โดย reuse `listClientSessions` และกรอง active members
- [x] เพิ่ม store member revoke endpoint พร้อม membership/platform-admin guard และ audit

### frontend
- [x] เพิ่มปุ่ม revoke ต่อแถวใน `pages/admin/devices.vue`
- [x] เพิ่ม `pages/settings/sessions.vue` และลิงก์ใน settings สำหรับ manager

## Phase 4: feature flag registry ชุดเดียว (ต่อ app)

- [x] เพิ่ม frontend/backend registry 4 flags รวม `customers_enabled` default false และ derive type/default จาก registry
- [x] ให้ `featureFlagOptions` ในหน้า admin map จาก registry
- [x] เพิ่ม i18n key `admin.featureFlags.customers` ทั้ง th/en
- [ ] `lib/features.ts` (`CUSTOMERS_ENABLED`): **ยังไม่แตะ** — การย้าย consumer (middleware customers, Sidebar, reports) เป็นงาน Phase 2 "เปิดระบบลูกค้า" ตาม PLAN.md; registry ชุดนี้เตรียม default ไว้ให้แล้ว

## Phase 5: audit ฝั่ง owner กรอง admin.*

- [x] `buildAuditFilters` ตัด `admin.*` จาก store list/export โดยไม่กระทบ `/admin/audit`

## Phase 6: Review & Quality Assurance

- [x] backend integration tests: 32 ผ่าน รวม disabled token, deactivated store/heartbeat, revoke และ audit filter
- [x] frontend unit tests: 15 ผ่าน รวม registry defaults/overrides
- [x] migration ถูกเพิ่มทั้ง local guarded migration และ D1 SQL migration
- [ ] `bun run typecheck` backend + frontend — ยัง fail เฉพาะ baseline errors ในไฟล์ที่ไม่ได้แก้
- [ ] อัปเดต checkbox ใน `PLAN.md` หลัง review diff/อนุมัติผลลัพธ์

## Appendix: ผลสำรวจ

| ประเด็น | ข้อเท็จจริง |
| --- | --- |
| จุดที่ token ถูกกิน | authMiddleware ทุก route (`rg` พบว่าทุก store route ผ่าน `requireStore*`), `/auth/refresh`, ไม่มีที่อื่น verify token เองนอกจาก `optionalAuthMiddleware` |
| client handle 401 ยังไง | `frontend/app/lib/api/client.ts:140` refresh 1 ครั้ง → พัง = logout; ไม่ต้องเพิ่ม UX ใหม่ |
| `listClientSessions` เดิม | `services/admin.service.ts:570+` รับ `{limit, offset, store}` แล้ว → store endpoint แค่ห่อด้วย `requireStoreManager` |
| flag consumers เดิม | `useFeatureFlags.ts` (composable), `useSync.ts`/reports/promotions ฝั่ง FE; ฝั่ง BE `requireStoreFeature` ใน promotions/reports/sync |
| หน้า store-side ที่ reuse ได้ | `pages/settings/audit.vue` เป็น template ของหน้า list + manager gate ใน `pages/settings/index.vue` (`v-if="isManager"`) |
| requirement 5 คลาดเคลื่อน | หน้า audit owner มีอยู่แล้ว (`/settings/audit`) — งานจริงเหลือแค่กรอง `admin.*` (ดูข้อเท็จจริง #5) |
