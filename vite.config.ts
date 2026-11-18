import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` (Vite dev server, port 5173) proxies /api to `wrangler dev` (port 8787).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  }
});
