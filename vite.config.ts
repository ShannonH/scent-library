import { defineConfig } from 'vitest/config';

// GitHub Pages serves a project site from /<repo-name>/. VITE_BASE lets the
// deploy workflow set that; local dev uses '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: { outDir: 'dist', sourcemap: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
