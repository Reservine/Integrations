import { resolve } from 'node:path';

import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

import { version } from './package.json';

export default defineConfig({
  define: { __RESERVINE_SDK_VERSION__: JSON.stringify(version) },
  plugins: [
    svelte({ preprocess: vitePreprocess(), exclude: '**/*.component.svelte' }),
    svelte({
      preprocess: vitePreprocess(),
      include: '**/*.component.svelte',
      compilerOptions: { customElement: true },
      emitCss: false
    })
  ],
  build: {
    outDir: 'dist/cdn',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/browser.ts'),
      name: 'ReservineSDK',
      formats: ['iife'],
      fileName: () => 'sdk.js'
    }
  }
});
