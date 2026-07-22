# Task 4: Study Guide Experience

## Preconditions

- [x] Fetch/prune origin
- [x] Confirm clean worktree
- [x] Confirm PR #29 merged as `1cadb1f645c513f0b264e1904b4a8079a01eeadf`
- [x] Confirm HEAD equals latest `origin/main`
- [x] Create `codex/task-4-study-guide` from `origin/main`
- [x] Read closest instructions and `tasks/lessons.md`
- [x] Create Task 4 planning files before implementation

## Reconnaissance and Baseline

- [x] Read required docs, content, storage, UI, i18n, styles, workflow, and E2E files
- [x] Map exact-target navigation and lazy-loading options
- [x] Reproduce unit/build/Astro/no-analytics/E2E baseline
- [x] Record baseline chunk raw/gzip and client import audit
- [x] Record preliminary baseline 3-run mobile Lighthouse evidence (formal matched A/B remains in verification)
- [x] Consolidate subagent findings and refine implementation specification

## Content and Validation

- [x] Expand Study Guide to cover 5 domains / 30 task statements
- [x] Supply bilingual original summaries, revision, recommended order, sources, cards, and questions
- [x] Keep official claims distinct from original recommendations and avoid exam-dump-like content
- [x] Validate 30/30 and 5/5 coverage at build time
- [x] Validate unique contiguous order and existing references
- [x] Add negative tests for missing/duplicate/orphan/bilingual/source/order failures

## Progress and Persistence

- [x] Add pure helpers for absent/in-progress/completed and current/stale/future revisions
- [x] Derive rates from content and records; do not persist computed progress
- [x] Use existing `StudyGuideProgress` without schema/version/key changes
- [x] Persist only explicit start/complete/reconfirm actions
- [x] Implement save-first updates and focus accessible failure notices
- [x] Preserve stale records until explicit reconfirm
- [x] Protect future revisions from overwrite/destruction
- [x] Prove reviews/quizStats/handsOnProgress remain unchanged

## Study Guide UX

- [x] Explain service capabilities, limits, unofficial status, no dumps, and no guarantee
- [x] Present the eight-stage learning path and remaining-time plan through end of August
- [x] Add accessible first-use diagnosis with an in-memory recommendation only
- [x] Add truthful availability labels and no dead future controls
- [x] Deep-link each section to exact related cards/questions/sources
- [x] Keep Guide code/content off the initial App chunk where practical
- [x] Add accessible loading/error states, responsive styling, reduced-motion handling, and ja/en parity

## Verification

- [x] `pnpm test`
- [x] `pnpm build` / Astro check
- [x] `pnpm test:no-analytics`
- [x] `pnpm test:e2e`
- [x] Keyboard/reload/stale/future/save-error/seeded-record flows
- [x] Exact card/question/source deep-link flows and quiz double-answer guard
- [x] ja/en axe serious/critical and 360px overflow checks
- [x] Bundle raw/gzip comparison and forbidden-import audit
- [x] Matched main/branch 3-run Lighthouse comparison and budget script

## Independent Review

- [x] Content review: mapping, terminology, bilingual meaning, sources, design judgment, dump guardrail
- [x] Adversarial review: data loss, stale/future state, double action, reload/import/export/reset, storage errors, prototype pollution, mobile/a11y/bundle/misleading readiness
- [x] Resolve blockers and rerun affected validation

## Delivery

- [x] Audit diff for Task 4 scope only
- [ ] Commit and push
- [ ] Create PR with all required sections
- [ ] Monitor all PR CI, including performance
- [ ] Rebase/update from latest main if needed and revalidate
- [ ] Merge only if every acceptance gate is satisfied; otherwise report merge-ready or blocked

## Review

Implementation and isolated local verification are complete. Unit tests pass 185/185; Astro build/check passes with the existing Zod URL deprecation hint; no-analytics passes; Playwright passes 64/64. Final content and adversarial reviewers report no blockers after corrections.

Actual browser resource timing shows that the App filename alone is not a valid initial-bundle measure. Main initially requests 241,751 raw / 85,893 gzip bytes of first-party JS. The branch initially requests 249,979 / 87,439 bytes (+8,228 / +1,546) because question content becomes a shared chunk; opening Guide then requests only `GuideView` at 18,263 / 7,506 bytes. The Guide prose is therefore deferred, but initial aggregate JS is honestly recorded as a small increase.

Final matched mobile Lighthouse (three interleaved runs, identical analytics-enabled builds) gives main median Performance 94, FCP 1,219ms, LCP 3,053ms, CLS 0 (existing local LCP budget miss), and branch median Performance 95, FCP 1,290ms, LCP 2,893ms, CLS 0 (budget pass). GitHub performance CI remains mandatory before merge.
