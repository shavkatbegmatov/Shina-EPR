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
    themes: [
      {
        shina: {
          "primary": "#0f766e",
          "primary-content": "#ffffff",
          "secondary": "#ea580c",           // orange — FILL (tugma katta/qalin matn AA ≥3:1)
          "secondary-content": "#ffffff",
          "accent": "#84cc16",
          "accent-content": "#0b1220",       // lime yorqin — ink matn (AA 9.48)
          "neutral": "#0f172a",
          "neutral-content": "#f8fafc",
          "base-100": "#f8fafc",
          "base-200": "#f1f5f9",
          "base-300": "#e2e8f0",
          "base-content": "#0f172a",
          "info": "#0284c7",
          "info-content": "#ffffff",
          "success": "#16a34a",
          "success-content": "#ffffff",
          "warning": "#f59e0b",
          "warning-content": "#0b1220",      // amber yorqin — ink matn (AA 8.72)
          "error": "#dc2626",
          "error-content": "#ffffff",
        },
      },
      {
        "shina-dark": {
          // Qorong'i temada barcha yorqin fonlar INK matn ishlatadi (oq AA'dan o'tmaydi).
          "primary": "#14b8a6",
          "primary-content": "#0b1220",      // ink (AA 7.52); oq bo'lsa 2.49 ✗
          "secondary": "#fb923c",
          "secondary-content": "#0b1220",
          "accent": "#a3e635",
          "accent-content": "#0b1220",
          "neutral": "#1e293b",
          "neutral-content": "#e8eef5",
          "base-100": "#0f172a",
          "base-200": "#1e293b",
          "base-300": "#334155",
          "base-content": "#e2e8f0",
          "info": "#38bdf8",
          "info-content": "#0b1220",
          "success": "#4ade80",
          "success-content": "#0b1220",
          "warning": "#fbbf24",
          "warning-content": "#0b1220",
          "error": "#f87171",
          "error-content": "#0b1220",
        },
      },
    ],
    defaultTheme: "shina",
  },
}
