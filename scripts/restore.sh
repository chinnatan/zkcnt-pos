#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"

DATA_DIR="$PROJECT_ROOT/backend/data"
ENV_FILE="$PROJECT_ROOT/.env"
STAGING_DIR="$PROJECT_ROOT/backend/data/.restore-staging"

AUTO_YES=false
WITH_ENV=false
ARCHIVE_PATH=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] <archive.tar.gz>

Options:
  --yes        Skip confirmation prompt
  --with-env   Restore .env from archive (overwrites current .env)
  -h, --help   Show this help

Example:
  task restore -- backups/zkcnt-20250620_030000.tar.gz
  $(basename "$0") --yes --with-env backups/zkcnt-20250620_030000.tar.gz
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      AUTO_YES=true
      shift
      ;;
    --with-env)
      WITH_ENV=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "error: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "$ARCHIVE_PATH" ]]; then
        echo "error: unexpected argument: $1" >&2
        usage >&2
        exit 1
      fi
      ARCHIVE_PATH="$1"
      shift
      ;;
  esac
done

if [[ -z "$ARCHIVE_PATH" ]]; then
  echo "error: archive path is required" >&2
  usage >&2
  exit 1
fi

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  if [[ -f "$PROJECT_ROOT/$ARCHIVE_PATH" ]]; then
    ARCHIVE_PATH="$PROJECT_ROOT/$ARCHIVE_PATH"
  else
    echo "error: archive not found: $ARCHIVE_PATH" >&2
    exit 1
  fi
fi

cd "$PROJECT_ROOT"

if [[ "$AUTO_YES" != true ]]; then
  echo "This will replace backend/data/pos.db and backend/data/uploads/."
  echo "Archive: $ARCHIVE_PATH"
  read -r -p "Continue? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

mkdir -p "$BACKUP_DIR"

echo "Stopping backend..."
docker compose -f "$COMPOSE_FILE" stop backend

PRE_RESTORE_ARCHIVE="$BACKUP_DIR/pre-restore-$(date +%Y%m%d_%H%M%S).tar.gz"
echo "Creating pre-restore safety backup: $PRE_RESTORE_ARCHIVE"

PRE_STAGING="$PROJECT_ROOT/backend/data/.pre-restore-staging"
rm -rf "$PRE_STAGING"
mkdir -p "$PRE_STAGING"

if [[ -f "$DATA_DIR/pos.db" ]]; then
  cp "$DATA_DIR/pos.db" "$PRE_STAGING/pos.db"
fi
if [[ -d "$DATA_DIR/uploads" ]]; then
  rsync -a "$DATA_DIR/uploads/" "$PRE_STAGING/uploads/"
fi
if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "$PRE_STAGING/.env"
fi

tar czf "$PRE_RESTORE_ARCHIVE" -C "$PRE_STAGING" .
rm -rf "$PRE_STAGING"

echo "Extracting archive..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
tar xzf "$ARCHIVE_PATH" -C "$STAGING_DIR"

if [[ ! -f "$STAGING_DIR/pos.db" ]]; then
  echo "error: archive does not contain pos.db" >&2
  docker compose -f "$COMPOSE_FILE" start backend || true
  rm -rf "$STAGING_DIR"
  exit 1
fi

echo "Restoring database and uploads..."
cp "$STAGING_DIR/pos.db" "$DATA_DIR/pos.db"
rm -f "$DATA_DIR/pos.db-wal" "$DATA_DIR/pos.db-shm"

if [[ -d "$STAGING_DIR/uploads" ]]; then
  mkdir -p "$DATA_DIR/uploads"
  rsync -a --delete "$STAGING_DIR/uploads/" "$DATA_DIR/uploads/"
fi

if [[ "$WITH_ENV" == true ]]; then
  if [[ -f "$STAGING_DIR/.env" ]]; then
    echo "Restoring .env..."
    cp "$STAGING_DIR/.env" "$ENV_FILE"
  else
    echo "warning: --with-env set but archive has no .env" >&2
  fi
fi

rm -rf "$STAGING_DIR"

echo "Starting backend..."
docker compose -f "$COMPOSE_FILE" start backend

echo "Restore complete."
echo "If the backup is older than the current code, run: task backend:migrate"
