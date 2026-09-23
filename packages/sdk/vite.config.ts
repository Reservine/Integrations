import { resolve } from 'node:path';

import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

import { version } from './package.json';

const frameworkPeers = ['@angular/core', 'react', 'react/jsx-runtime', 'svelte', 'vue'];

export default defineConfig({
  define: { __RESERVINE_SDK_VERSION__: JSON.stringify(version) },
  // vitest resolves `svelte` to its SSR entry (where onMount is a no-op) unless the
  // browser condition is on; the jsdom suites mount real custom elements.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
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
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        browser: resolve(__dirname, 'src/browser.ts'),
        react: resolve(__dirname, 'src/adapters/react.tsx'),
        vue: resolve(__dirname, 'src/adapters/vue.ts'),
        angular: resolve(__dirname, 'src/adapters/angular.ts'),
        svelte: resolve(__dirname, 'src/adapters/svelte.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: frameworkPeers,
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js'
      }
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}']
  }
});
