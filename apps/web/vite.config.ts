import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { siteMetaPlugin } from './src/lib/site-meta-plugin';
// Electron loads index.html via file:// — absolute /assets/ paths fail; use relative ./assets/
const forElectron = process.env.ELECTRON_BUILD === '1';

export default defineConfig({
  base: forElectron ? './' : '/',
  plugins: [
    siteMetaPlugin(path.resolve(__dirname, 'public'), { writeFiles: !forElectron }),
    react(),
  ],
  resolve: {
    alias: {
      '@dropline/core': path.resolve(__dirname, '../../packages/dropline-core/src/index.ts'),
    },
  },
  server: { port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true },
});
