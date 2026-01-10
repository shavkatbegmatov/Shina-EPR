import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
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
