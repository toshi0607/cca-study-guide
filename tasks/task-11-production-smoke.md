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
- [ ] Main: package.json scripts + .gitignore
- [ ] Main: integrate, verify each subagent, resolve conflicts
- [ ] Main: full verification suite (§9)
- [ ] Main: prod smoke ×2 green, measure time, worker 1 vs 2
- [ ] Main: PR

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

## Full gate results (§9) — all green
pnpm test 443 | build OK | test:no-analytics OK | test:bundle OK | test:e2e:fast 80 | test:e2e 131 | test:e2e:a11y 10 | verify:production exit0 byte-match | test:e2e:production 9× (4+ consecutive green @ 2 workers).
