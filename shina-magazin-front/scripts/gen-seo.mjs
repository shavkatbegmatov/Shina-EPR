// Build-vaqtida SEO fayllarini hosil qiladi: public/robots.txt + public/sitemap.xml.
// Domen VITE_SITE_URL env'dan olinadi (Coolify build env). Bo'sh bo'lsa relativ loc.
// package.json "prebuild" orqali `vite build`dan oldin ishlaydi.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SITE = (process.env.VITE_SITE_URL || '').replace(/\/+$/, '');
const pub = resolve(dirname(fileURLToPath(import.meta.url)), '../public');

// Ommaviy storefront marshrutlari (statik). Dinamik /mahsulot/:id keyinroq qo'shiladi.
const routes = ['/', '/katalog', '/saqlanganlar', '/solishtirish'];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${SITE}${r}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>
`;
writeFileSync(resolve(pub, 'sitemap.xml'), sitemap);

const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /hisob
Disallow: /kirish
Disallow: /checkout
Disallow: /buyurtma
${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ''}`;
writeFileSync(resolve(pub, 'robots.txt'), robots);

console.log(`[gen-seo] robots.txt + sitemap.xml yozildi (VITE_SITE_URL="${SITE}")`);
