import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward /Digiajoglobal/api/* to XAMPP Apache (force IPv4 to avoid ::1 502 errors)
      '/Digiajoglobal/api': {
        target: 'http://127.0.0.1:80',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[proxy error]', err));
        },
      },
      // Forward /api/* as a short alias
      '/api': {
        target: 'http://127.0.0.1:80/Digiajoglobal',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[proxy error]', err));
        },
      },
    },
  },
});

