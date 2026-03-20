import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/emby': {
        target: process.env.VITE_EMBY_SERVER_URL || 'http://localhost:8096',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/emby/, '/emby'),
      },
    },
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor'
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor'
            }
            if (id.includes('video.js') || id.includes('howler')) {
              return 'player-vendor'
            }
          }
        },
      },
    },
  },
})
