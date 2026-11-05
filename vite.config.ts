/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { serviceWorker } from './build/serviceWorker';

export default defineConfig({
  base: '/pixel-runner/',
  plugins: [serviceWorker()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
