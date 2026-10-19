import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = process.env.VITE_BACKEND_PORT || '8081';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
});
