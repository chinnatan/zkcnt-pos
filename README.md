# zKCNT POS - Offline-First Point of Sale System

ระบบ POS แบบ offline-first multi-tenant รองรับหลายร้านค้า สร้างด้วย Nuxt 3 + Tailwind CSS + PocketBase + Dexie.js

## Tech Stack

- **Frontend**: Nuxt 3 (Vue 3) + Tailwind CSS v4
- **Local Database**: Dexie.js (IndexedDB)
- **Backend**: PocketBase v0.38
- **PWA**: @vite-pwa/nuxt
- **Containerization**: Docker (dev + prod)

## Features

- Multi-tenant (หลายร้าน) - แต่ละร้านมีข้อมูลแยกกัน
- Offline-first - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต
- POS Terminal - หน้าขายสินค้าแบบ touch-friendly
- Product Management - จัดการสินค้าและหมวดหมู่
- Inventory Management - จัดการสต็อก แจ้งเตือน low stock
- Customer Management - จัดการข้อมูลลูกค้า
- Order Management - ดูประวัติการขาย
- Reports & Dashboard - สรุปยอดขาย รายงาน
- Discount System - ระบบส่วนลด/โปรโมชั่น
- Receipt Printing - พิมพ์ใบเสร็จผ่าน browser
- Multi-payment - รองรับเงินสด, QR, บัตร
- PWA - ติดตั้งเป็น app บนอุปกรณ์ได้
- Responsive - รองรับ mobile, tablet, desktop

## Quick Start

### Development (without Docker)

```bash
# Frontend
cd frontend
npm install
npm run dev

# PocketBase (download from https://pocketbase.io)
cd backend
./pocketbase serve
```

### Development (with Docker)

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:3000
- PocketBase Admin: http://localhost:8090/_/

### Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Project Structure

```
zkcnt-pos/
├── frontend/               # Nuxt 3 SPA/PWA
│   ├── app/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Business logic (useAuth, useProducts, etc.)
│   │   ├── layouts/        # Page layouts
│   │   ├── lib/            # Dexie DB, types, sync engine
│   │   ├── pages/          # File-based routing
│   │   ├── middleware/      # Auth middleware
│   │   └── plugins/        # PocketBase & Dexie plugins
│   └── nuxt.config.ts
├── backend/
│   ├── pb_migrations/      # Database schema migrations
│   ├── pb_hooks/           # Server-side hooks
│   └── Dockerfile
├── nginx/                  # Production reverse proxy
├── docker-compose.yml      # Base compose
├── docker-compose.dev.yml  # Development
└── docker-compose.prod.yml # Production
```

## First-Time Setup

1. Start PocketBase and go to `http://localhost:8090/_/`
2. Create a superuser account
3. Open the app at `http://localhost:3000`
4. Register a new user account
5. Create your first store
6. Start adding products and selling!

## Environment Variables

```env
NUXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```
