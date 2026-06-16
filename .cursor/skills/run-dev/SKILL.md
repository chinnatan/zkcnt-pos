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
| Daily dev / hot reload | `task local` | Backend in Docker, Bun on host |
| No Bun on machine | `task dev` | Everything in Docker |
| Production test | `task prod` | Detached, Nginx on port 80 |
| Frontend only | `task local:frontend` | Requires backend already running |
| Backend only | `task local:backend` | Backend container only |
| Browse SQLite DB | `task db-admin` | adminer-node at :8080 (dev only) |

First time:

```bash
task env      # create .env from .env.example
task local    # installs deps + starts backend + frontend
```

## Step 3: Verify Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/health |
| DB Admin (optional) | http://localhost:8080 |
| Production (Nginx) | http://localhost |

## Step 4: Stop Services

| Mode | Stop command |
|------|-------------|
| Local (backend) | `task local:stop` |
| Dev stack | `task dev:down` |
| Prod stack | `task prod:down` |
| DB admin | `task db-admin:stop` |

## Troubleshooting

### Port 3000 or 3001 already in use

```bash
lsof -i :3000
lsof -i :3001
# Kill the process or stop conflicting containers:
task local:stop
task dev:down
```

### Backend not ready / frontend can't connect

1. Ensure backend container is running: `docker ps | grep backend`
2. Start it: `task local:backend`
3. Wait for http://localhost:3001/api/health to respond before opening frontend
4. Verify env: `NUXT_PUBLIC_API_URL=http://localhost:3001`

### Bun install fails or postinstall blocked

```bash
cd frontend
bun pm trust @parcel/watcher
bun install
```

### Docker build fails

```bash
docker compose -f docker-compose.dev.yml build --no-cache backend
```

## Logs

```bash
task dev:logs    # dev stack
task prod:logs   # prod stack
docker compose -f docker-compose.dev.yml logs backend  # Backend only
```

## Do NOT

- Use `npm install` or `npm run dev` — project uses Bun
- Hardcode docker compose commands in docs — use task names from [Taskfile.yml](../../Taskfile.yml)
- Edit `docker-compose*.yml` without updating corresponding Taskfile tasks
