import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  define: {
    // SockJS uchun global polyfill
    global: 'globalThis',
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
