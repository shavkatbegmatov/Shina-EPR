import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
          "secondary": "#ea580c",
          "accent": "#84cc16",
          "neutral": "#0f172a",
          "base-100": "#f8fafc",
          "base-200": "#f1f5f9",
          "base-300": "#e2e8f0",
          "info": "#0284c7",
          "success": "#16a34a",
          "warning": "#f59e0b",
          "error": "#dc2626",
        },
      },
      "light",
      "dark",
    ],
    defaultTheme: "shina",
  },
}
