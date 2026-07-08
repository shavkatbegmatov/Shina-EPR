import daisyui from 'daisyui';
import { RADIUS, SHADOW, ZINDEX, FONT_SIZE, SPACING, MAX_WIDTH } from './src/ui/tokens/scales.mjs';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Responsive breakpointlar: xs + semantik aliaslar (default sm/md/lg/xl/2xl saqlanadi).
      // tablet=md(768) — ERP "desktop chrome" shu yerda yoqiladi; tablet dead-zone'ni yopadi.
      screens: {
        xs: '480px',
        tablet: '768px',
        desktop: '1024px',
        wide: '1280px',
      },
      // Protektor token shkalalari (faqat yangi, to'qnashmaydigan nomlar)
      borderRadius: RADIUS,
      boxShadow: SHADOW,
      zIndex: ZINDEX,
      fontSize: FONT_SIZE,
      spacing: SPACING,
      maxWidth: MAX_WIDTH,
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'dropdown': 'slide-in-from-top 0.2s ease-out, fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    // "Tungi trassa" palitrasi — kobalt (fara nuri) + signal-orange + asfalt-navy.
    // Barcha juftliklar WCAG AA tekshirilgan (scripts yo'q — qiymat yonida ratio).
    themes: [
      {
        shina: {
          "primary": "#2451e6",              // kobalt — oq matn AA 6.19
          "primary-content": "#ffffff",
          "secondary": "#ea580c",            // orange — FILL (tugma katta/qalin matn AA ≥3:1)
          "secondary-content": "#ffffff",
          "accent": "#0e7490",               // ksenon-cyan — oq matn AA 5.36
          "accent-content": "#ffffff",
          "neutral": "#101a38",              // asfalt-navy
          "neutral-content": "#eef2fc",
          "base-100": "#f7f8fc",
          "base-200": "#eef1f8",
          "base-300": "#dee4f0",
          "base-content": "#0f172e",         // navy ink — b100'da AA 16.7
          "info": "#0369a1",                 // oq matn AA 5.93
          "info-content": "#ffffff",
          "success": "#047857",              // emerald — oq matn AA 5.48
          "success-content": "#ffffff",
          "warning": "#d97706",              // amber — ink matn AA 5.85
          "warning-content": "#0b1224",
          "error": "#dc2626",                // oq matn AA 4.83
          "error-content": "#ffffff",
        },
      },
      {
        "shina-dark": {
          // Qorong'i temada barcha yorqin fonlar INK matn ishlatadi (oq AA'dan o'tmaydi).
          "primary": "#7d9bff",              // kobalt nuri — ink AA 7.11, b100'da matn AA 7.17
          "primary-content": "#0b1224",
          "secondary": "#fb923c",            // ink AA 8.24
          "secondary-content": "#0b1224",
          "accent": "#22d3ee",               // ink AA 10.32
          "accent-content": "#0b1224",
          "neutral": "#1c2645",
          "neutral-content": "#dde6fb",
          "base-100": "#0a1122",             // tungi asfalt (navy-qora)
          "base-200": "#121b33",
          "base-300": "#1f2b4d",
          "base-content": "#e4eaf7",         // b100'da AA 15.6
          "info": "#38bdf8",
          "info-content": "#0b1224",
          "success": "#34d399",              // ink AA 9.70
          "success-content": "#0b1224",
          "warning": "#fbbf24",
          "warning-content": "#0b1224",
          "error": "#f87171",
          "error-content": "#0b1224",
        },
      },
    ],
    defaultTheme: "shina",
  },
}
