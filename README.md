# zKCNT POS - Offline-First Point of Sale System

ระบบ POS แบบ offline-first multi-tenant รองรับหลายร้านค้า สร้างด้วย Nuxt 3 + Tailwind CSS + Bun API + Dexie.js

## Tech Stack

- **Frontend**: Nuxt 3 (Vue 3) + Tailwind CSS v4 + Bun runtime
- **Local Database**: Dexie.js (IndexedDB)
- **Backend**: Bun + Hono + Drizzle ORM + SQLite
- **PWA**: @vite-pwa/nuxt
- **Task Runner**: [go-task/task](https://taskfile.dev/)
- **Containerization**: Docker (dev + prod)

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
| [Bun](https://bun.sh/) | Frontend package manager & runtime | `brew install oven-sh/bun/bun` |
| [Docker](https://www.docker.com/) | Backend API (local), dev stack, prod stack | Docker Desktop |

## Quick Start

```bash
# 1. Clone และเข้าโปรเจค
cd zkcnt-pos

# 2. สร้างไฟล์ .env
task env

# 3. รันโหมด local (แนะนำสำหรับ dev ประจำวัน)
task local
```

เปิดใช้งาน:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/health
- **DB Admin** (optional): `task db-admin` → http://localhost:8080

## Task Commands

| Task | คำอธิบาย |
|------|----------|
| `task` | แสดงรายการ tasks ทั้งหมด |
| `task env` | สร้าง `.env` จาก `.env.example` |
| `task install` | ติดตั้ง dependencies (`bun install`) |
| `task build` | Build frontend สำหรับ production |
| `task local` | **Hybrid local** — Backend ใน Docker + Frontend ด้วย Bun บนเครื่อง |
| `task local:backend` | Start backend container เท่านั้น |
| `task local:frontend` | Start frontend dev server เท่านั้น |
| `task local:stop` | หยุด backend container |
| `task dev` | **Full Docker dev** — รันทั้ง stack ใน container |
| `task dev:down` | หยุดและลบ dev containers |
| `task dev:logs` | ดู logs ของ dev stack |
| `task db-admin` | Start SQLite admin UI (dev only) |
| `task db-admin:stop` | หยุด DB admin container |
| `task backend:install` | ติดตั้ง backend dependencies |
| `task backend:migrate` | รัน database migrations |
| `task prod` | **Production** — รัน stack แบบ detached (Nginx + built frontend) |
| `task prod:down` | หยุดและลบ prod containers |
| `task prod:logs` | ดู logs ของ prod stack |

### โหมดการรัน

**`task local`** (แนะนำ) — Backend API รันใน Docker, Frontend รันด้วย Bun บนเครื่อง (hot reload เร็ว)

**`task dev`** — รันทั้ง Backend และ Frontend ใน Docker (เหมาะเมื่อไม่ต้องการติดตั้ง Bun บนเครื่อง)

**`task prod`** — Production build พร้อม Nginx reverse proxy ที่ port 80

## First-Time Setup

1. รัน `task local` หรือ `task dev`
2. เปิดแอปที่ http://localhost:3000
3. Register user account ใหม่
4. สร้างร้านแรก (Create Store)
5. เพิ่มสินค้าและเริ่มขาย!

## Environment Variables

Copy จาก `.env.example`:

```env
# API URL (local dev — browser ต้องเข้าถึงได้)
API_URL=http://localhost:3001
NUXT_PUBLIC_API_URL=http://localhost:3001

# JWT secret (เปลี่ยนใน production)
JWT_SECRET=change-me-in-production

# Production port (Nginx)
PORT=3000

# DB admin (dev only)
DB_ADMIN_USER=admin
DB_ADMIN_PASS=changeme
```

Frontend อ่านค่า `NUXT_PUBLIC_API_URL` — ในโหมด `task local` จะถูก set อัตโนมัติเป็น `http://localhost:3001`

บน Pi production ให้ `NUXT_PUBLIC_API_URL` ว่าง — client จะใช้ `window.location.origin + '/api'` ผ่าน Nginx proxy

## Deploy to Raspberry Pi 5

CI/CD ใช้ GitHub Actions: **CI** รันบน cloud ทุก push/PR, **Deploy** รันบน Pi ผ่าน self-hosted runner ใน Docker

### One-time setup บน Pi

```bash
# 1. Clone repo (repo root = โฟลเดอร์ที่มี docker-compose.prod.yml)
git clone https://github.com/chinnatan/zkcnt-pos.git ~/Desktop/zkcnt-pos
cd ~/Desktop/zkcnt-pos

# 2. สร้าง .env ที่ repo root (ไม่ใช่ใน subdirectory)
cp .env.example .env
# แก้ JWT_SECRET และ NUXT_PUBLIC_APP_URL เป็น domain/IP ของ Pi

# 3. Deploy ครั้งแรก (manual)
docker compose -f docker-compose.prod.yml up -d --build
```

### Deploy flow

| Event | ผลลัพธ์ |
|-------|---------|
| Push / PR (ทุก branch) | CI — `bun install` + `bun run build` บน ubuntu-latest |
| Push `main` (หลัง CI ผ่าน) | Deploy อัตโนมัติบน Pi |
| Manual (Actions → Deploy to Pi 5 → Run workflow) | Deploy ทันทีบน Pi |

### Troubleshooting

```bash
# ดู logs บน Pi
cd ~/Desktop/zkcnt-pos
docker compose -f docker-compose.prod.yml logs -f

# Build บน Pi ช้า — ปกติสำหรับ ARM64, ใช้ manual deploy ตอนที่ Pi ว่างได้
```

## Project Structure

```
zkcnt-pos/
├── Taskfile.yml            # Task runner (local/dev/prod)
├── frontend/               # Nuxt 3 SPA/PWA
│   ├── app/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Business logic (useAuth, useProducts, etc.)
│   │   ├── layouts/        # Page layouts
│   │   ├── lib/            # Dexie DB, ApiClient, sync engine
│   │   ├── pages/          # File-based routing
│   │   ├── middleware/     # Auth middleware
│   │   └── plugins/        # API & Dexie plugins
│   ├── bun.lock
│   └── nuxt.config.ts
├── backend/
│   ├── src/                # Hono API, Drizzle schema
│   ├── data/               # pos.db + uploads (gitignored)
│   └── Dockerfile
├── nginx/                  # Production reverse proxy
├── .cursor/
│   ├── rules/              # Cursor AI rules
│   └── skills/             # Cursor AI skills
├── docker-compose.dev.yml  # Development
└── docker-compose.prod.yml # Production
```

## Manual Commands (Fallback)

ใช้เมื่อไม่มี `task` หรือต้องการรันแยกส่วน:

```bash
# Frontend only
cd frontend && bun install && bun run dev

# Backend only (Docker)
docker compose -f docker-compose.dev.yml up backend -d

# Full dev stack (Docker)
docker compose -f docker-compose.dev.yml up --build

# Production (Docker)
docker compose -f docker-compose.prod.yml up -d --build
```
