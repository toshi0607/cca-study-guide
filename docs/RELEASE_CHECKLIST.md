# Release checklist — CCA Field Notes

Reusable gate for every release. This is a public, local-only (no backend) static
Astro + Preact app; there is no deploy pipeline to babysit beyond Vercel picking up
`main`. Run the **Pre-merge** section on the release branch before merging to `main`,
and the **Post-merge** section against Production after Vercel deploys.

Commands assume repo root. Playwright waits are auto; do not add sleeps.

## Pre-merge (on the release branch)

| # | Check | Command / how | Pass condition |
|---|-------|---------------|----------------|
| 1 | Unit tests | `pnpm test` | all pass |
| 2 | Type check + build | `pnpm build` (runs `astro check` then `astro build`) | 0 errors, 0 warnings; build completes |
| 3 | No-analytics build | `pnpm test:no-analytics` | passes (no GA loader/consent/disclosure when `PUBLIC_GA_MEASUREMENT_ID` unset) |
| 4 | Initial bundle guard | `pnpm build && pnpm test:bundle` | `check-initial-bundle: OK`; question bank / rationales / analysis / study-guide / hands-on / official-scenarios / Mock-Exam view chunks NOT in `App.js` static graph |
| 5 | Fast E2E | `pnpm test:e2e:fast` | all pass |
| 6 | Full E2E (incl. @slow) | `pnpm test:e2e` | all pass |
| 7 | A11y E2E | `pnpm test:e2e:a11y` | 0 axe violations (whole-app states = zero; long-form content = no serious/critical) |
| 8 | E2E repeated run | run #5 or #7 twice | no new failures across runs (flake-free) |
| 9 | Link / source check | `curl -sIL` each URL in `src/content/sources.ts`; confirm redirects stay on an allowed official host | all reachable (200), no off-domain redirect, no 404/410 |
| 10 | Source freshness | `VERIFIED_AT` in `src/content/sources.ts` == README `最終確認` date | match |
| 11 | Storage migration | `pnpm test src/lib/storage.test.ts` + storage E2E | v1→v3 / v2→v3 migrate without loss; malformed/unknown/future version handled; unreadable current doc flagged, never overwritten |
| 12 | Import/export roundtrip | storage/import-export E2E | export→reset→import restores progress incl. Mock Exam state |
| 13 | Visual QA (real browser) | open ja + en at 360 / 375 / 768 / 1024 / 1440 | no horizontal scroll, no clipped text, no CTA/bottom-nav overlap, 60-cell palette usable on mobile |
| 14 | Keyboard QA | Tab/Shift+Tab/Enter/Space/Escape through a primary journey per locale | every primary journey completable keyboard-only; focus visible and restored on view/dialog changes |
| 15 | ja / en parity | inspect both locales | no feature reachable in only one locale; no missing copy key (TS enforces `UiCopy`/`SiteCopy` parity) |
| 16 | Bundle comparison | `pnpm build` on branch vs `main`; compare `App.js` eager static-import closure (raw + gzip) | no major initial-bundle regression; heavy content stays lazy |
| 17 | Lighthouse (mobile, median of ≥3) | `perf.yml` on CI is authoritative; locally: serve `dist`, `lighthouse --only-categories=performance` ×3+ | perf ≥ 0.90, FCP ≤ 2000ms, CLS ≤ 0.02, LCP ≤ 3000ms. LCP is font/throttling-sensitive and noisy locally — trust CI's clean run and the branch-vs-main delta, not a single local number |
| 18 | Preview smoke test | open the PR Preview (ja + en) | Today, Guide, Hands-on, Official scenarios, Practice, Quiz, Mock Exam, History, Review, Analysis, Progress all load; no console errors |
| 19 | Known issues | review open Low items + `tasks/*` | every retained Low has a recorded reason; no open Critical/High/Medium |

## Post-merge (against Production after Vercel deploy)

| # | Check | How | Pass condition |
|---|-------|-----|----------------|
| 1 | Deployment SHA | compare Production `App.*.js` hash to a local `main` build's hash, or Vercel dashboard | Production serves the merged `main` |
| 2 | `/` and `/en/` load | open both | 200, render, correct locale |
| 3 | Today | open each locale | due count sane (not unnatural), state-appropriate CTAs |
| 4 | Guide | open a section | expands + focuses; start/complete works and persists |
| 5 | Hands-on | open a guide | steps toggle; guide completes |
| 6 | Official scenarios | open a case | cross-links to guide/card/question/Hands-on work |
| 7 | Practice | reveal + rate a card | rating persists; due count updates |
| 8 | Quiz | answer a question | feedback + per-choice rationale shown; stat persists |
| 9 | Mock Exam | start / resume / palette / submit | can start, resume, open palette, submit; exactly-once (no double attempt) |
| 10 | History / Review / Analysis | from a saved attempt | past attempts open; stale attempts not re-graded; analysis shows evidence level; NO pass/fail or scaled-score |
| 11 | Progress | open | aggregates for Guide/Hands-on/Practice/Quiz/Mock Exam correct |
| 12 | Export / import | export JSON, reset, re-import | roundtrip restores all progress |
| 13 | Mobile | 360–375px, both locales | no horizontal scroll, controls reachable, palette usable |
| 14 | Analytics / network | DevTools Network | only page-view GA when configured; NO custom learning events (answers/ratings/scores/import not sent) |
| 15 | Console errors | DevTools Console | none on any primary view |
| 16 | SEO metadata | view-source both locales | correct title/description, canonical, reciprocal hreflang (ja/en/x-default), OG tags |

### Rollback criteria
Roll back (Vercel: promote previous deployment) if any is observed on Production:
- Data loss, scoring/question corruption, or a double-registered saved attempt (Critical).
- A primary journey cannot complete, or Mock Exam cannot start/resume/submit/review (High).
- import/export corrupts data, or one locale loses a primary feature (High).
- A display that could be mistaken for an official pass/fail or scaled score (High).

A single retained Low or a locally-noisy LCP is **not** a rollback trigger.
