import { defineConfig } from 'vitest/config'
import type { ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react-swc'
import type { IncomingMessage, ClientRequest } from 'node:http'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
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
  },
  define: {
    global: 'globalThis',
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-state': ['zustand', 'axios'],
          'vendor-ui': ['lucide-react', 'clsx'],
          'vendor-charts': ['recharts'],
          'vendor-date': ['date-fns'],
          'vendor-form': ['react-hook-form'],
          'vendor-export': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-websocket': ['sockjs-client', '@stomp/stompjs'],
        },
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
        configure: (proxy) => {
          proxy.on('error', (err: Error) => {
            console.log('Proxy error:', err.message)
          })

          proxy.on('proxyReq', (_proxyReq: ClientRequest, req: IncomingMessage) => {
            console.log("Backendga so'rov ketdi:", req.method, req.url ?? '')
          })

          proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) => {
            console.log('Backenddan javob keldi:', proxyRes.statusCode ?? 0, req.url ?? '')
          })
        },
      } satisfies ProxyOptions,

      // 2) WS/SockJS proxy (faqat WS): /api/v1/ws -> /v1/ws
      '/api/v1/ws': {
        target: 'http://localhost:8183',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err: Error) => {
            console.log('WS Proxy error:', err.message)
          })

          proxy.on('proxyReq', (_proxyReq: ClientRequest, req: IncomingMessage) => {
            console.log('WS so‘rov:', req.method, req.url ?? '')
          })

          proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) => {
            console.log('WS javob:', proxyRes.statusCode ?? 0, req.url ?? '')
          })
        },
      } satisfies ProxyOptions,
    },
  },
})
