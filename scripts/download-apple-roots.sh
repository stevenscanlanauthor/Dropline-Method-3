#!/usr/bin/env bash
# Download Apple Root CA G2/G3 for App Store JWS verification.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/apps/api-server/src/lib/apple-roots"
mkdir -p "$DEST"

curl -fsSL -o "$DEST/AppleRootCA-G3.cer" \
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer"
curl -fsSL -o "$DEST/AppleRootCA-G2.cer" \
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer"

echo "✓ Apple root certificates saved to $DEST"
