// Build-vaqtida (postbuild) storefront sahifalariga PER-SAHIFA meta inject qiladi.
// dist/index.html'dan har statik marshrut uchun dist/<route>/index.html yaratadi
// (title + description + og/twitter title/description + og:url almashtiriladi).
// Chromium/SSR YO'Q — faqat meta teglar (crawler/link-preview shuni o'qiydi).
// nginx `try_files $uri $uri/ /index.html` avtomatik shu fayllarni beradi.
//
// Dinamik /mahsulot/:id build vaqtida backend'siz prerender qilinmaydi —
// per-mahsulot og:image runtime meta (keyingi bosqich) bilan qilinadi.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SITE = (process.env.VITE_SITE_URL || '').replace(/\/+$/, '');
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const SITE_NAME = 'Protektor';

// src/router/index.tsx handle'lari bilan MOS bo'lishi shart (crawler ko'radigan meta
// foydalanuvchi client-side ko'radigan meta bilan bir xil bo'lishi uchun).
const routes = [
  { path: '/katalog', title: 'Katalog', description: "Shinalar katalogi — brend, o'lcham, mavsum va narx bo'yicha filtrlab kerakli shinani toping." },
  { path: '/saqlanganlar', title: 'Saqlanganlar', description: "Saqlangan (sevimli) mahsulotlaringiz ro'yxati." },
  { path: '/solishtirish', title: 'Solishtirish', description: "Tanlangan shinalarni xususiyatlari bo'yicha yonma-yon solishtiring." },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let base;
try {
  base = readFileSync(resolve(dist, 'index.html'), 'utf8');
} catch {
  console.error("[gen-prerender] dist/index.html topilmadi — build'dan keyin ishga tushiring.");
  process.exit(0); // build'ni buzmaymiz
}

// content="..." ni almashtiruvchi yordamchi (before/after group'lar bilan)
const sub = (html, re, val) => html.replace(re, (_m, a, b) => `${a}${esc(val)}${b}`);

let count = 0;
for (const r of routes) {
  const fullTitle = `${r.title} · ${SITE_NAME}`;
  let html = base;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = sub(html, /(<meta name="description" content=")[^"]*(")/, r.description);
  html = sub(html, /(<meta property="og:title" content=")[^"]*(")/, fullTitle);
  html = sub(html, /(<meta property="og:description" content=")[^"]*(")/, r.description);
  html = sub(html, /(<meta name="twitter:title" content=")[^"]*(")/, fullTitle);
  html = sub(html, /(<meta name="twitter:description" content=")[^"]*(")/, r.description);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}${r.path}$2`);

  const dir = resolve(dist, r.path.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), html);
  count++;
}

console.log(`[gen-prerender] ${count} storefront sahifasi meta bilan prerender qilindi (VITE_SITE_URL="${SITE}")`);
