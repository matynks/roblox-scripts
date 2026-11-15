import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :8787; the dev server proxies /api and /files to it.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: false },
      '/files': { target: 'http://localhost:8787', changeOrigin: false },
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
});
