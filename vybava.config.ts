import { defineConfig } from '@vybava/config';

// Shared Výbava configuration for this repository — one section per applet.
// vybava evaluates it with the helpers it ships; editors read their types from
// ~/node_modules/@vybava/config, which vybava keeps current.
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
