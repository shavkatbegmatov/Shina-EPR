// Protektor o'lcham (scale) tokenlari — yagona manba (build-time).
// tailwind.config.js (ESM) shu .mjs faylni to'g'ridan-to'g'ri import qiladi.
// MUHIM: faqat YANGI, to'qnashmaydigan utilita nomlari — Tailwind default
// rounded-md/lg/xl, shadow-sm/lg, text-base ... larni OVERRIDE qilmaymiz.

/** Burchak radiusi — semantik nomlar (default rounded-* ga tegmaydi). */
export const RADIUS = {
  field: '0.75rem', // inputlar/tugmalar (mavjud rounded-xl bilan bir xil)
  card: '1rem', // kartalar
  sheet: '1.25rem', // modallar/bottom-sheet
  pill: '9999px',
};

/** Soyalar — index.css dagi CSS o'zgaruvchilarini o'qiydi (tema-mos). */
export const SHADOW = {
  soft: 'var(--shadow-soft)',
  strong: 'var(--shadow-strong)',
  pop: 'var(--shadow-pop)',
};

/** Z-index qatlamlari — nomlangan (default 0/10/.../50 bilan to'qnashmaydi). */
export const ZINDEX = {
  dropdown: '1000',
  sticky: '1020',
  'drawer-backdrop': '1300',
  drawer: '1310',
  'modal-backdrop': '1400',
  modal: '1410',
  popover: '1500',
  toast: '1600',
};

/** Tipografiya shkalasi — [size, lineHeight]. Yangi nomlar (text-base saqlanadi). */
export const FONT_SIZE = {
  'display-lg': ['2.25rem', '2.5rem'], // hero / login
  display: ['1.75rem', '2.1rem'], // sahifa sarlavhasi
  heading: ['1.25rem', '1.6rem'], // karta/modal sarlavhasi
  subheading: ['1rem', '1.5rem'],
  body: ['0.9375rem', '1.5rem'], // 15px
  caption: ['0.8125rem', '1.2rem'], // 13px
  overline: ['0.6875rem', '1rem'], // 11px katta harf label
};

/** Bo'shliq (spacing) — zichlik richagi (yangi nomlar). */
export const SPACING = {
  gutter: '1rem',
  'gutter-lg': '1.5rem',
  section: '2rem',
};

/** Maksimal kenglik — app-shell konteyneri. */
export const MAX_WIDTH = {
  shell: '1600px',
};
