# Dropline

A calm, method-first writing app. Work one drop at a time from chapter heading to compile-ready draft.

- **Web:** static SPA for [droplinemethod.com](https://www.droplinemethod.com)
- **Mac:** bundled Electron app (offline) or App Store shell in `Manuscript-Master/artifacts/dropline-desktop`

## Features

- Six-drop chapter workflow (heading → sentence → paragraph → rest notes → draft → final)
- Chapters sidebar with add/delete
- Corkboard with progress dots, word counts, drag reorder
- Inspector (book title, author, promise)
- Preview title page
- Compile manuscript (Drop 6 only) with Copy / DOCX / plain text
- Status bar: chapter/book words and read time
- Local autosave + `.dropline3` project files
- Sample project built in
- Markdown export

## Development

```bash
npm install
npm run dev:web          # http://localhost:5173
npm run dev:desktop      # Vite + Electron
```

## Build

```bash
npm run build:web
npm run build:mac:unsigned   # DMG in apps/desktop/dist/
```

## Deploy (Render)

See `deploy/GO-LIVE.md` and `deploy/render.yaml`.
# Dropline-Method-3
# Dropline-Method-3
# Dropline-Method-3
