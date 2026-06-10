/// <reference types="vitest/config" />
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
