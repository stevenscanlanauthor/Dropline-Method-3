#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/../web/public/logo-dropline-icon.png"
ASSETS="$ROOT/assets"

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing $SOURCE" >&2
  exit 1
fi

echo "Building Dropline icon from logo…"
sips -s format png -z 1024 1024 "$SOURCE" --out "$ASSETS/icon.png" >/dev/null

ICONSET="$ASSETS/icon.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -s format png -z "$size" "$size" "$ASSETS/icon.png" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  s2=$((size * 2))
  sips -s format png -z "$s2" "$s2" "$ASSETS/icon.png" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$ASSETS/icon.icns"
rm -rf "$ICONSET"

echo "Done: $ASSETS/icon.icns"
