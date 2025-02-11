/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { sveltePreprocess } from 'svelte-preprocess/dist/autoProcess';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/reservine-button',

  server: {
    port: 4200,
    host: 'localhost',
    fs: {
      allow: ['../..'],
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    svelte({
      preprocess: sveltePreprocess({}),
      exclude: /\.component\.svelte$/,
    }),
    svelte({
      include: /\.component\.svelte$/,
      compilerOptions: {
        customElement: true,
        css: "injected",
      },
      emitCss: false,
    }),
    nxViteTsPaths(),
  ],

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },

  build: {
    outDir: '../../dist/apps/reservine-button',
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    target: 'modules',
    lib: {
      entry: 'src/main.ts',
      name: 'ReservineButton',
      fileName: 'reservine-button',
      formats: ['es', 'umd'],
    },
  },
  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/reservine-button',
      provider: 'v8',
    },
  },
});
