# Google Search & app discovery (Dropline)

Same pattern as AuthorsDrop: the site publishes a **web manifest**, **sitemap**, and **robots.txt** so Google can index droplinemethod.com and surface the Mac app when the listing is live.

## Built automatically on deploy

| File | URL |
|------|-----|
| Sitemap | `https://www.droplinemethod.com/sitemap.xml` |
| Robots | `https://www.droplinemethod.com/robots.txt` |
| Web manifest | `https://www.droplinemethod.com/manifest.webmanifest` |
| Apple association | `https://www.droplinemethod.com/.well-known/apple-app-site-association` |

The manifest includes `related_applications` → Mac App Store when `VITE_MAC_APP_STORE_URL` is set at build time.

## Render env vars

| Variable | Example |
|----------|---------|
| `VITE_APP_URL` | `https://www.droplinemethod.com` |
| `VITE_MAC_APP_STORE_URL` | `https://apps.apple.com/app/dropline/idXXXXXXXXX` |

Set `VITE_MAC_APP_STORE_URL` in Render after the Mac app is approved, then redeploy.

## Google Search Console (manual)

1. Open [Google Search Console](https://search.google.com/search-console)
2. Add property **`https://www.droplinemethod.com`**
3. Verify ownership (DNS TXT or HTML file)
4. **Sitemaps** → submit `https://www.droplinemethod.com/sitemap.xml`
5. After the Mac App Store listing is live:
   - **Settings** → associate your **iOS/macOS app** with this website (if offered), or
   - Ensure `manifest.webmanifest` includes the App Store URL (automatic when `VITE_MAC_APP_STORE_URL` is set)

Google may take days to refresh; request indexing for the homepage after deploy.

## Verify after deploy

```bash
curl -sI https://www.droplinemethod.com/sitemap.xml
curl -sI https://www.droplinemethod.com/manifest.webmanifest
curl -s https://www.droplinemethod.com/manifest.webmanifest | head
```

Manifest should list `related_applications` with your App Store URL once the env var is set.
