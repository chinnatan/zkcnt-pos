#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

STAGING_DIR="$PROJECT_ROOT/backend/data/.backup-staging"
DATA_DIR="$PROJECT_ROOT/backend/data"
ENV_FILE="$PROJECT_ROOT/.env"

cd "$PROJECT_ROOT"

if ! docker compose -f "$COMPOSE_FILE" ps backend --status running -q | grep -q .; then
  echo "error: backend container is not running" >&2
  echo "hint: start production stack with 'task prod'" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE_NAME="zkcnt-${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"

mkdir -p "$BACKUP_DIR"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

echo "Creating online SQLite snapshot (VACUUM INTO)..."
docker compose -f "$COMPOSE_FILE" exec -T backend bun -e "
  const db = new Bun.SQLite('/data/pos.db');
  db.exec(\"VACUUM INTO '/data/.backup-staging/pos.db'\");
  db.close();
"

if [[ -d "$DATA_DIR/uploads" ]]; then
  echo "Copying uploads..."
  rsync -a "$DATA_DIR/uploads/" "$STAGING_DIR/uploads/"
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "Copying .env..."
  cp "$ENV_FILE" "$STAGING_DIR/.env"
fi

cat > "$STAGING_DIR/manifest.txt" <<EOF
timestamp=$TIMESTAMP
hostname=$(hostname)
compose_file=$COMPOSE_FILE
archive=$ARCHIVE_NAME
EOF

echo "Creating archive $ARCHIVE_PATH..."
tar czf "$ARCHIVE_PATH" -C "$STAGING_DIR" .

rm -rf "$STAGING_DIR"

ARCHIVE_SIZE="$(du -h "$ARCHIVE_PATH" | cut -f1)"
echo "Backup complete: $ARCHIVE_PATH ($ARCHIVE_SIZE)"

if [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$BACKUP_RETENTION_DAYS" -gt 0 ]]; then
  echo "Removing local backups older than ${BACKUP_RETENTION_DAYS} days..."
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'zkcnt-*.tar.gz' -mtime +"$BACKUP_RETENTION_DAYS" -delete
fi
