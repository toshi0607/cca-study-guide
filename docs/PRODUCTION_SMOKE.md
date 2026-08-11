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
checks the **whole known** local `dist/` build, not just its two JS island
bundles, using the local **deployment manifest** as its root of trust:

- Every build (local and Vercel) generates `dist/deployment-manifest.json`
  through an `astro:build:done` hook (`scripts/deployment-manifest.mjs`). It
  records the source `commit` plus the sha256 of **every** served file — JS,
  CSS, HTML, fonts, icons, images. HTML is hashed after normalizing the
  per-build random `astro-island uid`, so a real metadata change still changes
  the hash.
- The check fetches every path in that local inventory from Production, follows
  at most five explicitly validated same-allowlist HTTPS redirects, and compares
  the returned bytes with the local expected hash using the same normalization.
  It uses `redirect: 'manual'` and never sends a request to an off-allowlist,
  HTTP, or credential-bearing redirect target.
- Vercel's `/deployment-manifest.json` is retained as supplementary deployment
  evidence: its raw receipt, `commit`, and file-hash map must agree with the
  local manifest. It is not evidence for served file bytes.
- This catches CSS-only, HTML/SEO-metadata-only, locale-page-only, and
  static-asset-only changes — including an altered served secondary CSS, HTML,
  or JS file even if Production's own manifest is unchanged.

HTTP has no general way to enumerate arbitrary additional files a server might
expose. Therefore a `MATCH` means **every file listed in the trusted local
manifest inventory matched**; it does not claim that Production exposes no
unknown extra paths.

Pass `--commit <sha>` to record/compare the audited commit (the workflow passes
`main`'s checked-out HEAD) and `--json <path>` to write a machine report (always
written, even on failure, with the failing `stage`). It exits non-zero on any
mismatch, a missing/older Production manifest, or an off-allowlist host.

`pnpm test:e2e:production` runs the Production Playwright suite
(`playwright.production.config.ts`, tests under `tests/production/`) against
the live site.

### Security headers (post-deploy)

The CSP and other security headers in `vercel.json` are served only by the
Vercel edge, so neither the Playwright suites nor `astro preview` exercise
them. After a deploy that touches `vercel.json`, an Astro layout/client directive,
or the Astro version, confirm the header is present and intact:

```
curl -sI https://cca.toshi0607.com/ | grep -i -E 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'
```

Expect a `Content-Security-Policy` whose `script-src` lists `'self'` and the
required `sha256-…` hashes (no `'unsafe-inline'`), plus `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy`.
If the site renders but the browser console logs `Refused to execute inline
script … violates the following Content Security Policy directive`, the
inline-script hashes drifted — rebuild and run `pnpm test:csp`, which recomputes
them from `dist/` and reports the hashes to add to `vercel.json`.

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
| `production-deployment-report` | `verify-deployment` | JSON identity report (`ok`, audited/production `commit`, `stage`, per-file `mismatches`) — written even on failure |
| `production-playwright-report` | `production-smoke` | Playwright HTML report with traces, screenshots, and videos for any failing test |

Download artifacts from the workflow run page (`gh run view <run-id>` /
Actions UI → the run → Artifacts), or from wherever your CI retention policy
stores them.

## Triaging false positives

Not every red run is a real regression:

- **Any third-party request from an application route is a privacy regression.**
  The deployed app intentionally has no third-party runtime dependency; inspect
  the Playwright trace to identify which markup or script initiated the request.
- **A same-origin chunk failure is also a real regression.** If a
  `/_astro/*.js` or other same-origin asset 404s or fails to load, inspect the
  deployment identity report for a stale or incomplete rollout.
- Check the trace/video in `production-playwright-report` before deciding —
  a screenshot at the failure point usually makes the distinction obvious.

## Deployment mismatch ("Production does not yet serve this main build")

`pnpm verify:production` prints this when a Production file in the local
manifest inventory, or the supplementary Production manifest receipt, does not
match the local `main` build. This is often a **deploy race**, not a regression:
Vercel hasn't finished deploying the latest `main` commit yet, so it is still
serving an older build (or no manifest for a brand-new file).

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
  network privacy. Run on demand after any deploy you want
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
