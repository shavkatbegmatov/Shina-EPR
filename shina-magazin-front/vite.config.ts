import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  define: {
    // SockJS uchun global polyfill
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State management & data fetching
          'vendor-state': ['zustand', 'axios'],
          // UI libraries
          'vendor-ui': ['lucide-react', 'clsx'],
          // Charts (heavy)
          'vendor-charts': ['recharts'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Form handling
          'vendor-form': ['react-hook-form'],
          // PDF & export utilities
          'vendor-export': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          // WebSocket
          'vendor-websocket': ['sockjs-client', '@stomp/stompjs'],
        },
      },
    },
  },
  server: {
    // Port removed - Vite will use any available port (default 5173)
    // This allows flexibility when multiple dev servers are running
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true, // WebSocket support
      },
    },
  },
})
