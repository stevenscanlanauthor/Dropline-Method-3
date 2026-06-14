# Dropline Method 3 — deploy to droplinemethod.com (Render)

The web app is a Vite React SPA with a **Dropline-only** Node API and Postgres for accounts, books, and admin. **No connection to AuthorsDrop.**

## Accounts & admin

- Sign in / create account at `/` (email + password)
- Books are stored per user in Postgres and cached locally (hybrid sync)
- Admin panel at `/admin` (admin users only)
- Set `ADMIN_INITIAL_EMAIL` and `ADMIN_INITIAL_PASSWORD` on first deploy to create your admin account

See [deploy/.env.example](./.env.example) for local development variables.

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
4. **Blueprint path:** `render.yaml` (repo root)
5. Click **Apply** (not just Retry)
6. In the new **dropline** web service → **Environment**, set:
   - `ADMIN_INITIAL_EMAIL` — your admin login email
   - `ADMIN_INITIAL_PASSWORD` — strong password (creates admin on first boot)

This deploys a **Node web service** (API + static SPA) and a **Postgres** database. The old static-only site (`dropline-method-3-web`) can be deleted after the new service is live.

If you see *“Blueprint file render.yaml not found”*, the code was not pushed to GitLab `main` yet.

## 4. Custom domain

1. [dashboard.render.com](https://dashboard.render.com) → open the **`dropline`** web service (not the old static site)
2. Left sidebar → **Settings** → scroll to **Custom Domains**
3. **Add Custom Domain** → add `www.droplinemethod.com` and `droplinemethod.com`
4. Copy the CNAME targets Render shows (usually `dropline.onrender.com` or similar)
5. At eNom, update DNS — see **[DNS-ENOM.md](./DNS-ENOM.md)** for host records
6. Wait for **Verified** status and TLS (usually minutes)

**Current check:** `www.droplinemethod.com` still points at eNom parking (`64.98.135.62`), not Render. Follow DNS-ENOM.md to fix.

## 5. Verify

- Open `https://www.droplinemethod.com` — sign in / create account
- Create a book → edits auto-save locally and sync to your account
- Admin: sign in as admin → `/admin` to manage users
- Export Markdown and `.dropline3` save/open still work in the editor

## Mac app (separate from Render)

The Mac `.app` / `.dmg` is built locally and distributed separately (not hosted on Render):

```bash
npm run build:mac:unsigned
```

Output: `apps/desktop/dist/Dropline Method 3-*.dmg`

Add a download link on droplinemethod.com when the DMG is ready.

## Not included

- No connection to AuthorsDrop (separate product, separate accounts, separate database)
