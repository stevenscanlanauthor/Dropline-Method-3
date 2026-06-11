#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

echo "Building web assets for Electron (relative asset paths)…"
npm run build:electron --workspace @dropline-method-3/web --prefix "$ROOT"

echo "Refreshing Mac icon…"
bash "$ROOT/apps/desktop/scripts/generate-icon.sh"

echo "Packaging Mac DMG…"
SEVEN_ZA="$ROOT/node_modules/7zip-bin/mac/arm64/7za"
if [[ -f "$SEVEN_ZA" ]]; then
  chmod +x "$SEVEN_ZA"
fi
cd "$ROOT/apps/desktop"
EB="$ROOT/node_modules/.bin/electron-builder"
CSC_IDENTITY_AUTO_DISCOVERY="${CSC_IDENTITY_AUTO_DISCOVERY:-false}" "$EB" --mac dmg --projectDir .

echo ""
ls -1 "$ROOT/apps/desktop/dist/"*.dmg 2>/dev/null || true
echo ""
echo "App: $ROOT/apps/desktop/dist/mac-arm64/Dropline Method 3.app"
