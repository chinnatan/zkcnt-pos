#!/usr/bin/env bash
# Regenerate PNG app icons from frontend/public/favicon.svg (requires ImageMagick).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/frontend/public/favicon.svg"
OUT="$ROOT/frontend/public"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) is required." >&2
  exit 1
fi

magick -background none "$SVG" -resize 180x180 "$OUT/apple-touch-icon.png"
magick -background none "$SVG" -resize 192x192 "$OUT/pwa-192x192.png"
magick -background none "$SVG" -resize 512x512 "$OUT/pwa-512x512.png"

echo "Generated apple-touch-icon.png, pwa-192x192.png, pwa-512x512.png"
