import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    headers: {
      'Service-Worker-Allowed': '/'
    },
    watch: {
      usePolling: true
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'service-worker': path.resolve(__dirname, 'public/service-worker.js')
      }
    }
  },
  publicDir: 'public',
  worker: {
    format: 'es'
  }
}); 