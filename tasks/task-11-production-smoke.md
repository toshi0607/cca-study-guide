# Task 11: On-demand Production smoke automation + Release Audit Skill

Branch: `claude/production-smoke-automation-515e78` (off latest `main`, incl. PR #41 verified).
Goal: reproducible, low-cost release verification WITHOUT growing PR CI time.

## Constraints (Constraint Ledger)

| Constraint | Source | Verify by |
|------------|--------|-----------|
| Do NOT change PR-run scope of e2e.yml / perf.yml | user | git diff both files == none |
| Production smoke NEVER on pull_request | user | on: == workflow_dispatch only |
| Workflow is workflow_dispatch ONLY (no schedule/push/deployment_status/workflow_run) | user | grep on: block |
| Production smoke ≤ 8–10 tests | user | count tests/production/* |
| Playwright wall-clock ≤ 3 min | user | measured |
| Workflow (install+build+smoke) ≤ 5 min target | user | reasoned |
| No re-run of full 131 E2E on Production | user | separate testDir |
| No 60-Q full answer in Production | user | Mock Exam test answers 1 Q |
| No 28 source HTTP checks in smoke | user | none in tests/production |
| No Lighthouse in smoke | user | none in yml |
| No sleep / fixed waits | user+rules | grep sleep/waitForTimeout == none |
| retries: 0 | user | config |
| new context per test, no shared localStorage | user | context-per-test; in-context seed |
| storage ops only in isolated context | user | no bleed |
| GA/external transient failure != release failure | user | ignore GA host, assert same-origin only |
| No product code change unless justified | user | git diff src/ == none |
| No budget relax / skip / weaken assertions | user | existing specs untouched |
| Node 22 / pnpm / Chromium-only | CI | workflow + config |
| No commit of downloads/traces/reports | user | .gitignore + git status |

## Assumptions (all VERIFIED unless noted)

- Both `/` and `/en/` reference identical hashed App.*.js + client.*.js — dist/index.html + dist/en/index.html.
- Production == this main build today (App.T5-Yk7yt.js, client.BQ2fQsCE.js) — curl vs local dist.
- Vite content-hash naming ⇒ filename match ≈ byte match; still byte/hash-verify.
- Prod `/` HTTP 200, 0 redirects — curl -IL.
- Playwright TS can import src/lib/storage for STORAGE_KEY — existing fixtures/storage.ts.
- Prod config has NO webServer (hits live prod) ⇒ no dist race.
- STORAGE_KEY='cca-field-notes:v2', LEGACY='cca-field-notes:v1' — storage.ts:34.

## Plan / Todo

- [x] B: scripts/verify-production-deployment.mjs + unit test — VERIFIED. 20 unit tests green (now in `pnpm test` = 443 total). Real run against prod: exit 0, byte/sha256 match (App.T5-Yk7yt 33442B, client.BQ2fQsCE 1407B). Report ok:true.
- [x] A: playwright.production.config.ts + tests/production/* (9) + prod fixture — VERIFIED. 9 tests. My runs: 2w 15.6s green, 2w 13.5s green, 1w 17.5s green (+ subagent 2w×2 green) = 4 consecutive green @ 2 workers. No sleeps/retries. Context-per-test isolation, external-failure tolerant. Assertions full-strength (mirror existing specs). JA Quiz label corrected to 演習. workers=2 kept (faster + stable).
- [x] C: .github/workflows/production-smoke.yml — VERIFIED (workflow_dispatch only, 2-job chain, artifacts, summary, download-artifact between jobs). Assumes `pnpm verify:production -- --json <path>` + `pnpm test:e2e:production`.
- [x] D: SKILL.md + docs — VERIFIED. Skill has smoke/full modes, output template, NOT-DO list, READY/BLOCKED/NEEDS HUMAN REVIEW criteria. RELEASE_CHECKLIST retains all 35 original gates + four-layer structure + Automated-by column. PRODUCTION_SMOKE.md complete. Only real script names.
- [x] Main: package.json scripts (test:e2e:production, verify:production); .gitignore already covers artifacts
- [x] Main: integrated + verified all 4 subagents; fixed pnpm `--` arg, testIgnore, vitest include
- [x] Main: full verification suite (§9) — all green
- [x] Main: prod smoke green 4× (2w 13.5–15.6s, 1w 17.5s); workers=2 chosen
- [x] Main: PR #45 created; CI green (E2E + Lighthouse); production-smoke NOT triggered on PR

## Notes

- vitest.config.ts include == `src/**/*.test.ts` ONLY. Subagent B's script unit test lives in `scripts/`, so `pnpm test` won't pick it up unless I add `scripts/**/*.test.*` to the include. DECISION: extend include after B lands (match B's filename ext) so the identity-script logic (offline DI fakes) gets covered by the normal unit gate. Scope to scripts/**/*.test.* — playwright specs are *.spec.ts under tests/, so no collision.
- package.json: added `test:e2e:production` + `verify:production` (main-owned). Done.
- .gitignore already covers tmp/, playwright-report/, test-results/, dist/ — prod artifacts won't be committed.
- `type: module` is set → .mjs and .js both ESM.

- DEVIATION (integration fix, main): B's parseCliArgs rejected a bare `--`. The workflow calls `pnpm verify:production -- --json <path>`; pnpm forwards the literal `--` AND without `--` pnpm eats `--json` itself. Fix: parseCliArgs now `continue`s on a standalone `--`. Minimal, unit tests still 20/20. This is why the `--` in the workflow is REQUIRED, not removable.
- vitest.config.ts include extended to `['src/**/*.test.ts', 'scripts/**/*.test.mjs']` so the identity-script test runs in the normal unit gate. `pnpm test` = 443 tests / 20 files, green.

## Review

Fresh-context reviewer (opus): APPROVE, no Critical/High. 3 findings, all resolved:
- [Med #1] consoleErrors collector didn't exclude external (GA/GTM) load failures → latent false-fail vs constraint 7. FIXED: added `isExternalConsoleError` filter in tests/production/fixtures/production.ts (drops console errors whose source location host is external; keeps same-origin/app + no-location). Re-ran suite 2× green.
- [Low #2] GA custom-event detection only read `en=` from query, missing POST-body-batched events. FIXED: privacy.spec.ts now scans both query and body (`en=` per line), gaEvents[] array.
- [Low #3] fetchProductionAsset didn't re-check final host after redirect (not exploitable — byte match required). FIXED: added allowlist host check mirroring fetchProductionHtml.

Post-fix verification: script 20 unit tests green, verify:production exit 0 (byte match), tsc clean, prod smoke 9 passed 2× more (14.6s/15.2s). Reviewer constraints C1–C6 VERIFIED satisfied (e2e.yml/perf.yml untouched, workflow_dispatch-only, testIgnore=131, ≤10 tests/retries:0/no sleeps, identity exit semantics, no src changes).

## Review round 2 (external PR review — Request changes) — RESOLVED

- [Medium] Identity compared only App/client → couldn't detect CSS/HTML/metadata/static-asset changes; workflow trusted dispatched ref (feature branch could false-PASS). FIXED:
  - New `scripts/deployment-manifest.mjs` + `astro:build:done` hook in astro.config.mjs → generates `dist/deployment-manifest.json` = `{ commit, files: sha256 of EVERY served file }`. HTML hashed after normalizing the ONLY 2 per-build/env tokens (GA id + astro-island `uid`) — empirically verified those are the only non-deterministic HTML tokens (local vs prod HTML identical after normalization; privacy pages already identical).
  - `verify-production-deployment.mjs` rewritten: fetch prod `/deployment-manifest.json`, compare full file map + commit, cross-check served App asset vs manifest. Verdict = files identical AND commit equal.
  - Workflow: checkout `ref: main` (both jobs), record `git rev-parse HEAD`, pass `--commit`, summary uses audited SHA. Build now sets a GA id so the analytics snippet is present (normalized away in the hash).
- [Low] Unreadable-storage matrix only 3 cases (no en future). FIXED: added en future-version case (now 4) + aria-describedby association assertion (verified present in deployed ProgressView).
- [Low] Early-failure returned report:null → no artifact. FIXED: runVerification always returns a report `{ ok, stage, host, testedCommit, productionCommit, mismatches, error, checkedAt }`; CLI writes it even on failure.

Post-round-2 verification: script unit tests 22/22 (match + css-only/html-only/asset-only/commit/404/500/stale-asset/off-host/missing-manifest cases); `pnpm test` 445; build+manifest OK (45 files, commit stamped); bundle OK; no-analytics OK; full E2E 131; a11y 10; tsc clean; prod smoke 9× green twice (17.7s/17.0s). Live run vs current prod correctly reports NOT_YET_SERVED (prod is pre-merge #42) + writes failure report — will MATCH after this PR deploys.

## Full gate results (§9) — all green
pnpm test 443 | build OK | test:no-analytics OK | test:bundle OK | test:e2e:fast 80 | test:e2e 131 | test:e2e:a11y 10 | verify:production exit0 byte-match | test:e2e:production 9× (4+ consecutive green @ 2 workers).
