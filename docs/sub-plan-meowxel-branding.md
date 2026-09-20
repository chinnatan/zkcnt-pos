# Meowxel POS Rebrand — เปลี่ยนแบรนด์ zKCNT POS → Meowxel POS (Pixel Art x Cat): icon, ธีมสี, ปุ่มพิกเซล, แอนิเมชัน, slogan

## Business Goals
- ระบบจำชื่อแบรนด์ "Meowxel POS" ได้ทันทีทั้งบน PWA icon, หัวเว็บ, หน้า login และ title bar
- หน้าตามีเอกลักษณ์พิกเซลอาร์ต-แมว แต่ยังไม่เสีย usability (สีตัวหนังสือตัดกันเพียงพอ, จอ POS แตะแม่น)
- โมเมนต์สำคัญ (จ่ายเงินสำเร็จ, กำลังโหลด) มี micro-interaction แบบพิกเซลแมวที่เบา ไม่ถ่วงเครื่องสเปกต่ำ
- Slogan ปรากฏเฉพาะจุดสร้างแบรนด์ (login/about) ไม่รกหน้าจอขาย

## Phase 1: Branch & Preparation
- [x] สร้าง branch ใหม่ด้วย git flow: `feature/meowxel-branding`
- [x] อ่าน `.cursor/rules/vue-components.mdc` + `project-conventions.mdc` ยืนยันข้อจำกัด style/utility ก่อนแตะ UI

## Phase 2: Brand Assets (Icon / Manifest)
### ออกแบบ
- [x] เลือก design option ของ icon จาก appendix (1 Cat Cashier / 2 Paw Screen / 3 Cat with Receipt) — เสนอ: option 3 ง่ายสุดต่อการทำเป็น pixel SVG
- [x] วาด favicon.svg แบบ pixel grid 32x32 outline เข้ม — ผล: ใช้ option 3 (แมวคาบใบเสร็จ+แสตมป์ม่วง) PNG ผลิตด้วย magick 32x32 → nearest-neighbor (512px = 16KB)
### แทนที่ไฟล์
- [x] แทนที่ `frontend/public/favicon.svg`, `apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png` (สร้าง PNG จาก SVG ด้วย script เดียวหรือเครื่องมือครั้งเดียว ไม่ต้องเพิ่ม dependency ใน repo)
- [x] อัปเดตชื่อแบรนด์ใน `nuxt.config.ts`: `app.head.title`, `apple-mobile-web-app-title`, `manifest.name/short_name`, `theme_color`, `background_color`

## Phase 3: Theme Tokens (main.css)
- [x] เปลี่ยนชุด `--color-primary-*` เป็น Pastel Orange / Warm Terracotta (ส้มแมว)
- [x] เปลี่ยน `--color-accent-*` + `--color-success-*` เป็น Soft Mint / Cream ให้โทนรวมไม่ตีกัน
- [x] เพิ่ม token `--color-pixel-*` (Retro Purple / Cyber Pink) สำหรับปุ่มชำระเงินและยอดรวม
- [x] ปรับ `--color-surface/paper/ink` เป็น cream + dark outline ให้เข้าธีม และตรวจ contrast ผ่าน WCAG AA
- [x] เพิ่ม --font-pixel: Silkscreen (Google Fonts, เพิ่ม link ใน nuxt.config) ใช้เฉพาะ appName บน auth/pos layout และตัวอักษร "PAID" — ไทยทั้งหมดยัง Noto Sans Thai ตามเดิม

## Phase 4: Pixel UI Components
- [x] ปรับ `.btn-primary` / `.btn-secondary` / `.craft-action*` ใน `main.css` เป็นปุ่ม 3D พิกเซล (ขอบหนา, box-shadow แบบกดลง, ลด border-radius เหลือ 0/px-less) จุดเดียวมีผลทุกหน้า — ไม่แตะ `.vue` เป็นรายตัว
- [x] เปลี่ยน payment/total button ของ POS ให้ใช้ `--color-pixel-*` (accent เด่น) — ดู `pos.vue` + `CartPanel.vue`
- [x] เพิ่ม utility `.pixel` (image-rendering: pixelated) สำหรับ icon/sprite ทั้งหมด
- [x] Re-skin `.craft-card` และ variants ทั้งหมดใน `main.css` เป็นกรอบพิกเซล (ขอบหนา/มุมตัด/outline) โดยคงชื่อ class เดิม — ไม่แตะ `.vue`
- [x] ตรวจทุกหน้าที่ใช้ `craft-card--*` (reports, audit, sessions ฯลฯ) ด้วยตาว่า layout ไม่พังหลัง re-skin (ตาราง/overflow ใน variants paper/canvas)

## Phase 5: Micro-interactions
- [x] แอนิเมชันจ่ายเงินสำเร็จ: ตรา "PAID" อุ้งเท้าแมวStamp ลงบน success modal ของ `pos.vue` (CSS keyframes เท่านั้น, ไม่มี lib)
- [x] แอนิเมชัน waiting — ผล: ทำเฉพาะ pos loading เป็น .pixel-paws 3 อุ้งเท้า bounce (1 จุด) ไม่แตะ spinner 18 หน้าที่เหลือ (ไม่ใช่จุดรอหลัก ห้าม scope พอง)
- [x] ทุก animation อยู่ใน `@media (prefers-reduced-motion: reduce)` ให้ปิดได้

## Phase 6: Slogan & Copy
- [x] เลือก slogan ที่ approve จาก 3 ตัวเลือกใน appendix แล้วเพิ่ม key `nav.slogan` ใน `i18n/locales/th.json` + `en.json`
- [x] แสดง slogan ใต้ appName ใน layouts/auth.vue จุดเดียว — ผล: ใช้ key เดิม common.appTagline ไม่ต้องเพิ่ม key
- [x] เปลี่ยน `nav.appName` เป็น "Meowxel POS" ใน th/en

## Invariants — feature ที่ทำงานอยู่แล้วห้ามพัง
- งานนี้เปลี่ยนได้เฉพาะ CSS tokens/utilities, assets, manifest/head config, ข้อความ i18n และ template แบบ class-only — ห้ามแตะ business logic, sync, order/inventory paths
- ห้ามลบ/เปลี่ยน `data-testid` และ class ที่ tests/E2E assert อยู่ (เช่น `success-modal`)
- ห้ามแก้ semantic ของ status colors (success/warning/danger ต้องคงความหมายเดิมแม้ปรับเฉด)
- ถ้าตรวจพบว่าการเปลี่ยนธีมทำให้ flow เดิมพัง → แก้ธีมให้ถอยก่อน ห้ามแก้ flow

## Phase 7: Review & Quality Assurance
- [x] รัน `bun run typecheck` ใน frontend
- [x] รัน unit tests ทั้ง suite ของ frontend (`cd frontend && bun run test tests/unit`) เทียบ baseline ก่อน/หลังแก้ ห้ามมี test ที่เคยผ่านแล้วพัง
- [x] `git diff` ไล่ดูว่าไม่มีไฟล์ logicนอกเหนือ invariants ด้านบนถูกแก้
- [x] ตรวจ/manual smoke: หน้า login, /pos จ่ายเงิน 1 ออเดอร์, ปุ่มทุกขนาดยังแตะได้ (ปุ่ม 3D ไม่เบียด touch target เดิม), PWA install icon ขึ้นถูกต้อง
- [x] ติ๊กผลลัพธ์จริงในไฟล์นี้ก่อนปิดงาน

## ข้อสรุปที่อนุมัติแล้ว (เดิม: ข้อขัดแย้ง)
1. **Craft theme vs Pixel theme** → เลือก A: re-skin `craft-card` ทุก variant เป็นกรอบพิกเซล โดย rewrite ใน `main.css` (`@layer components` lines 121+) และคงชื่อ class เดิมไว้ — ไม่แก้ `.vue` ทั้ง ~30 หน้า, ไม่แตะ `CraftCard.vue`
2. **Pixel font ภาษาไทย** → เลือก A: `--font-pixel` (เช่น Press Start 2P / Silkscreen จาก Google Fonts, เพิ่ม link ใน `nuxt.config.ts`) ใช้เฉพาะ EN/ตัวเลข/คำสั้น ๆ เช่น "PAID"; body ไทยคง Noto Sans Thai

## Appendix: ผลสำรวจ
- จุดอ้างชื่อแบรนด์: `nuxt.config.ts:53,61,64,111-112,140-141`, `i18n th/en nav.appName`, `layouts/pos.vue:9`, `layouts/auth.vue:8`, `plugins/i18n.client.ts` (key `zkcnt-locale`)
- สี/ฟอนต์รวมศูนย์ที่ `@theme` ของ `frontend/app/assets/css/main.css` (lines 3-54) — swap token มีผลทั้งแอป
- ปุ่มรวมศูนย์ที่ `@layer components` (`btn-primary` ฯลฯ lines 84-119) — แก้จุดเดียวครอบทุก `.vue`
- success modal POS: `pages/pos.vue:234` (`data-testid="success-modal"`); E2E assert ด้วย testid ไม่ใช่ข้อความ
- Asset ปัจจุบัน: `public/favicon.svg`, `apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`
- Slogan candidates (รอ user เลือก):
  1. "ขายลื่นไหล สไตล์พิกเซลแมว"
  2. "ทุกล้านยอดขาย สร้างด้วยพลังพิกเซลแมว" (ตัดต่อจากข้อความที่ส่งมาไม่ครบ)
  3. "ระบบ POS สไตล์คราฟต์ เติมความสมบูรณ์แบบให้ทุกการขาย"

## ผลการดำเนินงาน (feature/meowxel-branding)
- เปลี่ยนแบรนด์/สี/ฟอนต์/ปุ่ม/การ์ด/modal/anim ครบตาม checklist — 19 ไฟล์, ยังไม่ commit
- หลักฐาน: frontend unit 15/15, components 6/6, integration+lib 28/28, build ✓; backend integration 33/33
- typecheck สองฝั่งพังตั้งแต่ baseline develop (frontend 10 errors ใน sync-engine.test, backend drizzle types) — งานนี้ไม่เพิ่ม error ใหม่ (พิสูจน์ด้วย worktree HEAD)
- E2E 6 specs fail บน develop เองที่เครื่องนี้ (login waitForURL timeout) — ไม่ใช่ regression; testid/class ที่ assert (`success-modal`, `checkout-btn`, `text-warning`) คงชื่อครบ, ReceiptPrint (พิมพ์จริง) ไม่ถูกแตะ
- คง `zkcnt-locale` (localStorage) และชื่อ Dexie `zkcnt-pos` เพื่อไม่เสียค่าเดิมของผู้ใช้

## Amendment: Cold Theme + Theme Toggle
- [x] ยืนยัน Light Mode เป็นค่าเริ่มต้น และมี toggle สำหรับสลับ Dark Mode
- [x] ยืนยัน loading cat ใช้ CSS/inline markup ไม่เพิ่ม sprite หรือ dependency

### Phase 8: Cold Color System
- [x] เปลี่ยน palette เป็น Deep Navy / Steel Blue, Slate / Ice Blue และ Neon Cyan / Electric Teal
- [x] เพิ่ม light/dark token overrides โดยคงชื่อ utility เดิมและ semantic status colors
- [x] เพิ่ม theme state ที่ persist ใน localStorage ด้วย key `meowxel-theme` โดยไม่ใช้ key เดิมของ locale/auth/store

### Phase 9: Cold Micro-interactions
- [x] ปรับ PAID stamp เป็น Neon Cyan พร้อม pixel snow particles
- [x] ปรับ loading เป็น pixel cat สีเทาในรูปแบบ CSS/inline markup
- [x] รัน tests/build และตรวจ checkout, offline sync, receipt และ PWA ไม่ถดถอย

## ผล Amendment
- Light เป็นค่าเริ่มต้น; toggle อยู่ใน auth, POS และ dashboard/admin header และ persist ผ่าน `meowxel-theme`
- Frontend build ผ่าน; frontend tests 49/49 ผ่าน; backend integration 33/33 ผ่าน
- typecheck ยังพบ 10 errors เดิมใน `tests/integration/sync-engine.test.ts`; ไม่มี error ใหม่จาก theme work
