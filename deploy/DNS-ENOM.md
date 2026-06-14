# DNS setup — droplinemethod.com (eNom)

Domain registrar: **eNom** (Name Services DNS).

## 1. Add custom domains on Render

1. [dashboard.render.com](https://dashboard.render.com) → open service **`dropline-method-3-web`**
2. Left sidebar → **Settings**
3. Scroll to **Custom Domains** → **Add Custom Domain**
4. Add both:
   - `www.droplinemethod.com`
   - `droplinemethod.com`
5. Copy the **CNAME target** Render shows for each (typically `dropline-method-3-web.onrender.com`)

## 2. eNom DNS records

Log in at [enomdomains.com](https://www.enomdomains.com) → **My Domains** → **droplinemethod.com** → **DNS** / **Host Records**.

**Remove** existing A records pointing at `64.98.135.62` (eNom parking/default) for `@` and `www`.

| Host | Type | Value |
|------|------|-------|
| `www` | CNAME | `dropline-method-3-web.onrender.com` (or exact target from Render) |
| `@` | CNAME or ALIAS | Same Render target for apex, if eNom supports it |

**Apex `@` note:** If eNom does not allow CNAME on `@`, use **ANAME/ALIAS** or a **URL redirect** from `https://droplinemethod.com` → `https://www.droplinemethod.com`.

## 3. Render environment

After the domain is live, confirm in **dropline-method-3-web** → **Environment**:

| Variable | Value |
|----------|-------|
| `VITE_APP_URL` | `https://www.droplinemethod.com` |

Redeploy after changing `VITE_*` vars (they are baked in at build time).

## 4. Wait for SSL

Render provisions HTTPS automatically (usually a few minutes after DNS propagates). In **Custom Domains**, each entry should show **Verified**.

## 5. Verify

```bash
curl -sI https://www.droplinemethod.com
curl -sI https://droplinemethod.com
```

Both should return `200` (or `301` redirect to `www`).

Until DNS is updated, the app remains available at:

`https://dropline-method-3-web.onrender.com`
