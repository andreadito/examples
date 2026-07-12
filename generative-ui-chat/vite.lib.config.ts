import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Library build for the reusable component (src/generative-ui) — everything
 * else in this repo (demo app, server) is the showcase, not the product.
 * Every bare-specifier import is externalized: consumers bring their own
 * React/MUI/json-render/etc. per the peer dependencies in the generated
 * dist-lib/package.json (scripts/make-lib-package.mjs).
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/generative-ui/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    },
  },
});
