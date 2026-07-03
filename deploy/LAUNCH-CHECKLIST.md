# Dropline launch — production checklist

Complete after pushing `Dropline-Method-3` `main` to GitLab.

## 1. Render full-stack deploy

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitLab → `stevenscanlanauthor/Dropline-Method-3` → branch `main`
3. Blueprint path: **`render.yaml`** (repo root)
4. Set sync:false secrets: `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`, Apple API keys
5. **Apply** → wait for **Live**

## 2. Verify before DNS cutover

```bash
curl -s https://YOUR-SERVICE.onrender.com/api/health
# {"ok":true,"service":"dropline-api"}
```

## 3. DNS cutover

See [PRODUCTION-FIX-NOW.md](./PRODUCTION-FIX-NOW.md) and [DNS-ENOM.md](./DNS-ENOM.md).

## 4. Post-cutover smoke test

```bash
curl -s https://www.droplinemethod.com/api/health
curl -s https://www.droplinemethod.com/api/billing/public
```

Browser: register → create book → `/billing` → `/privacy` → `/support`

## 5. Mac App Store

From `Manuscript-Master`:

```bash
pnpm --filter @workspace/dropline-desktop check:mas-profile
pnpm --filter @workspace/dropline-desktop build:mas:release
bash artifacts/dropline-desktop/scripts/upload-transporter.sh
```

## 6. iOS App Store

From `Chapter-Builder/artifacts/dropline-mobile`:

```bash
# EXPO_PUBLIC_DOMAIN=www.droplinemethod.com in .env.local
npx expo prebuild --platform ios --clean
# Xcode → Archive → Upload (build 21+)
```
