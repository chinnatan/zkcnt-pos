---
name: run-dev
description: >-
  Run and debug the zKCNT POS project. Use when the user asks to start the app,
  run locally, run dev/prod, troubleshoot ports, or set up the development
  environment.
---

# Run & Debug zKCNT POS

## Step 1: Check Prerequisites

Verify tools are installed:

```bash
task --version    # go-task
bun --version     # Bun
docker --version  # Docker
```

Install on macOS if missing:

```bash
brew install go-task/tap/go-task oven-sh/bun/bun
# Docker Desktop: https://www.docker.com/products/docker-desktop/
```

## Step 2: Choose Run Mode

| User intent | Command | Notes |
|-------------|---------|-------|
| Daily dev / hot reload | `task local` | PocketBase in Docker, Bun on host |
| No Bun on machine | `task dev` | Everything in Docker |
| Production test | `task prod` | Detached, Nginx on port 80 |
| Frontend only | `task local:frontend` | Requires PocketBase already running |
| Backend only | `task local:backend` | PocketBase container only |

First time:

```bash
task env      # create .env from .env.example
task local    # installs deps + starts PocketBase + frontend
```

## Step 3: Verify Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| PocketBase API | http://localhost:8090 |
| PocketBase Admin | http://localhost:8090/_/ |
| Production (Nginx) | http://localhost |

## Step 4: Stop Services

| Mode | Stop command |
|------|-------------|
| Local (PocketBase) | `task local:stop` |
| Dev stack | `task dev:down` |
| Prod stack | `task prod:down` |

## Troubleshooting

### Port 3000 or 8090 already in use

```bash
lsof -i :3000
lsof -i :8090
# Kill the process or stop conflicting containers:
task local:stop
task dev:down
```

### PocketBase not ready / frontend can't connect

1. Ensure PocketBase container is running: `docker ps | grep pocketbase`
2. Start it: `task local:backend`
3. Wait for http://localhost:8090 to respond before opening frontend
4. Verify env: `NUXT_PUBLIC_POCKETBASE_URL=http://localhost:8090`

### Bun install fails or postinstall blocked

```bash
cd frontend
bun pm trust @parcel/watcher
bun install
```

### Docker build fails

```bash
docker compose -f docker-compose.dev.yml build --no-cache pocketbase
```

### First-time PocketBase setup

1. Open http://localhost:8090/_/
2. Create superuser (first visit only)
3. Migrations run automatically from `backend/pb_migrations/`

## Logs

```bash
task dev:logs    # dev stack
task prod:logs   # prod stack
docker compose -f docker-compose.dev.yml logs pocketbase  # PocketBase only
```

## Do NOT

- Use `npm install` or `npm run dev` — project uses Bun
- Hardcode docker compose commands in docs — use task names from [Taskfile.yml](../../Taskfile.yml)
- Edit `docker-compose*.yml` without updating corresponding Taskfile tasks
