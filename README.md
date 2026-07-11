# zKCNT POS - Offline-First Point of Sale System

ระบบ POS แบบ offline-first multi-tenant รองรับหลายร้านค้า สร้างด้วย Nuxt 3 + Tailwind CSS + Hono API + Dexie.js

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Nuxt 3 SPA/PWA → **Cloudflare Pages** |
| **API** | Hono → **Cloudflare Workers** |
| **Database** | SQLite → **Cloudflare D1** |
| **Uploads** | **Cloudflare R2** |
| **Email** | Resend (external) |
| **Local cache** | Dexie.js (IndexedDB) |
| **Local dev** | Bun + SQLite (`task local`) |

## Architecture

```
Browser PWA (Dexie offline cache)
        │
        ▼
Cloudflare Pages  ── /api/* ──►  Cloudflare Workers (Hono)
        │                              │
        │                              ├── D1 (SQLite)
        │                              └── R2 (product images)
        └── static SPA shell
```

- **Offline-first**: ขายหน้าร้านอ่าน/เขียน Dexie ก่อน sync ขึ้น Workers เมื่อ online
- **Multi-tenant**: ทุก business table มี `store` field + RBAC ผ่าน `store_members`

## Features

- Multi-tenant (หลายร้าน) — แต่ละร้านมีข้อมูลแยกกัน
- Offline-first — ใช้งานได้แม้ไม่มีอินเทอร์เน็ต
- POS Terminal — หน้าขายสินค้าแบบ touch-friendly
- Product Management — จัดการสินค้าและหมวดหมู่
- Inventory Management — จัดการสต็อก แจ้งเตือน low stock
- Customer Management — จัดการข้อมูลลูกค้า
- Order Management — ดูประวัติการขาย
- Reports & Dashboard — สรุปยอดขาย รายงาน
- Discount System — ระบบส่วนลด/โปรโมชั่น
- Receipt Printing — พิมพ์ใบเสร็จผ่าน browser
- Multi-payment — รองรับเงินสด, QR
- PWA — ติดตั้งเป็น app บนอุปกรณ์ได้
- Responsive — รองรับ mobile, tablet, desktop

## Prerequisites

| Tool | ใช้สำหรับ | ติดตั้ง (macOS) |
|------|-----------|-----------------|
| [go-task](https://taskfile.dev/) | รันโปรเจคด้วย `task` | `brew install go-task/tap/go-task` |
| [Bun](https://bun.sh/) | Frontend/backend local dev | `brew install oven-sh/bun/bun` |
| [wrangler](https://developers.cloudflare.com/workers/wrangler/) | Deploy Workers/Pages/D1 | `bun add -g wrangler` |
| Cloudflare account | Production (Workers Paid ~$5/mo) | [dash.cloudflare.com](https://dash.cloudflare.com) |
| Resend account | Transactional email | [resend.com](https://resend.com) |
| Docker (optional) | `task dev` full Docker stack | Docker Desktop |

## Quick Start (Local Dev)

```bash
cd zkcnt-pos
task env
task local
```

เปิดใช้งาน:
- **Frontend**: http://localhost:4000
- **Backend API**: http://localhost:4001/api/health

## Task Commands

| Task | คำอธิบาย |
|------|----------|
| `task local` | **Hybrid local** — Backend Docker + Frontend Bun (dev ประจำวัน) |
| `task cf:dev` | ทดสอบ Workers + D1 local (`wrangler dev`) |
| `task cf:deploy` | Deploy Workers API ไป Cloudflare |
| `task cf:db:migrate` | Apply D1 migrations (remote) |
| `task cf:db:migrate:local` | Apply D1 migrations (local) |
| `task cf:export-d1` | Export `pos.db` → SQL สำหรับ import D1 |
| `task cf:sync-uploads` | อัปโหลด `backend/data/uploads/` ไป R2 |
| `task pages:deploy` | Build + deploy frontend ไป Cloudflare Pages |
| `task deploy:cloudflare` | Migrate D1 + deploy API + Pages |
| `task test` | รัน backend + frontend tests |
| `task test:e2e` | Playwright E2E tests |
| `task build` | Build frontend สำหรับ production |

### Legacy (Raspberry Pi / Docker)

| Task | คำอธิบาย |
|------|----------|
| `task prod` | Production Docker stack บน Pi (deprecated) |
| `task backup` | Backup SQLite + uploads (deprecated — ใช้ D1/R2 backup แทน) |

## First-Time Cloudflare Setup

ขั้นตอนครั้งเดียวสำหรับ production:

1. สร้าง Cloudflare account + เปิด **Workers Paid** plan (~$5/mo)
2. Login: `wrangler login`
3. สร้าง D1 database:
   ```bash
   cd backend
   wrangler d1 create zkcnt-pos
   ```
   อัปเดต `database_id` ใน [backend/wrangler.toml](backend/wrangler.toml)
4. สร้าง R2 bucket `zkcnt-pos-uploads` ใน Cloudflare dashboard
5. ตั้ง Workers Secrets:
   ```bash
   cd backend
   wrangler secret put JWT_SECRET
   wrangler secret put RESEND_API_KEY
   wrangler secret put RESEND_FROM
   ```
6. อัปเดต `[vars]` ใน `wrangler.toml`: `APP_URL`, `ALLOWED_ORIGIN`
7. Apply schema:
   ```bash
   task cf:db:migrate:local   # ทดสอบ local ก่อน
   task cf:db:migrate         # production
   ```
8. Import ข้อมูล (ถ้ามีจาก Pi):
   ```bash
   task cf:export-d1
   wrangler d1 execute zkcnt-pos --remote --file=backend/d1-import.sql
   task cf:sync-uploads
   ```
9. ตั้ง DNS + routing:
   - `pos.yourdomain.com` → Cloudflare Pages
   - `pos.yourdomain.com/api/*` → Workers route
10. ตั้ง GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
11. Deploy:
    ```bash
    task deploy:cloudflare
    ```

## Environment Variables

### Workers Secrets (`wrangler secret put`)

| Variable | คำอธิบาย |
|----------|----------|
| `JWT_SECRET` | ลงนาม JWT |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | อีเมลผู้ส่ง |

### wrangler.toml `[vars]`

| Variable | คำอธิบาย |
|----------|----------|
| `APP_URL` | Public app URL (ลิงก์ในอีเมล) |
| `ALLOWED_ORIGIN` | CORS origin ที่อนุญาต |
| `LOG_LEVEL` | `debug` / `info` / `warn` |

### Frontend build-time (`.env` / Pages)

| Variable | Local | Production |
|----------|-------|------------|
| `NUXT_PUBLIC_API_URL` | `http://localhost:4001` | **ว่าง** (same-origin `/api`) |
| `NUXT_PUBLIC_UPLOADS_URL` | ว่าง | ว่าง (same-origin `/uploads`) หรือ R2 custom domain |
| `NUXT_PUBLIC_APP_URL` | `http://localhost:4000` | `https://pos.yourdomain.com` |

## Deploy & CI/CD

| Event | ผลลัพธ์ |
|-------|---------|
| Push / PR | CI — tests + build ([.github/workflows/ci.yml](.github/workflows/ci.yml)) |
| Push `main` | Auto-deploy Workers + Pages + D1 migrate ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) |

### Manual deploy

```bash
task deploy:cloudflare
```

### Rollback

```bash
cd backend && wrangler rollback
# Pages: ใช้ deployment history ใน Cloudflare dashboard
```

## Maintenance

| งาน | ความถี่ | วิธีทำ |
|-----|---------|--------|
| ตรวจ D1 backup | รายสัปดาห์ | ดู R2 bucket `backups/` (Cron Worker รันทุกวัน 01:00 UTC) |
| Monitor Workers errors | รายวัน | Cloudflare dashboard → Workers → Logs |
| D1 storage usage | รายเดือน | dashboard → D1 → metrics |
| R2 storage usage | รายเดือน | dashboard → R2 |
| Rotate JWT secret | ตามนโยบาย | `wrangler secret put JWT_SECRET` (ผู้ใช้ต้อง login ใหม่) |
| Dependency updates | รายเดือน | `bun update` + CI pass + deploy |

## Backup & Restore

### D1 (อัตโนมัติ)

Cron Worker (`backend/src/cron.ts`) เขียน backup marker ไป R2 `backups/d1-YYYY-MM-DD.sql` ทุกวัน

### D1 (manual)

```bash
wrangler d1 export zkcnt-pos --remote --output=backup.sql
wrangler r2 object put zkcnt-pos-uploads/backups/manual-$(date +%F).sql --file=backup.sql
```

### Restore D1

```bash
wrangler d1 execute zkcnt-pos --remote --file=backup.sql
```

### Restore uploads

```bash
task cf:sync-uploads
# หรือ restore จาก R2 object ทีละไฟล์ด้วย wrangler r2 object get
```

## Troubleshooting

| อาการ | สาเหตุที่เป็นไปได้ | แก้ไข |
|-------|-------------------|-------|
| Sync ช้า/timeout ตอนเช้า | Workers/D1 cold start | ใช้ Workers Paid; ตรวจ cron warm-up |
| รูปสินค้าไม่โหลด | Upload path / CORS | ตรวจ `NUXT_PUBLIC_UPLOADS_URL`, `/uploads/*` route บน Worker |
| 401 หลัง deploy | JWT_SECRET เปลี่ยน | re-login ทุก device |
| CORS error | Origin ไม่ตรง | ตั้ง `ALLOWED_ORIGIN` ให้ตรงกับ Pages domain |
| D1 migration fail | schema drift | `wrangler d1 migrations list` แล้วแก้ SQL |
| Offline sync ค้าง | syncQueue error | ดู Dexie `syncQueue` ใน DevTools |

## Cost (ประมาณ 2 ร้าน)

| รายการ | ราคา/เดือน |
|--------|-----------|
| Workers Paid | $5 |
| Pages | $0 |
| D1 | $0 (free tier) |
| R2 | $0 (free tier) |
| **รวม** | **~$5 (~฿175)** |

## Project Structure

```
zkcnt-pos/
├── Taskfile.yml
├── frontend/                 # Nuxt 3 SPA/PWA → Cloudflare Pages
│   ├── app/
│   │   ├── lib/db.ts       # Dexie schema
│   │   ├── lib/sync/       # Offline sync engine
│   │   └── composables/    # useProducts, useOrders, etc.
│   └── public/_routes.json # Pages routing (exclude /api, /uploads)
├── backend/
│   ├── wrangler.toml       # Workers + D1 + R2 config
│   ├── migrations/         # D1 SQL migrations
│   ├── scripts/            # migrate-to-d1, sync-uploads-to-r2
│   └── src/
│       ├── worker.ts       # Cloudflare Workers entry
│       ├── index.ts        # Bun local entry
│       └── routes/         # Hono API routes
└── .github/workflows/
    ├── ci.yml
    └── deploy.yml
```

## Dual Dev Workflow

| Command | ใช้เมื่อ |
|---------|---------|
| `task local` | พัฒนาประจำวัน — Bun API + pos.db + hot reload |
| `task cf:dev` | ทดสอบ Workers runtime + D1 local |
| `wrangler dev --remote` | ทดสอบกับ D1/R2 บน Cloudflare จริง |

## First-Time App Setup

1. รัน `task local` หรือเปิด production URL
2. Register user account ใหม่
3. สร้างร้านแรก (Create Store)
4. เพิ่มสินค้าและเริ่มขาย!

## Legacy: Raspberry Pi Deployment

> **Deprecated** — ใช้ Cloudflare stack แทน ดู [First-Time Cloudflare Setup](#first-time-cloudflare-setup)

การ deploy บน Pi ด้วย `task prod` + Cloudflare Tunnel ยังอยู่ใน repo สำหรับ transition period แต่ไม่แนะนำสำหรับ setup ใหม่
