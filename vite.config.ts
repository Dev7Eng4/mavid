import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@contents': path.resolve(root, 'contents'),
      '@': path.resolve(root, 'src'),
    },
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/contents/**', '**/electron/**'],
    },
    /** Tránh CORS khi renderer (localhost:5173) gọi API GPM trên 127.0.0.1:19995 */
    proxy: {
      '/gpm-proxy': {
        target: 'http://127.0.0.1:19995',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/gpm-proxy/, ''),
      },
    },
  },
});
