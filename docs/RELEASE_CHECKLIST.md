# Release checklist — CCA Field Notes

Reusable gate for every release. This is a public, local-only (no backend) static
Astro + Preact app; there is no deploy pipeline to babysit beyond Vercel picking up
`main`. Run the **Pre-merge** section on the release branch before merging to `main`,
and the **Post-merge** section against Production after Vercel deploys.

Commands assume repo root. Playwright waits are auto; do not add sleeps.

## Four layers of verification

Every check in this document belongs to one of four layers. Knowing the
layer tells you whether a check already ran for you, or whether you still
need to run or perform it.

| Layer | What | When it runs | Trigger | Status |
|---|---|---|---|---|
| **1 — PR CI** | `e2e.yml` (full Playwright, 131 tests, Chromium, 1 worker) + `perf.yml` (unit tests + build + bundle guard + Lighthouse mobile ×3) | Automatically, on every push to `main` and every pull request | GitHub Actions, automatic | Existing, **unchanged by this task** |
| **2 — Production smoke automation** | `production-smoke.yml`: `verify-deployment` (identity check, `pnpm verify:production`) → `production-smoke` (~8 Playwright tests against live Production, `pnpm test:e2e:production`) | On demand, post-merge, whenever you want confidence Production is healthy | `workflow_dispatch` only — never automatic, never blocks a merge | New (this task); see `docs/PRODUCTION_SMOKE.md` |
| **3 — Full release audit** | Superset: everything in Layers 1–2, plus source-URL/freshness checks, docs/metadata review, and a request for the Layer 4 manual pass | On demand, only for major releases (official-exam content change, storage-schema change, major dependency bump) | Explicit user request — `/release-audit full` | New (this task); see `.claude/skills/release-audit/SKILL.md` |
| **4 — Manual review** | Visual QA, keyboard QA, ja/en subjective parity, content/source judgment calls | Whenever a human is available to look | Human only — no automation can perform these | Existing, unchanged |

Use `/release-audit smoke` after a routine merge (drives Layers 1 + 2 and
reports a verdict). Use `/release-audit full` only when the user explicitly
asks for a major-release audit (drives Layers 1–3 and flags what's left for
Layer 4).

## Pre-merge (on the release branch)

| # | Check | Command / how | Pass condition | Layer |
|---|-------|---------------|----------------|-------|
| 1 | Unit tests | `pnpm test` | all pass | 1 — CI (`perf.yml` runs `pnpm test`) |
| 2 | Type check + build | `pnpm build` (runs `astro check` then `astro build`) | 0 errors, 0 warnings; build completes | 1 — CI (`perf.yml` runs `pnpm build`) |
| 3 | No-analytics build | `pnpm test:no-analytics` | passes (no GA loader/consent/disclosure when `PUBLIC_GA_MEASUREMENT_ID` unset) | Pre-merge only — not in CI, run locally |
| 4 | Initial bundle guard | `pnpm build && pnpm test:bundle` | `check-initial-bundle: OK`; question bank / rationales / analysis / study-guide / hands-on / official-scenarios / Mock-Exam view chunks NOT in `App.js` static graph | 1 — CI (`perf.yml` runs `check-initial-bundle.mjs`) |
| 5 | Fast E2E | `pnpm test:e2e:fast` | all pass | Pre-merge only — quick local iteration; CI runs the full suite instead |
| 6 | Full E2E (incl. @slow) | `pnpm test:e2e` | all pass | 1 — CI (`e2e.yml`) |
| 7 | A11y E2E | `pnpm test:e2e:a11y` | 0 axe violations (whole-app states = zero; long-form content = no serious/critical) | 1 — CI (included in `e2e.yml`'s full suite); run standalone for focused local iteration |
| 8 | E2E repeated run | run #5 or #7 twice | no new failures across runs (flake-free) | Pre-merge only — not in CI, run locally |
| 9 | Link / source check | `curl -sIL` each URL in `src/content/sources.ts`; confirm redirects stay on an allowed official host | all reachable (200), no off-domain redirect, no 404/410 | 3 — full audit only (manual otherwise) |
| 10 | Source freshness | `VERIFIED_AT` in `src/content/sources.ts` == README `最終確認` date | match | 3 — full audit only (manual otherwise) |
| 11 | Storage migration | `pnpm test src/lib/storage.test.ts` + storage E2E | v1→v3 / v2→v3 migrate without loss; malformed/unknown/future version handled; unreadable current doc flagged, never overwritten | 1 — CI (unit test in `pnpm test`; E2E in `e2e.yml`); unreadable-doc case also re-verified live post-merge (Layer 2, prod smoke test 4) |
| 12 | Import/export roundtrip | storage/import-export E2E | export→reset→import restores progress incl. Mock Exam state | 1 — CI (`e2e.yml`); re-verified live post-merge (Layer 2, prod smoke test 3) |
| 13 | Visual QA (real browser) | open ja + en at 360 / 375 / 768 / 1024 / 1440 | no horizontal scroll, no clipped text, no CTA/bottom-nav overlap, 60-cell palette usable on mobile | 4 — manual |
| 14 | Keyboard QA | Tab/Shift+Tab/Enter/Space/Escape through a primary journey per locale | every primary journey completable keyboard-only; focus visible and restored on view/dialog changes | 4 — manual |
| 15 | ja / en parity | inspect both locales | no feature reachable in only one locale; no missing copy key (TS enforces `UiCopy`/`SiteCopy` parity) | 4 — manual (TS compiler backs the copy-key part in Layer 1) |
| 16 | Bundle comparison | `pnpm build` on branch vs `main`; compare `App.js` eager static-import closure (raw + gzip) | no major initial-bundle regression; heavy content stays lazy | 4 — manual |
| 17 | Lighthouse (mobile, median of ≥3) | `perf.yml` on CI is authoritative; locally: serve `dist`, `lighthouse --only-categories=performance` ×3+ | perf ≥ 0.90, FCP ≤ 2000ms, CLS ≤ 0.02, LCP ≤ 3000ms. LCP is font/throttling-sensitive and noisy locally — trust CI's clean run and the branch-vs-main delta, not a single local number | 1 — CI (`perf.yml`) |
| 18 | Preview smoke test | open the PR Preview (ja + en) | Today, Guide, Hands-on, Official scenarios, Practice, Quiz, Mock Exam, History, Review, Analysis, Progress all load; no console errors | 4 — manual (Preview deployment, not Production — distinct from Layer 2) |
| 19 | Known issues | review open Low items + `tasks/*` | every retained Low has a recorded reason; no open Critical/High/Medium | 4 — manual |

## Post-merge (against Production after Vercel deploy)

Layer 2 (`production-smoke.yml` / `pnpm verify:production` + `pnpm
test:e2e:production`, see `docs/PRODUCTION_SMOKE.md`) now automates most of
this section on demand. Run `/release-audit smoke` to drive it and get a
verdict instead of working this table by hand — the table stays here as the
authoritative definition of what "correct" means for each item, and as the
manual fallback if the automation is unavailable.

| # | Check | How | Pass condition | Automated by |
|---|-------|-----|----------------|---------------|
| 1 | Deployment SHA | `pnpm verify:production` compares Production's `/deployment-manifest.json` (source `commit` + sha256 of every served file) to a local `main` build | Production serves the merged `main` (commit + full file set match) | **Automated** — Layer 2 (`pnpm verify:production`, `production-deployment-report`) |
| 2 | `/` and `/en/` load | open both | 200, render, correct locale | **Automated** — Layer 2 (prod smoke test 1: shell load) |
| 3 | Today | open each locale | due count sane (not unnatural), state-appropriate CTAs | Partial — Layer 2 confirms the view loads (test 2); due-count sanity is data-dependent → Layer 4 / Layer 3 |
| 4 | Guide | open a section | expands + focuses; start/complete works and persists | Partial — Layer 2 confirms the view loads (test 2); expand/persist behavior → Layer 4 / Layer 3 |
| 5 | Hands-on | open a guide | steps toggle; guide completes | **Automated** — Layer 2 (prod smoke test 5: hands-on completion persistence) |
| 6 | Official scenarios | open a case | cross-links to guide/card/question/Hands-on work | Partial — Layer 2 confirms the view loads (test 2); cross-link correctness → Layer 4 / Layer 3 |
| 7 | Practice | reveal + rate a card | rating persists; due count updates | Partial — Layer 2 confirms the view loads (test 2); rate/persist/due-count → Layer 4 / Layer 3 |
| 8 | Quiz | answer a question | feedback + per-choice rationale shown; stat persists | Partial — Layer 2 confirms the view loads (test 2); rationale/persist → Layer 4 / Layer 3 |
| 9 | Mock Exam | start / resume / palette / submit | can start, resume, open palette, submit; exactly-once (no double attempt) | **Automated** — Layer 2 (prod smoke test 7: start/resume/palette/submit exactly-once) |
| 10 | History / Review / Analysis | from a saved attempt | past attempts open; stale attempts not re-graded; analysis shows evidence level; NO pass/fail or scaled-score | Partial — Layer 2 confirms the view loads (test 2); evidence-level content and no-score-display → Layer 4 / Layer 3 |
| 11 | Progress | open | aggregates for Guide/Hands-on/Practice/Quiz/Mock Exam correct | Partial — Layer 2 confirms the view loads (test 2); aggregate correctness → Layer 4 / Layer 3 |
| 12 | Export / import | export JSON, reset, re-import | roundtrip restores all progress | **Automated** — Layer 2 (prod smoke test 3: export→reset→import roundtrip) |
| 13 | Mobile | 360–375px, both locales | no horizontal scroll, controls reachable, palette usable | Partial — Layer 2 covers en @ 360px (prod smoke test 6); ja and the 375px breakpoint → Layer 4 / Layer 3 |
| 14 | Analytics / network | DevTools Network | only page-view GA when configured; NO custom learning events (answers/ratings/scores/import not sent) | **Automated** — Layer 2 runtime (prod smoke test 8) + Layer 1 static (`pnpm test:no-analytics`) |
| 15 | Console errors | DevTools Console | none on any primary view | **Automated** — Layer 2 (prod smoke test 1: console health) |
| 16 | SEO metadata | view-source both locales | correct title/description, canonical, reciprocal hreflang (ja/en/x-default), OG tags | **Automated** — Layer 2 (prod smoke test 1: metadata) |
| 17 | Unreadable storage safety | corrupt/unreadable `localStorage` doc, ja + en | flagged, never overwritten (same invariant as pre-merge #11, re-verified live) | **Automated** — Layer 2 (prod smoke test 4) |

### Not covered by Production smoke

Two categories from the checklist above are never automated, regardless of
mode:

- **Subjective visual quality** (pixel-level polish, palette usability
  beyond "does it render") — Layer 4, manual only.
- **Content / source freshness** (URL reachability, `VERIFIED_AT` currency —
  pre-merge #9–10) — Layer 3 (full audit) or Layer 4 (manual); Production
  smoke does not re-check source content.

### Rollback criteria
Roll back (Vercel: promote previous deployment) if any is observed on Production:
- Data loss, scoring/question corruption, or a double-registered saved attempt (Critical).
- A primary journey cannot complete, or Mock Exam cannot start/resume/submit/review (High).
- import/export corrupts data, or one locale loses a primary feature (High).
- A display that could be mistaken for an official pass/fail or scaled score (High).

A single retained Low or a locally-noisy LCP is **not** a rollback trigger.

These are the same Critical/High/Medium/Low severities `/release-audit`
(`.claude/skills/release-audit/SKILL.md`) uses to classify findings from
Layer 1–3 checks and to decide READY / BLOCKED / NEEDS HUMAN REVIEW.
