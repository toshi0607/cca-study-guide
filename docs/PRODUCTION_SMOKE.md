# Production smoke automation

On-demand verification that Production (https://cca.toshi0607.com) is serving
the intended build and that the primary user journeys still work there. This
is a **post-merge, on-demand** layer — it never blocks a PR merge and never
runs automatically.

It complements, but does not replace, `docs/RELEASE_CHECKLIST.md`. See
`.claude/skills/release-audit/SKILL.md` (`/release-audit smoke`) for the
agent-driven way to run and interpret this.

## How to run it

### GitHub Actions (`workflow_dispatch` only)

The workflow is `.github/workflows/production-smoke.yml`. It never runs on
`push` or `pull_request` — only when explicitly dispatched:

```
gh workflow run production-smoke.yml
gh run watch                     # or: gh run list --workflow=production-smoke.yml
```

Or trigger it from the Actions tab in the GitHub UI ("Run workflow").

It has two jobs:

1. `verify-deployment` — builds the app locally in CI and compares it to
   what Production serves. Uploads the `production-deployment-report`
   artifact. If identity fails, the workflow stops here — `production-smoke`
   does not run.
2. `production-smoke` — runs the Production Playwright suite against the
   live site. Uploads the `production-playwright-report` artifact
   (traces/screenshots/videos).

### Locally

```
pnpm build && pnpm verify:production
pnpm test:e2e:production
```

`pnpm verify:production` runs `scripts/verify-production-deployment.mjs`. It
compares the local `dist/` app-island assets (`/_astro/App.*.js`,
`/_astro/client.*.js`) to what Production currently serves — byte-for-byte
and by sha256, plus filename — and confirms `/en/` matches too. It exits
non-zero on any mismatch. Pass `--json <path>` to also write a machine
report.

`pnpm test:e2e:production` runs the Production Playwright suite
(`playwright.production.config.ts`, tests under `tests/production/`) against
the live site.

## Why this is safe to run against real Production

This is a local-only, no-backend static app — there is no shared server state
for a test run to corrupt. Concretely:

- Every test runs in its own isolated Playwright browser context
  (context-per-test isolation) — no cookies, localStorage, or session state
  is shared between tests or with any real visitor.
- Any storage a test seeds (e.g. for the export/import roundtrip or
  hands-on-persistence checks) is seeded and asserted only inside that
  test's ephemeral context, then the context is torn down.
- There is no backend to mutate — "data" is `localStorage` in a throwaway
  browser context, not a database row or account any real user owns.
- The suite is read-mostly against the live pages; the few state-changing
  actions (starting/submitting a Mock Exam, toggling hands-on steps) only
  ever touch that test's own local storage, never a server.

## Failure artifacts

| Artifact | From job | Contains |
|---|---|---|
| `production-deployment-report` | `verify-deployment` | JSON identity report (local vs. Production asset hashes/filenames, `/en/` check) |
| `production-playwright-report` | `production-smoke` | Playwright HTML report with traces, screenshots, and videos for any failing test |

Download artifacts from the workflow run page (`gh run view <run-id>` /
Actions UI → the run → Artifacts), or from wherever your CI retention policy
stores them.

## Triaging false positives

Not every red run is a real regression:

- **Transient analytics/external-host failures are ignored by design and
  are NOT release failures.** The privacy/analytics test only asserts on
  same-origin app behavior and known GA endpoints; a blip on an
  unrelated third-party host (ad blockers, flaky CDNs, etc.) reached
  incidentally by the browser is not a smoke failure.
- **Distinguish a real same-origin chunk failure from an external blip.**
  If a `/_astro/*.js` or other same-origin asset 404s or fails to load,
  treat it as real — that is exactly what this suite exists to catch. If
  the failing request is to a third-party domain the app doesn't control,
  treat it as noise and re-run before escalating.
- Check the trace/video in `production-playwright-report` before deciding —
  a screenshot at the failure point usually makes the distinction obvious.

## Deployment mismatch ("Production does not yet serve this main build")

`pnpm verify:production` prints this when Production's assets don't match
the local `main` build. This is almost always a **deploy race**, not a
regression: Vercel hasn't finished deploying the latest `main` commit yet.

What to do:

1. Check the Vercel dashboard (or `vercel ls` / the deployment status) to
   confirm a deployment for the current `main` SHA is in progress or just
   completed.
2. Wait for it to finish, then re-run `pnpm verify:production` (or
   re-dispatch `production-smoke.yml`).
3. Only treat it as a real problem if Production still doesn't match after
   a completed deployment for that SHA — that would indicate a build or
   deploy configuration issue worth investigating directly, not a
   Playwright-suite concern.

## Smoke vs. full responsibility split

- **Production smoke** (this doc): identity + ~8 Playwright checks covering
  the same post-merge journeys that used to be manual — locale shell load,
  primary lazy views, export/import roundtrip, unreadable-storage safety,
  hands-on persistence, mobile journey, Mock Exam exactly-once, and
  analytics/network privacy. Run on demand after any deploy you want
  confidence in.
- **Full release audit** (`/release-audit full`, `docs/RELEASE_CHECKLIST.md`
  Pre-merge section): everything smoke covers, plus unit/build/bundle/full
  E2E/a11y/Lighthouse, source-URL and freshness checks, and manual
  visual/keyboard/content review. Reserved for major releases.
- Routine merges only need Production smoke (`/release-audit smoke`); they
  do not need a full audit.

## Time budget

- Production Playwright suite: target ≤ 3 minutes.
- Whole `production-smoke.yml` workflow (both jobs, including build +
  identity check): target ≤ 5 minutes.

If either budget is regularly exceeded, treat it as its own issue to
investigate (test flakiness, an unnecessarily large build, etc.) rather than
something to silently accept.
