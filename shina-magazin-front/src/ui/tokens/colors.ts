// Protektor brend rang tokenlari — TS manbasi. "Tungi trassa" palitrasi:
// kobalt (fara nuri) + signal-orange + asfalt-navy.
// Runtime'da hokim manba — index.css dagi CSS o'zgaruvchilari (--chart-*).
// Bu yerdagi qiymatlar ular bilan sinxron va build-time / fallback uchun ishlatiladi.

export type ThemeMode = 'light' | 'dark';

/**
 * Matn uchun xavfsiz (WCAG-AA) brend variantlari.
 * DIQQAT: orange #ea580c matn sifatida AA'dan o'tmaydi (3.56) — u faqat FILL.
 * Matn uchun #c2410c (light) / #fb923c (dark) ishlatiladi.
 */
export const BRAND = {
  cobaltText: { light: '#2451e6', dark: '#7d9bff' },
  orangeText: { light: '#c2410c', dark: '#fb923c' },
  ink: '#0b1224',
  muted: { light: '#46536e', dark: '#94a3c0' },
} as const;

/** Grafik seriyalari (kategoriyali). index.css --chart-1..8 bilan sinxron. */
export const CHART_SERIES = {
  light: ['#2451e6', '#ea580c', '#0891b2', '#7c3aed', '#059669', '#e11d48', '#d97706', '#65a30d'],
  dark: ['#7d9bff', '#fb923c', '#22d3ee', '#a78bfa', '#34d399', '#fb7185', '#fbbf24', '#a3e635'],
} as const;

/** Semantik grafik rollari (nomli) — daromad/xarajat/foyda/qarz. */
export const CHART_ROLE = {
  revenue: { light: '#2451e6', dark: '#7d9bff' },
  cost: { light: '#ea580c', dark: '#fb923c' },
  profit: { light: '#059669', dark: '#34d399' },
  cash: { light: '#0891b2', dark: '#22d3ee' },
  card: { light: '#7c3aed', dark: '#a78bfa' },
  debt: { light: '#dc2626', dark: '#f87171' },
} as const;
