import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react-swc'
import type { IncomingMessage, ClientRequest } from 'node:http'

export default defineConfig({
  plugins: [react()],
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
    port: 5245,
    host: true,

    proxy: {
      // 1) REST API proxy (faqat HTTP)
      '/api': {
        target: 'http://localhost:8245',
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
        target: 'http://localhost:8245',
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
