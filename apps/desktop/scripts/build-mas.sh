#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/../.." && pwd)"
PROFILE="$ROOT/provisioning/MacAppStore.provisionprofile"

echo "=== Dropline Method 3 — Mac App Store build ==="

if [[ -f "$ROOT/scripts/setup-apple-certs.sh" ]]; then
  bash "$ROOT/scripts/setup-apple-certs.sh"
fi

if [[ ! -f "$PROFILE" ]]; then
  echo ""
  echo "ERROR: Missing provisioning profile at:"
  echo "  $PROFILE"
  echo "Copy from Manuscript-Master/artifacts/dropline-desktop/provisioning/ or create in App Store Connect."
  exit 1
fi

IDENTITIES=$(security find-identity -v -p codesigning 2>&1 || true)
if ! echo "$IDENTITIES" | grep -q "Apple Distribution"; then
  echo "ERROR: No Apple Distribution certificate in Keychain."
  exit 1
fi

ELECTRON_BUILD=1 npm run build:web --prefix "$REPO_ROOT"
cd "$ROOT"
electron-builder --mac mas --projectDir .

echo ""
PKG=$(find "$ROOT/dist/mas" -name "*.pkg" 2>/dev/null | head -1)
if [[ -n "$PKG" ]]; then
  echo "Upload with Transporter:"
  echo "  open -a Transporter \"$PKG\""
else
  echo "Check $ROOT/dist/mas/ for output."
fi
