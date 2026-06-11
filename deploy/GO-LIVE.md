# Dropline Method 3 — deploy to droplinemethod.com (Render)

The web app is a static Vite build. No server, database, or API keys required.

## 1. Push repo to GitHub

```bash
cd Dropline-Method-3
git init
git add .
git commit -m "Dropline Method 3 web + Mac app"
git remote add origin git@github.com:YOUR_USER/Dropline-Method-3.git
git push -u origin main
```

## 2. Push to GitLab (or GitHub)

Render needs the **full project** on branch **`main`**, including root **`render.yaml`**.

```bash
cd Dropline-Method-3
git add .
git commit -m "Dropline Method 3 — web + Mac app"
git remote add gitlab git@gitlab.com:stevenscanlanauthor/Dropline-Method-3.git   # if not added
git push -u gitlab main
```

## 3. Create Render Blueprint

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect **GitLab** → repo **`stevenscanlanauthor/Dropline-Method-3`**
3. **Branch:** `main`
4. **Blueprint path:** `render.yaml` (repo root) — or `deploy/render.yaml` if you only have that file
5. Click **Apply** (not just Retry)

If you see *“Blueprint file render.yaml not found”*, the code was not pushed to GitLab `main` yet, or the path is wrong.

Manual alternative — **New** → **Static Site** with:
   - **Build command:** `npm ci && npm run build:web`
   - **Publish directory:** `apps/web/dist`
   - **Rewrite rule:** `/*` → `/index.html` (SPA)

## 4. Custom domain

1. Render → your static site → **Settings** → **Custom Domains**
2. Add `droplinemethod.com` and `www.droplinemethod.com`
3. At your DNS host, add the CNAME records Render provides
4. Wait for TLS (usually minutes)

## 5. Verify

- Open `https://www.droplinemethod.com` — full 6-drop editor loads
- Create a project → Save (downloads `.dropline3`) → Open Project → same file reloads
- Export Markdown works

## Mac app (separate from Render)

The Mac `.app` / `.dmg` is built locally and distributed separately (not hosted on Render):

```bash
npm run build:mac:unsigned
```

Output: `apps/desktop/dist/Dropline Method 3-*.dmg`

Add a download link on droplinemethod.com when the DMG is ready.

## Not included

- No connection to AuthorsDrop
- No cloud sync or accounts (v1)
