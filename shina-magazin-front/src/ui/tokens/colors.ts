// Protektor brend rang tokenlari — TS manbasi.
// Runtime'da hokim manba — index.css dagi CSS o'zgaruvchilari (--chart-*).
// Bu yerdagi qiymatlar ular bilan sinxron va build-time / fallback uchun ishlatiladi.

export type ThemeMode = 'light' | 'dark';

/**
 * Matn uchun xavfsiz (WCAG-AA) brend variantlari.
 * DIQQAT: orange #ea580c matn sifatida AA'dan o'tmaydi (3.56) — u faqat FILL.
 * Matn uchun #c2410c (light) / #fb923c (dark) ishlatiladi.
 */
export const BRAND = {
  tealText: { light: '#0f766e', dark: '#2dd4bf' },
  orangeText: { light: '#c2410c', dark: '#fb923c' },
  ink: '#0b1220',
  muted: { light: '#475569', dark: '#94a3b8' },
} as const;

/** Grafik seriyalari (kategoriyali). DashboardPage'dagi off-brend palitra o'rniga. */
export const CHART_SERIES = {
  light: ['#0f766e', '#ea580c', '#84cc16', '#0284c7', '#16a34a', '#7c3aed', '#db2777', '#ca8a04'],
  dark: ['#2dd4bf', '#fb923c', '#a3e635', '#38bdf8', '#4ade80', '#a78bfa', '#f472b6', '#fcd34d'],
} as const;

/** Semantik grafik rollari (nomli) — daromad/xarajat/foyda/qarz. */
export const CHART_ROLE = {
  revenue: { light: '#0f766e', dark: '#2dd4bf' },
  cost: { light: '#ea580c', dark: '#fb923c' },
  profit: { light: '#84cc16', dark: '#a3e635' },
  cash: { light: '#16a34a', dark: '#4ade80' },
  card: { light: '#0284c7', dark: '#38bdf8' },
  debt: { light: '#dc2626', dark: '#f87171' },
} as const;
