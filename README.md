# zKCNT POS - Offline-First Point of Sale System

ระบบ POS แบบ offline-first multi-tenant รองรับหลายร้านค้า สร้างด้วย Nuxt 3 + Tailwind CSS + PocketBase + Dexie.js

## Tech Stack

- **Frontend**: Nuxt 3 (Vue 3) + Tailwind CSS v4 + Bun runtime
- **Local Database**: Dexie.js (IndexedDB)
- **Backend**: PocketBase v0.38
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
- Multi-payment — รองรับเงินสด, QR, บัตร
- PWA — ติดตั้งเป็น app บนอุปกรณ์ได้
- Responsive — รองรับ mobile, tablet, desktop

## Prerequisites

| Tool | ใช้สำหรับ | ติดตั้ง (macOS) |
|------|-----------|-----------------|
| [go-task](https://taskfile.dev/) | รันโปรเจคด้วย `task` | `brew install go-task/tap/go-task` |
| [Bun](https://bun.sh/) | Frontend package manager & runtime | `brew install oven-sh/bun/bun` |
| [Docker](https://www.docker.com/) | PocketBase (local), dev stack, prod stack | Docker Desktop |

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
- **PocketBase Admin**: http://localhost:8090/_/

## Task Commands

| Task | คำอธิบาย |
|------|----------|
| `task` | แสดงรายการ tasks ทั้งหมด |
| `task env` | สร้าง `.env` จาก `.env.example` |
| `task install` | ติดตั้ง dependencies (`bun install`) |
| `task build` | Build frontend สำหรับ production |
| `task local` | **Hybrid local** — PocketBase ใน Docker + Frontend ด้วย Bun บนเครื่อง |
| `task local:backend` | Start PocketBase container เท่านั้น |
| `task local:frontend` | Start frontend dev server เท่านั้น |
| `task local:stop` | หยุด PocketBase container |
| `task dev` | **Full Docker dev** — รันทั้ง stack ใน container |
| `task dev:down` | หยุดและลบ dev containers |
| `task dev:logs` | ดู logs ของ dev stack |
| `task prod` | **Production** — รัน stack แบบ detached (Nginx + built frontend) |
| `task prod:down` | หยุดและลบ prod containers |
| `task prod:logs` | ดู logs ของ prod stack |

### โหมดการรัน

**`task local`** (แนะนำ) — PocketBase รันใน Docker, Frontend รันด้วย Bun บนเครื่อง (hot reload เร็ว)

**`task dev`** — รันทั้ง PocketBase และ Frontend ใน Docker (เหมาะเมื่อไม่ต้องการติดตั้ง Bun บนเครื่อง)

**`task prod`** — Production build พร้อม Nginx reverse proxy ที่ port 80

## First-Time Setup

1. รัน `task local` หรือ `task dev`
2. เปิด PocketBase Admin ที่ http://localhost:8090/_/
3. สร้าง superuser account (ครั้งแรกเท่านั้น)
4. เปิดแอปที่ http://localhost:3000
5. Register user account ใหม่
6. สร้างร้านแรก (Create Store)
7. เพิ่มสินค้าและเริ่มขาย!

## Environment Variables

Copy จาก `.env.example`:

```env
# PocketBase URL (ใช้โดย frontend)
POCKETBASE_URL=http://localhost:8090

# Production port (Nginx)
PORT=80
```

Frontend อ่านค่า `NUXT_PUBLIC_POCKETBASE_URL` — ในโหมด `task local` จะถูก set อัตโนมัติเป็น `http://localhost:8090`

## Project Structure

```
zkcnt-pos/
├── Taskfile.yml            # Task runner (local/dev/prod)
├── frontend/               # Nuxt 3 SPA/PWA
│   ├── app/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Business logic (useAuth, useProducts, etc.)
│   │   ├── layouts/        # Page layouts
│   │   ├── lib/            # Dexie DB, types, sync engine
│   │   ├── pages/          # File-based routing
│   │   ├── middleware/     # Auth middleware
│   │   └── plugins/        # PocketBase & Dexie plugins
│   ├── bun.lock
│   └── nuxt.config.ts
├── backend/
│   ├── pb_migrations/      # Database schema migrations
│   ├── pb_hooks/           # Server-side hooks
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

# PocketBase only (Docker)
docker compose -f docker-compose.dev.yml up pocketbase -d

# Full dev stack (Docker)
docker compose -f docker-compose.dev.yml up --build

# Production (Docker)
docker compose -f docker-compose.prod.yml up -d --build
```
