import { defineConfig } from './.vybava/config';

// Shared Výbava configuration for this repository — one section per applet.
// Evaluated by bun with the helpers vybava ships; .vybava/config.ts is their
// gitignored copy for editor types, written by `vybava config init`.
export default defineConfig({
  sync: {
    // vybava config setup: bun.lock is bun's lockfile
    install: 'bun install',
    // The committed Devbox release-verification script includes the package checks.
    verify: 'devbox run test',
  },
  gates: {
    // vybava config setup: devbox.yaml has a test script: the broad suite, run as a gate
    test: { run: 'devbox run test' },
  },
  guards: {
    // vybava config setup: generated or oversized tracked files (vybava config discover)
    noRead: ['bun.lock'],
  },
});
