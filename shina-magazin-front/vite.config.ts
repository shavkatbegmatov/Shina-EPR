import { defineConfig } from 'vitest/config'
import type { ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react-swc'
import type { IncomingMessage, ClientRequest } from 'node:http'
import { fileURLToPath, URL } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Dev proxy loglari faqat so'ralganda: `VITE_PROXY_LOG=1 npm run dev`.
 * Ilgari har bir API so'rovi uchun ikki qator chiqib, haqiqiy xatolarni ko'mib yuborardi.
 */
const proxyLogging = (label: string) => (proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0]) => {
  proxy.on('error', (err: Error) => {
    console.log(`${label} proxy error:`, err.message)
  })
  if (!process.env.VITE_PROXY_LOG) return
  proxy.on('proxyReq', (_proxyReq: ClientRequest, req: IncomingMessage) => {
    console.log(`${label} ->`, req.method, req.url ?? '')
  })
  proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) => {
    console.log(`${label} <-`, proxyRes.statusCode ?? 0, req.url ?? '')
  })
}

/**
 * Vendor chunk'lar — FUNKSIYA shaklida.
 *
 * <p>Obyekt shakli (`{ 'vendor-export': ['jspdf', ...] }`) Rollup'ni Vite'ning
 * `__vite__preload` yordamchisini vendor chunk ichiga joylashga majbur qilardi;
 * natijada entry o'sha chunk'ni STATIK import qilar va har bir tashrifchi (vitrina
 * mehmoni ham) faqat Hisobotlar sahifasi ishlatadigan 618 KB jsPDF/xlsx kodini
 * yuklab olardi. Funksiya shaklida yordamchi entry'da qoladi, jsPDF esa uni
 * import qiladigan lazy sahifa bilan birga keladi.
 */
function vendorChunk(id: string): string | undefined {
  const path = id.replace(/\\/g, '/')
  // Vite'ning dynamic-import preload yordamchisi (virtual modul). Chunk'i aniq
  // ko'rsatilmasa Rollup uni jsPDF (o'zi ham dynamic import ishlatadi) bilan bir
  // chunk'ga qo'shib, entry'ni o'sha 700 KB chunk'ni statik import qilishga majbur qilardi.
  if (path.includes('vite/preload-helper') || path.includes('vite/modulepreload-polyfill')) {
    return 'vendor-react'
  }
  if (!path.includes('/node_modules/')) return undefined
  const from = (names: string[]) =>
    names.some((name) => path.includes(`/node_modules/${name}/`))

  if (from(['react', 'react-dom', 'react-router', 'react-router-dom', '@remix-run/router', 'scheduler'])) {
    return 'vendor-react'
  }
  if (from(['recharts', 'victory-vendor', 'internmap', 'delaunator', 'robust-predicates']) || /\/node_modules\/d3-[a-z-]+\//.test(path)) {
    return 'vendor-charts'
  }
  if (from(['jspdf', 'jspdf-autotable', 'xlsx'])) return 'vendor-export'
  if (from(['sockjs-client', '@stomp/stompjs'])) return 'vendor-websocket'
  if (from(['date-fns'])) return 'vendor-date'
  if (from(['react-hook-form'])) return 'vendor-form'
  if (from(['zustand', 'axios', '@tanstack/react-query', '@tanstack/query-core'])) return 'vendor-state'
  if (from(['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority', '@headlessui/react', 'react-hot-toast'])) {
    return 'vendor-ui'
  }
  return undefined
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // `npm run analyze` -> dist/stats.html (chunk tarkibi, gzip o'lchamlari).
    // Aynan shu ko'rinish bo'lmagani uchun 618 KB eksport chunk'i entry'ga
    // yopishib qolgani sezilmagan edi.
    ...(mode === 'analyze' ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true })] : []),
  ],
  // @/* -> src/* (tsconfig paths bilan mos)
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Default 'forks' pool ba'zi Windows mashinalarda (antivirus har bir node.exe
    // spawn'ini ushlaganda) "Timeout starting forks runner" xatosini beradi —
    // test fayllarning bir qismi ishga tushmaydi. 'threads' (worker_threads)
    // jarayon yaratmaydi, yengilroq va ishonchliroq; Linux CI'da ham ishlaydi.
    pool: 'threads',

    /**
     * Parallel oqimlar soni — YADRO SONIDAN KAM.
     *
     * <p>Vitest sukut bo'yicha har bir yadroga bitta worker ochadi. Har bir
     * worker esa alohida jsdom muhitini ko'taradi, ya'ni 32 yadroli mashinada
     * 32 ta to'liq DOM implementatsiyasi bir vaqtda xotirada bo'ladi. Bu
     * o'ta ko'p obuna (oversubscription): oqimlar CPU va GC uchun kurashadi
     * va ayrim testlar tasodifan yuz millisekundlarga to'xtab qoladi.
     *
     * <p>Aynan shu narsa `DebtsPage` ning "yuklash xatosi" testini beqaror
     * qilgan edi. O'lchov: xato holati to'liq render bo'lishi bo'sh mashinada
     * ~180 ms oladi (sahifa katta — avval skelet, keyin xato paneli qayta
     * render bo'ladi), testing-library ning `waitFor` byudjeti esa 1000 ms.
     * Ya'ni zaxira atigi ~5 barobar — bo'g'ilib qolgan worker uni yeb qo'yardi
     * va test faqat TO'LIQ to'plam ishlaganda, tasodifan yiqilardi.
     *
     * <p>Foizli qiymat ataylab: CI konteynerlarida 2 yadro bo'lishi mumkin,
     * qat'iy son u yerda teskari ta'sir qilardi.
     */
    maxWorkers: '50%',

    /**
     * Test timeout'i `asyncUtilTimeout` (5000 ms, `src/test/setup.ts`) dan
     * KATTA bo'lishi SHART.
     *
     * <p>Ikkalasi teng bo'lsa poyga chiqadi: haqiqatan osilib qolgan kutish
     * uchun vitest testni "Test timed out in 5000ms" deb o'ldiradi va
     * testing-library o'zining foydali xabarini ("Unable to find element…"
     * + DOM dump) chiqarishga ulgurmaydi — ya'ni yiqilish sababi ko'rinmay
     * qoladi. Zaxira bo'lgani uchun avval testing-library gapiradi.
     *
     * <p>Bu qiymat sog'lom testni sekinlashtirmaydi — u faqat YUQORI chegara.
     */
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/devtools/**', 'src/types/**'],
    },
  },
  define: {
    global: 'globalThis',
  },

  esbuild: {
    // Prod build'da console.* va debugger olib tashlanadi: 130+ chaqiruv prodga
    // chiqardi, ba'zilari sessiya/API javoblarini to'liq dump qilardi.
    // Dev va test rejimida saqlanadi.
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },

  server: {
    port: 5183,
    host: true, // teldan/LAN'dan kirish uchun shart
    strictPort: true, // 5183 band bo'lsa boshqa portga o'tib ketmasligi uchun

    proxy: {
      // 1) REST API proxy (faqat HTTP)
      '/api': {
        target: 'http://localhost:8183',
        // target: 'http://192.168.1.33:8183',
        changeOrigin: true,
        secure: false,
        ws: false,
        configure: proxyLogging('API'),
      } satisfies ProxyOptions,

      // 2) WS/SockJS proxy (faqat WS): /api/v1/ws -> /v1/ws
      '/api/v1/ws': {
        target: 'http://localhost:8183',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: proxyLogging('WS'),
      } satisfies ProxyOptions,
    },
  },
}))
