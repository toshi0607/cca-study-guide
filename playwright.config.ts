import { defineConfig, devices } from '@playwright/test';

const PORT = 4325;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Local iteration can point the suite at an already-running preview server to
// skip the ~30s production rebuild (see `test:e2e:reuse`). CI and the default
// `pnpm test:e2e` always build a fresh server, so the full gate can never run
// against a stale build.
const reuseExistingServer = process.env.PW_REUSE_SERVER === '1';

// Serial by default. Each test already runs in its own isolated browser context
// (no shared storage or DOM), but the suite has many focus-transfer, dynamic
// render, and save-failure assertions with implicit single-worker timing. A
// measured sweep confirmed the trade-off: 2 workers cut browser wall-clock ~22%
// but failed the 5-consecutive-green gate (2/5 runs, different specs each time —
// focus and storage-read races under CPU contention), and 3 starved the
// save-failure notice. Determinism (retry:0, flaky:0) is worth more than that
// cut here, and the dominant speed-up came from removing the per-test double
// navigation, not from parallelism. PW_WORKERS lets a user opt into parallel
// runs on a quiet host. See the workers section in tasks/task-e2e-performance.md.
const workers = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers,
  forbidOnly: !!process.env.CI,
  reporter: 'line',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `PUBLIC_GA_MEASUREMENT_ID=G-TEST123456 pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer,
    timeout: 120_000,
  },
});
