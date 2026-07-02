# Dropline production — fix now

## Problem (diagnosed)

`www.droplinemethod.com` points at the **old static site** (`dropline-method-3-web`), not the full-stack API service.

| Check | Current | Expected |
|-------|---------|----------|
| DNS `www` | `dropline-method-3-web.onrender.com` | New Node service (e.g. `dropline-xxxx.onrender.com`) |
| `GET /api/health` | Returns SPA HTML | `{"ok":true,"service":"dropline-api"}` |
| Sign-in / cloud sync | Not available | Works via Postgres API |

The code builds locally (`npm run build` ✓). Render needs the **root** `render.yaml` blueprint, not `deploy/render.yaml` (static-only).

---

## Step 1 — Deploy full-stack service on Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect **GitLab** → `stevenscanlanauthor/Dropline-Method-3` → branch **`main`**
3. **Blueprint path:** `render.yaml` (repo **root**, not `deploy/render.yaml`)
4. Click **Apply**

This creates:
- Web service **`dropline`** (Node API + SPA)
- Postgres **`dropline-db`**

## Step 2 — Environment variables

Open the new **`dropline`** web service → **Environment**:

| Variable | Value |
|----------|--------|
| `ADMIN_INITIAL_EMAIL` | Your admin email |
| `ADMIN_INITIAL_PASSWORD` | Strong password (admin created on first boot) |
| `APP_URL` | `https://www.droplinemethod.com` |
| `CORS_ORIGIN` | `https://droplinemethod.com,https://www.droplinemethod.com` |

`DATABASE_URL`, `JWT_SECRET` are set automatically by the blueprint.

**Manual Deploy** → wait until status is **Live** and health check passes.

## Step 3 — Verify Render URL before DNS switch

Copy the `*.onrender.com` URL from the new **`dropline`** service, then:

```bash
curl -s https://YOUR-DROPLINE-SERVICE.onrender.com/api/health
# Must return: {"ok":true,"service":"dropline-api"}
```

Also open the URL in a browser — sign-in / create account should work.

## Step 4 — Move custom domains to the new service

1. **Old service** `dropline-method-3-web` → **Settings** → **Custom Domains** → **remove** `www.droplinemethod.com` and `droplinemethod.com`
2. **New service** `dropline` → **Settings** → **Custom Domains** → **add** both domains
3. Update eNom DNS if Render shows a **different** CNAME target — see [DNS-ENOM.md](./DNS-ENOM.md)

Wait for **Verified** + TLS (usually minutes).

## Step 5 — Verify production

```bash
curl -s https://www.droplinemethod.com/api/health
# {"ok":true,"service":"dropline-api"}

curl -sI https://www.droplinemethod.com | head -3
# HTTP/2 200
```

In browser:
- Create account / sign in
- Create a book → edits save and sync
- Sign in as admin → `/admin` (Users, Login Attempts, Security tabs) — see [ADMIN.md](./ADMIN.md)

## Step 6 — Decommission old static site (optional)

After domains work on **`dropline`**, suspend or delete **`dropline-method-3-web`** to avoid confusion.

---

## Local verify (from Manuscript-Master)

```bash
cd artifacts/dropline-desktop
pnpm run verify:app-store-readiness
```

---

## Not included yet

- Stripe billing (`$39` lifetime) — API has no billing routes; Mac App Store model is **free download** for now
- AuthorsDrop integration — separate product, separate database
