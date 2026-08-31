import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'line',
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'bun run dev -- --host 127.0.0.1 --port 4173',
        reuseExistingServer: false,
        url: 'http://127.0.0.1:4173'
      },
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ]
});
