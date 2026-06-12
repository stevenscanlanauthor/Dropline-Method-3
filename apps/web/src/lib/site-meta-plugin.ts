import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_APP_URL = 'https://www.droplinemethod.com';

export function siteMetaPlugin(publicDir: string, options?: { writeFiles?: boolean }): Plugin {
  const writeFiles = options?.writeFiles !== false;
  const appUrl = (process.env.VITE_APP_URL ?? process.env.APP_URL ?? DEFAULT_APP_URL).replace(/\/+$/, '');
  const macAppStoreUrl = (process.env.VITE_MAC_APP_STORE_URL ?? process.env.MAC_APP_STORE_URL ?? '').trim();

  function writeSiteMeta(): void {
    fs.mkdirSync(publicDir, { recursive: true });

    const extraUrls = (process.env.VITE_SITEMAP_PATHS ?? '/sign-in')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    const urlEntries = [
      { loc: `${appUrl}/`, priority: '1.0', changefreq: 'weekly' },
      ...extraUrls.map(p => ({
        loc: `${appUrl}${p.startsWith('/') ? p : `/${p}`}`,
        priority: '0.8',
        changefreq: 'monthly',
      })),
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);

    const robots = `User-agent: *
Allow: /

Sitemap: ${appUrl}/sitemap.xml
`;
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);

    const relatedApplications = macAppStoreUrl
      ? `  "related_applications": [
    {
      "platform": "itunes",
      "url": "${macAppStoreUrl}"
    }
  ],
  "prefer_related_applications": false`
      : '';

    const manifest = `{
  "name": "Dropline",
  "short_name": "Dropline",
  "description": "Dropline helps authors write one drop at a time — from chapter headings to a completed draft using the Dropline Method.",
  "lang": "en",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#102A43",
  "background_color": "#F6F9FB",
  "categories": ["productivity", "books"],
  "icons": [
    { "src": "/favicon.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/logo-dropline-icon.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]${relatedApplications ? `,\n${relatedApplications}` : ''}
}
`;
    fs.writeFileSync(path.join(publicDir, 'manifest.webmanifest'), manifest);
  }

  return {
    name: 'dropline-site-meta',
    buildStart() {
      if (writeFiles) writeSiteMeta();
    },
    transformIndexHtml(html) {
      let out = html.replaceAll('__APP_URL__', appUrl);
      const description =
        'Dropline helps authors write one drop at a time — from chapter headings to a completed draft using the Dropline Method.';
      const ogImage = `${appUrl}/logo-dropline-icon.png`;
      const socialMeta = `    <meta property="og:title" content="Dropline — The Dropline Method" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${appUrl}/" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Dropline — The Dropline Method" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Dropline',
      url: `${appUrl}/`,
      description,
      applicationCategory: 'WritingApplication',
      operatingSystem: 'Web, macOS',
    })}</script>`;
      if (!out.includes('og:title')) {
        out = out.replace('</head>', `${socialMeta}\n  </head>`);
      }
      if (macAppStoreUrl) {
        const appId = macAppStoreUrl.match(/id(\d+)/)?.[1];
        if (appId && !out.includes('apple-itunes-app')) {
          out = out.replace(
            '</head>',
            `    <meta name="apple-itunes-app" content="app-id=${appId}" />\n  </head>`,
          );
        }
      }
      return out;
    },
  };
}
