#!/usr/bin/env bash
# Regenerate PNG app icons from frontend/public/favicon.svg (requires ImageMagick).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/frontend/public/favicon.svg"
OUT="$ROOT/frontend/public"
BG="#ffffff"
TMP="$(mktemp /tmp/zkcnt-icon-XXXXXX.png)"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) is required." >&2
  exit 1
fi

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

# Render at native 512 canvas, trim stray padding, then center on square background.
magick -size 512x512 "$SVG" -background none PNG32:"$TMP"
magick "$TMP" -trim +repage -gravity center -background "$BG" -extent 512x512 -alpha off "$TMP"

render_icon() {
  local size="$1"
  local file="$2"
  magick "$TMP" -resize "${size}x${size}!" "$file"
}

render_icon 180 "$OUT/apple-touch-icon.png"
render_icon 192 "$OUT/pwa-192x192.png"
render_icon 512 "$OUT/pwa-512x512.png"

echo "Generated apple-touch-icon.png, pwa-192x192.png, pwa-512x512.png"
