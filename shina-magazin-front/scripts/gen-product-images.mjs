// Demo mahsulot rasmlari generatori.
//   node scripts/gen-product-images.mjs
// Chiqadi:
//   • public/products/<sku>.svg     — har mahsulot uchun premium kvadrat shina renderi
//   • src/shop/data/demoProducts.ts — offline vitrina (kanonik katalogdan)
// Rasmlar tashqi tarmoqqa bogʻliq emas (offline ishlaydi, deploy'da yoʻqolmaydi).

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CATALOG, sizeString, fullName, imageUrlFor } from './demo-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_IMG = resolve(ROOT, 'public/products');
const OUT_DEMO = resolve(ROOT, 'src/shop/data/demoProducts.ts');

const SEASONS = {
  SUMMER:     { bg1: '#fff7ed', bg2: '#fbdca6', accent: '#f59e0b', glow: '#fbbf24', label: 'YOZGI', glyph: 'sun' },
  WINTER:     { bg1: '#eef5ff', bg2: '#bcd6fb', accent: '#3b82f6', glow: '#60a5fa', label: 'QISHKI', glyph: 'snow' },
  ALL_SEASON: { bg1: '#e9fbf1', bg2: '#a7e8c4', accent: '#10b981', glow: '#34d399', label: 'HAMMA MAVSUM', glyph: 'leaf' },
};

const C = 320; // markaz
const rad = (deg) => (deg * Math.PI) / 180;
const pol = (r, deg) => [round(C + r * Math.sin(rad(deg))), round(C - r * Math.cos(rad(deg)))];
const round = (n) => Math.round(n * 100) / 100;

/** sku dan barqaror butun hash (variatsiya uchun). */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

/** Aylanma yoy path (textPath uchun). */
function arcPath(r, a0, a1, sweep) {
  const [x0, y0] = pol(r, a0);
  const [x1, y1] = pol(r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 ${sweep} ${x1} ${y1}`;
}

/** Aylanaga aylantirilgan yumaloq to'rtburchaklar (protektor / disk pockets). */
function ringRects({ count, y, h, w, rx, fill, stroke = 'none', sw = 0, phase = 0, opacity = 1 }) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const deg = round((i / count) * 360 + phase);
    out += `<rect x="${round(C - w / 2)}" y="${round(y)}" width="${w}" height="${h}" rx="${rx}" `
      + `fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}`
      + `${opacity !== 1 ? ` opacity="${opacity}"` : ''} transform="rotate(${deg} ${C} ${C})"/>`;
  }
  return out;
}

function seasonGlyph(kind) {
  // kichik oq belgi (badge ichida), markaz (0,0) atrofida ~9px radius
  if (kind === 'sun') {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 360;
      const [x1, y1] = [C + 0, C - 8];
      void x1; void y1;
      const dx = Math.sin(rad(a)), dy = -Math.cos(rad(a));
      rays += `<line x1="${round(dx * 8)}" y1="${round(dy * 8)}" x2="${round(dx * 12)}" y2="${round(dy * 12)}" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return `<g>${rays}<circle r="5.2" fill="#fff"/></g>`;
  }
  if (kind === 'snow') {
    let arms = '';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 360;
      const dx = Math.sin(rad(a)), dy = -Math.cos(rad(a));
      arms += `<line x1="0" y1="0" x2="${round(dx * 11)}" y2="${round(dy * 11)}" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
      // kichik yon tikuvlar
      const [bx, by] = [dx * 7, dy * 7];
      const px = Math.sin(rad(a + 90)), py = -Math.cos(rad(a + 90));
      arms += `<line x1="${round(bx - px * 3)}" y1="${round(by - py * 3)}" x2="${round(bx + px * 3)}" y2="${round(by + py * 3)}" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    return `<g>${arms}</g>`;
  }
  // leaf (hamma mavsum)
  return `<g><path d="M -9 6 C -9 -6 3 -10 10 -9 C 11 -2 7 9 -6 9 C -8 9 -9 8 -9 6 Z" fill="#fff"/>`
    + `<path d="M -6 6 C -2 1 4 -3 8 -6" stroke="${'#10b981'}" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
}

function tireSVG(it) {
  const s = SEASONS[it.season];
  const H = hash(it.sku);
  const spokes = [5, 6, 7][H % 3];
  const treadN = [40, 44, 48][(H >> 3) % 3];
  const rimPhase = (H % spokes === 0) ? 18 : 30;
  const brandText = `${it.brand} ${it.model}`.toUpperCase();
  const specText = `${sizeString(it)}  ·  ${it.load}${it.speed}`;
  const initial = it.brand[0].toUpperCase();

  // Sidewall matn yoylari
  const topArc = arcPath(184, -66, 66, 1);
  const botArc = arcPath(176, 232, 128, 0);

  // Mavsum badge o'lchami
  const badgeW = 62 + s.label.length * 11.5;
  const badgeX = round(C - badgeW / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 640 640" width="640" height="640" role="img" aria-label="${esc(fullName(it))}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${s.bg1}"/><stop offset="1" stop-color="${s.bg2}"/>
    </linearGradient>
    <radialGradient id="vig" cx="50%" cy="42%" r="62%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.65"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="rubber" cx="38%" cy="30%" r="78%">
      <stop offset="0" stop-color="#454d57"/><stop offset="0.42" stop-color="#252b32"/>
      <stop offset="0.8" stop-color="#12161b"/><stop offset="1" stop-color="#080a0d"/>
    </radialGradient>
    <radialGradient id="alloy" cx="40%" cy="33%" r="80%">
      <stop offset="0" stop-color="#f6f9fc"/><stop offset="0.4" stop-color="#d2dbe3"/>
      <stop offset="0.72" stop-color="#9aa6b3"/><stop offset="1" stop-color="#66717d"/>
    </radialGradient>
    <radialGradient id="cap" cx="40%" cy="34%" r="80%">
      <stop offset="0" stop-color="${s.glow}"/><stop offset="1" stop-color="${s.accent}"/>
    </radialGradient>
    <radialGradient id="hub" cx="42%" cy="36%" r="75%">
      <stop offset="0" stop-color="#eef2f6"/><stop offset="0.7" stop-color="#b7c1cc"/><stop offset="1" stop-color="#7d8894"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="gloss" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>

  <rect width="640" height="640" fill="url(#bg)"/>
  <rect width="640" height="640" fill="url(#vig)"/>

  <!-- pol soyasi -->
  <ellipse cx="320" cy="566" rx="224" ry="34" fill="#0f172a" opacity="0.20" filter="url(#soft)"/>
  <!-- mavsum nur halosi -->
  <circle cx="320" cy="312" r="262" fill="${s.glow}" opacity="0.16" filter="url(#gloss)"/>

  <g transform="translate(0 -8)">
    <!-- rezina (tashqi protektor) -->
    <circle cx="320" cy="320" r="252" fill="#05070a"/>
    <circle cx="320" cy="320" r="250" fill="url(#rubber)"/>
    <circle cx="320" cy="320" r="250" fill="none" stroke="${s.accent}" stroke-width="3" opacity="0.85"/>

    <!-- protektor lug'lari + ariqlar -->
    ${ringRects({ count: treadN, y: 72, h: 34, w: 15, rx: 3, fill: '#3a424c', opacity: 0.55 })}
    ${ringRects({ count: treadN, y: 74, h: 12, w: 9, rx: 2, fill: '#0b0e12', opacity: 0.7 })}
    <circle cx="320" cy="320" r="214" fill="none" stroke="#05070a" stroke-width="6" opacity="0.8"/>
    <circle cx="320" cy="320" r="238" fill="none" stroke="#05070a" stroke-width="3" opacity="0.6"/>

    <!-- sidewall matni (brend + o'lcham) -->
    <path id="ta_${idc(it.sku)}" d="${topArc}" fill="none"/>
    <path id="ba_${idc(it.sku)}" d="${botArc}" fill="none"/>
    <text font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" letter-spacing="3" fill="#0a0d11" opacity="0.6">
      <textPath href="#ta_${idc(it.sku)}" xlink:href="#ta_${idc(it.sku)}" startOffset="50%" text-anchor="middle" dy="1.5">${esc(brandText)}</textPath>
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" letter-spacing="3" fill="#eef2f6">
      <textPath href="#ta_${idc(it.sku)}" xlink:href="#ta_${idc(it.sku)}" startOffset="50%" text-anchor="middle">${esc(brandText)}</textPath>
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" letter-spacing="2" fill="#c7d0d9">
      <textPath href="#ba_${idc(it.sku)}" xlink:href="#ba_${idc(it.sku)}" startOffset="50%" text-anchor="middle">${esc(specText)}</textPath>
    </text>

    <!-- disk (alloy) -->
    <circle cx="320" cy="320" r="152" fill="#05070a"/>
    <circle cx="320" cy="320" r="150" fill="url(#alloy)"/>
    <circle cx="320" cy="320" r="150" fill="none" stroke="#5a6570" stroke-width="2"/>
    <!-- pockets (spitsalar orasi) -->
    ${ringRects({ count: spokes, y: 176, h: 78, w: 34, rx: 16, fill: '#161b21', phase: rimPhase })}
    ${ringRects({ count: spokes, y: 176, h: 78, w: 34, rx: 16, fill: 'none', stroke: '#ffffff', sw: 1, phase: rimPhase, opacity: 0.12 })}
    <!-- stupitsa -->
    <circle cx="320" cy="320" r="66" fill="url(#hub)" stroke="#5a6570" stroke-width="2"/>
    ${lugNuts(spokes)}
    <!-- markaziy qopqoq (brend belgisi) -->
    <circle cx="320" cy="320" r="34" fill="url(#cap)" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
    <text x="320" y="320" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${esc(initial)}</text>

    <!-- yaltiroq (gloss) -->
    <ellipse cx="238" cy="212" rx="120" ry="70" fill="#ffffff" opacity="0.10" filter="url(#gloss)"/>
  </g>

  <!-- mavsum badge -->
  <g transform="translate(0 0)">
    <rect x="${badgeX}" y="30" width="${round(badgeW)}" height="40" rx="20" fill="${s.accent}"/>
    <rect x="${badgeX}" y="30" width="${round(badgeW)}" height="40" rx="20" fill="#ffffff" opacity="0.10"/>
    <g transform="translate(${round(badgeX + 26)} 50)">${seasonGlyph(s.glyph)}</g>
    <text x="${round(badgeX + 48)}" y="50" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" letter-spacing="1" fill="#ffffff" dominant-baseline="central">${esc(s.label)}</text>
  </g>
</svg>`;
}

function lugNuts(n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + 36;
    const [x, y] = pol(46, a);
    out += `<circle cx="${x}" cy="${y}" r="6.5" fill="#2b333c" stroke="#7d8894" stroke-width="1.2"/>`
      + `<circle cx="${round(x - 1.5)}" cy="${round(y - 1.5)}" r="2" fill="#aeb8c2"/>`;
  }
  return out;
}

const idc = (sku) => sku.replace(/[^a-zA-Z0-9]/g, '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Yozish ──
mkdirSync(OUT_IMG, { recursive: true });
let n = 0;
for (const it of CATALOG) {
  writeFileSync(resolve(OUT_IMG, `${it.sku}.svg`), tireSVG(it), 'utf8');
  n++;
}

// demoProducts.ts (offline vitrina) — kanonik katalogdan
const catName = (c) => c.includes('SUV') ? 'SUV / Krossover'
  : c.includes('Yuk') ? 'Yuk / tijorat'
  : c.includes('Mototsikl') ? 'Mototsikl'
  : c.includes('Sport') ? 'Sport / UHP'
  : c.includes('Elektro') ? 'Elektromobil'
  : 'Yengil avtomobil';
const catId = (c) => c.includes('SUV') ? 3 : c.includes('Yuk') ? 4 : c.includes('Mototsikl') ? 5
  : c.includes('Sport') ? 6 : c.includes('Elektro') ? 7 : 1;

const rows = CATALOG.map((it, i) => {
  const low = it.qty > 0 && it.qty <= it.min;
  return `  {
    id: ${i + 1}, sku: ${JSON.stringify(it.sku)}, name: ${JSON.stringify(`${it.brand} ${it.model}`)},
    brandName: ${JSON.stringify(it.brand)}, categoryName: ${JSON.stringify(catName(it.category))}, categoryId: ${catId(it.category)},
    width: ${it.w}, profile: ${it.p}, diameter: ${it.d}, sizeString: ${JSON.stringify(sizeString(it))},
    loadIndex: ${JSON.stringify(it.load)}, speedRating: ${JSON.stringify(it.speed)}, season: ${JSON.stringify(it.season)},
    sellingPrice: ${it.price}, quantity: ${it.qty}, minStockLevel: ${it.min}, lowStock: ${low}, active: true,
    imageUrl: ${JSON.stringify(imageUrlFor(it))},
    description: ${JSON.stringify(it.desc)},
  },`;
}).join('\n');

const demoTs = `import type { Product } from '../../types';

/**
 * Protektor storefront — namuna katalog (demo).
 *
 * AVTO-GENERATSIYA: \`scripts/gen-product-images.mjs\` (manba: \`scripts/demo-catalog.mjs\`).
 * Qo'lda tahrirlamang — o'rniga katalogni tahrirlab, generatorni qayta ishga tushiring.
 *
 * Backend \`GET /v1/catalog\` bo'lsa storefront undan o'qiydi; backend yo'q/xato bo'lsa
 * shu massivga tushadi — vitrina offline ham to'liq va rasmlari bilan ko'rinadi.
 */
export const DEMO_PRODUCTS: Product[] = [
${rows}
];

/** Katalogdagi noyob brendlar (filtr uchun). */
export const DEMO_BRANDS: string[] = [...new Set(DEMO_PRODUCTS.map((p) => p.brandName!).filter(Boolean))].sort();
`;
writeFileSync(OUT_DEMO, demoTs, 'utf8');

console.log(`✓ ${n} ta SVG → public/products/`);
console.log(`✓ demoProducts.ts (${CATALOG.length} mahsulot) yangilandi`);
