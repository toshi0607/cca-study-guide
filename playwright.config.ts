import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A single preview server on the fixed port 4325 backs the whole run. Multiple
  // parallel workers saturate the machine and intermittently time out the
  // timing-sensitive save-failure and analytics tests, so the suite runs
  // serially to keep `pnpm test:e2e` deterministic.
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4325',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'PUBLIC_GA_MEASUREMENT_ID=G-TEST123456 pnpm build && pnpm preview --host 127.0.0.1 --port 4325',
    url: 'http://127.0.0.1:4325',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
