import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Product unit tests live under src/; the release-automation script tests
    // (offline, dependency-injected — no network) live under scripts/ so the
    // normal `pnpm test` gate covers the deployment-identity logic too.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
});
