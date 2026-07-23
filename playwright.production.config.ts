import { defineConfig, devices } from '@playwright/test';

// Live production smoke suite. Unlike playwright.config.ts (which builds and
// serves a fresh preview), this config runs against the DEPLOYED site and never
// starts a server — there is deliberately no `webServer`. It also uses its own
// testDir (./tests/production) so it can never pick up the ~131-test full suite
// under ./tests.
const BASE_URL = process.env.PRODUCTION_BASE_URL ?? 'https://cca.toshi0607.com';

// Reject a non-https target at config load. Host allowlisting is owned by the
// deployment-identity script; here we only guarantee the smoke run targets a
// TLS origin (a plain-http run would be meaningless and is almost always a typo).
if (!BASE_URL.startsWith('https:')) {
  throw new Error(`PRODUCTION_BASE_URL must start with "https:" (received: ${BASE_URL}).`);
}

// 2 workers is the starting point for this small suite; the main agent falls
// back to PW_WORKERS=1 if 2 is not consistently green against live production
// (public-network timing under contention). PW_WORKERS overrides.
const workers = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 2;

export default defineConfig({
  testDir: './tests/production',
  fullyParallel: true,
  workers,
  // Smoke runs against a live deploy: a retry would hide a real regression and
  // is never used to paper over flake here.
  retries: 0,
  forbidOnly: !!process.env.CI,
  // 40s per test. The default 30s is tight for the two longest journeys — the
  // export -> reset -> import roundtrip and the mock-exam
  // start -> answer -> reload -> resume -> submit path — because each crosses
  // several lazy-chunk fetches over the public network. A much larger bound
  // would let a genuinely hung journey mask a regression, so 40s is the ceiling.
  timeout: 40_000,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
