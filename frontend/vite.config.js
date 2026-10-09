import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api calls to the Express backend on port 3001,
// so the frontend never needs to know the backend URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://ai-web-scraper-theta.vercel.app/api',
    },
  },
});
