# Dropline Method 3 — Mac desktop build

Offline-first Mac app bundling the React editor (same UI as the web app). Pattern matches **AuthorsDrop desktop** in `Manuscript-Master/artifacts/authorsdrop-desktop/`.

## Quick start (unsigned DMG — local testing)

From the repo root:

```bash
npm install
npm run build:mac:unsigned
```

Outputs:

- **App:** `apps/desktop/dist/mac-arm64/Dropline Method 3.app`
- **DMG:** `apps/desktop/dist/Dropline Method 3-1.0.0-arm64.dmg`

Open the app (first launch may require right-click → **Open** for unsigned builds):

```bash
open "apps/desktop/dist/mac-arm64/Dropline Method 3.app"
```

## Dev mode (live reload)

```bash
npm run dev:desktop
```

Loads `http://localhost:5173` inside Electron.

## Signed + notarized DMG (distribution outside App Store)

```bash
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run build:mac --workspace @dropline-method-3/desktop
# or from apps/desktop: NOTARIZE=true npm run build:signed
```

Requires valid **Developer ID Application** certificate in Keychain.

## Mac App Store

1. Copy `MacAppStore.provisionprofile` into `apps/desktop/provisioning/` (from App Store Connect).
2. Install **Apple Distribution** and **Mac Installer Distribution** certs.
3. Run:

```bash
cd apps/desktop && npm run build:mas
```

Upload the `.pkg` from `dist/mas/` with **Transporter**.

## Icons

```bash
npm run icons --workspace @dropline-method-3/desktop
```

Regenerates `assets/icon.icns` from `apps/web/public/logo-dropline-icon.png`.
