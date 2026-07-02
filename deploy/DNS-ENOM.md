# DNS setup — droplinemethod.com (eNom)

Domain registrar: **eNom** (Name Services DNS).

**Important:** Point DNS at the **full-stack Node service** (`dropline` from root `render.yaml`), **not** the old static site `dropline-method-3-web`.

See [PRODUCTION-FIX-NOW.md](./PRODUCTION-FIX-NOW.md) if `/api/health` returns HTML instead of JSON.

## 1. Add custom domains on Render

1. [dashboard.render.com](https://dashboard.render.com) → open service **`dropline`** (Node + API)
2. Left sidebar → **Settings** → **Custom Domains**
3. Add:
   - `www.droplinemethod.com`
   - `droplinemethod.com`
4. Copy the **CNAME target** Render shows (e.g. `dropline.onrender.com` or similar — use the exact value from your dashboard)

Remove these domains from the old **`dropline-method-3-web`** static service first.

## 2. eNom DNS records

Log in at [enomdomains.com](https://www.enomdomains.com) → **My Domains** → **droplinemethod.com** → **DNS** / **Host Records**.

**Remove** A records pointing at `64.98.135.62` (eNom parking) if still present.

| Host | Type | Value |
|------|------|-------|
| `www` | CNAME | Exact target from Render **`dropline`** service |
| `@` | CNAME or ALIAS | Same Render target, or redirect apex → `www` |

**Apex `@` note:** If eNom does not allow CNAME on `@`, use **ANAME/ALIAS** or **URL redirect** from `https://droplinemethod.com` → `https://www.droplinemethod.com`.

## 3. Wait for SSL

Render provisions HTTPS after DNS propagates. Custom domains should show **Verified**.

## 4. Verify

```bash
curl -s https://www.droplinemethod.com/api/health
# {"ok":true,"service":"dropline-api"}

curl -sI https://www.droplinemethod.com
curl -sI https://droplinemethod.com
```

Both should return `200` (or apex `301` → `www`).
