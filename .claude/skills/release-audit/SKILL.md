---
name: release-audit
description: Verify a CCA Field Notes release is safe — smoke mode for routine post-deploy checks, full mode for major releases (official-exam change, storage-schema change, major dependency bump). Invoke as /release-audit smoke or /release-audit full.
---

# Release audit

Verifies a release of CCA Field Notes (an Astro + Preact, local-only, no-backend
static study app) without taking any action on it. This skill **reports**;
humans **act**.

The argument selects the mode:

- `/release-audit smoke` — routine post-deploy verification. Fast, reuses
  existing automation, does not re-run CI.
- `/release-audit full` — superset verification for a major release. Only run
  when the user explicitly asks for it.

See `docs/RELEASE_CHECKLIST.md` for the authoritative list of gates and the
rollback criteria, and `docs/PRODUCTION_SMOKE.md` for how the Production smoke
automation works, its safety model, and artifact locations.

## What this skill will NOT do

- Will NOT merge a PR, deploy, roll back a deployment, or delete a branch.
- Will NOT open a PR when there is nothing to fix — a clean audit just reports
  READY.
- Will NOT push code changes as part of an audit. If a finding requires a
  code fix, report it; do not fix it silently inside the audit run.
- Will NOT re-run full E2E, Lighthouse, the full viewport matrix, or the full
  source-URL/freshness sweep in smoke mode — those stay in `full` mode or in
  the manual pre-merge checklist.

## SMOKE mode — routine post-deploy verification

Use after every merge to `main` / Vercel deploy, and whenever the user asks
"is Production OK" without qualifying "full".

Steps:

1. **Confirm merge state.** `git fetch` and check the current `main` SHA
   (`git log -1 --format=%H origin/main`). Note whether the SHA the user cares
   about is actually on `main`.
2. **Trigger or run Production smoke.** The workflow is `workflow_dispatch`
   only — it never runs automatically. Either:
   - Trigger it on GitHub: `gh workflow run production-smoke.yml`, then watch
     it with `gh run watch` / `gh run list --workflow=production-smoke.yml`.
   - Or run the same checks locally:
     ```
     pnpm build && pnpm verify:production
     pnpm test:e2e:production
     ```
3. **Check deployment identity.** Read the result of `pnpm verify:production`
   (or download the `production-deployment-report` artifact from the
   `verify-deployment` job). It compares Production's `/deployment-manifest.json`
   (the source `commit` plus the sha256 of **every** served file — JS, CSS,
   HTML, fonts, icons) against a local `main` build, so a CSS-only or
   metadata-only change is still detected, and cross-checks the served App
   asset against the manifest. The workflow always audits `main` (checks out
   `ref: main`, passes the checked-out SHA as `--commit`). A non-zero exit, or
   the message `Production does not yet serve this main build`, means identity
   FAILED — this stops the smoke job in CI and should stop the audit too (see
   `docs/PRODUCTION_SMOKE.md` for the deploy-race triage before calling it a
   regression).
4. **Check Production Playwright result.** Read the result of
   `pnpm test:e2e:production` (or the `production-playwright-report`
   artifact from the `production-smoke` job — traces/screenshots/videos on
   failure). This is ~8 tests: locale shell/metadata/console health, primary
   lazy views, export/reset/import roundtrip, unreadable-storage safety,
   hands-on persistence, en mobile 360px journey, Mock Exam exactly-once,
   analytics/network privacy.
5. **Check latest `main` PR CI results.** Look at the most recent `e2e.yml`
   and `perf.yml` runs on `main` (`gh run list --branch main`). Read their
   conclusions — do **NOT** re-run them; they already ran pre-merge and are
   unchanged by this task.
6. **Classify every finding** Critical / High / Medium / Low, reusing the
   rollback criteria in `docs/RELEASE_CHECKLIST.md` (data loss/double-attempt
   = Critical; a primary journey or Mock Exam broken, import/export
   corruption, one locale losing a feature, or a fake pass/fail display =
   High).
7. **Emit a verdict** using the Output template below.

Smoke mode MUST NOT: re-run full E2E (`pnpm test:e2e`), re-run Lighthouse,
walk all 28 source URLs, run the full viewport matrix (13/14 in the
checklist), or re-audit all content validation. Those are full-mode or
manual-checklist work.

## FULL mode — major release audit

Only run when the user explicitly asks (e.g. official-exam content change,
storage-schema/migration change, major dependency bump). Full mode is a
superset of smoke mode: run every smoke-mode step, plus:

- Unit tests: `pnpm test`
- Build (typecheck + build): `pnpm build`
- No-analytics build: `pnpm test:no-analytics`
- Bundle guard: `pnpm test:bundle`
- Full E2E (incl. `@slow`): `pnpm test:e2e`
- A11y E2E: `pnpm test:e2e:a11y`
- Lighthouse: `perf.yml` on CI is authoritative — read its latest `main` run,
  do not try to reproduce the budget locally unless CI is unavailable
- Source URLs + freshness: verify each URL in `src/content/sources.ts` is
  reachable and on an allowed official host; confirm `VERIFIED_AT` matches
  the README `最終確認` date
- Production smoke: `pnpm verify:production` + `pnpm test:e2e:production`
  (same as smoke mode)
- Docs/metadata review: SEO metadata, README, and this checklist stay in
  sync with what shipped
- MANUAL visual/content review: flag as "needs human review" — this skill
  cannot perform it

## Automated vs manual

Everything above driven by a command or a CI run is **automated** — report it
with a pass/fail and evidence (exit code, run URL, artifact link). Visual QA,
keyboard QA, ja/en subjective parity, and source-content judgment calls are
**manual** — this skill cannot perform them; list them under "Manual checks
remaining" instead of guessing a result.

## Output template

Always report using this exact structure:

```
Mode:
Commit:
Production deployment:
Deployment identity:
Main CI:
Production smoke:
Critical:
High:
Medium:
Low:
Manual checks remaining:
Verdict:
```

- `Mode`: `smoke` or `full`.
- `Commit`: the `main` SHA audited.
- `Production deployment`: what Production currently serves (SHA/build
  identifier) and how it was determined.
- `Deployment identity`: PASS/FAIL from `pnpm verify:production` +
  one-line evidence.
- `Main CI`: latest `e2e.yml` / `perf.yml` conclusions on `main`, with run
  links — NOT re-run, just read.
- `Production smoke`: PASS/FAIL from `pnpm test:e2e:production` (which of
  the 8 tests, if any failed) + artifact link if failed.
- `Critical` / `High` / `Medium` / `Low`: bulleted findings at each
  severity, or "none".
- `Manual checks remaining`: bulleted list of checklist items this skill
  could not verify (empty in a from-scratch full audit only if the user did
  the manual pass separately and reported it).
- `Verdict`: `READY`, `BLOCKED`, or `NEEDS HUMAN REVIEW`.

## Verdict decision criteria

- **BLOCKED** — any Critical or High finding, OR deployment identity
  mismatch (Production not yet serving the audited build — see the
  deploy-race note in `docs/PRODUCTION_SMOKE.md` before treating this as a
  regression), OR any Production Playwright smoke test failed, OR any
  required automated CI check (e2e.yml/perf.yml on `main`) is failing.
- **NEEDS HUMAN REVIEW** — all automated checks pass (no Critical/High, no
  identity mismatch, no smoke-test failure, main CI green) but one or more
  manual-only checks (visual QA, keyboard QA, content/source judgment) have
  not been performed or reported by a human.
- **READY** — all automated checks pass AND no manual checks remain
  outstanding (either none apply, or a human has already completed and
  reported them).

If Critical/High and a manual gap coexist, report BLOCKED (it dominates).
