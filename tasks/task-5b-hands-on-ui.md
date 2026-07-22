# Task 5B: Hands-on UI, progress helpers, save-first, navigation

Base: origin/main = a5d9828 (Task 5A #31 merged). Branch: feat/hands-on-ui.
5A shipped the content model + 4 guides (unrendered). 5B renders them.

## Baseline (VERIFIED)
- pnpm test: 11 files / 202 tests pass
- storage-schema.ts already validates HandsOnProgress (no change)

## IA decision
Hands-on is a sub-area under Guide, NOT a new bottom-nav item (bottom nav is
grid repeat(5,1fr), tuned for 5 at 360px; a 6th crowds tap targets). Add
'hands-on' to the View union but NOT to viewKeys. Entry points: GuideView
learning-path "Hands-on" stage (flip available:false→true, make it a link) plus
a dedicated Guide entry. Detail↔list is internal HandsOnView state with an
explicit in-app back button and focus/announcement.

## Stale-revision decision (Option 1)
Stale record is read-only; explicit reconfirm moves it to the current revision as
in_progress, with completedStepIds = stored ∩ current step ids. Rationale: a
guide with steps is only "completed" when all current required steps are done; a
new step at a new revision means it is not. So reconfirm lands in in_progress
(learner re-verifies), unlike study-guide reconfirm which keeps completed. We
never overwrite an old completedAt with "now"; moving to in_progress simply drops
completedAt honestly. We never prune unknown step ids or future/unknown records
on read.

## Constraints
| Constraint | Source | Verify by |
|------------|--------|-----------|
| No storage v2 schema/key/migration change | user | git diff storage*.ts empty |
| Save-first: never advance UI before save succeeds | user | commitData pattern + tests |
| commitData re-reads canonical storage before mutate (cross-tab) | user | reuse App commitData |
| No computed progress persisted | user | only {revision,status,completedStepIds,...} saved |
| completedStepIds no duplicates | user | helper + schema |
| Don't prune unknown step ids / future / unknown records on read | user | derive tests + E2E |
| complete only when all required steps done | user | helper guard + test |
| No new bottom-nav item crowding 360px | user | CSS + 360 overflow E2E |
| No dead buttons | user | learning-path link works |
| No API key input/storage, no network to Claude/CI | user | grep audit |
| Long guide bodies NOT in initial bundle | user | lazy load + dist audit |
| ja/en parity for all new visible text | user | manual + review |
| a11y: headings/landmarks, native button/checkbox, fieldset/legend, focus, axe 0 | user | axe E2E |

## Assumptions
| Assumption | Status | Evidence |
|------------|--------|----------|
| GuideEntry lazy-load pattern reusable for HandsOnEntry | VERIFIED | GuideEntry.tsx |
| commitData handles save-first + cross-tab + notice focus | VERIFIED | App.tsx:76 |
| HandsOnProgress storage validation done | VERIFIED | storage-schema.ts:102 |
| No stored ho-ci-review records except via manual import | VERIFIED (5A) | hands-on unrendered until now |

## Steps (phase-gated, verify each)
- [x] P1 hands-on-progress.ts + test (23 tests pass)
- [x] P2 ui.ts handsOn copy (ja/en) + views label + path target
- [x] P3 HandsOnView.tsx (list+detail) + HandsOnEntry.tsx (lazy)
- [x] P4 App.tsx: view 'hands-on', saveHandsOn* via commitData, navigation, focus
- [x] P5 GuideView.tsx: learning-path Hands-on link + availability flip + entry section
- [x] P6 app/types.ts View union; AppNavigation excludes hands-on; global.css + responsive
- [x] P7 E2E: flow, stale ho-ci-review rev-1 seed, save-fail, future/unknown preserve, axe, 360px (8 tests)
- [x] P8 verify: vitest 225 pass; build 0/0/1(pre-existing); no-analytics pass; E2E 72/72 single-worker;
      axe 0; 360px ok; bundle: HandsOnView 66KB/22KB gzip DEFERRED (no content in initial);
      initial delta +8,805 raw / +2,671 gzip (progress helper + App handlers + Rollup reshuffle);
      no rationales/validate/zod in client; verified manually in browser (list/detail/steps render)
- [x] P9 reviews done. i18n/UX (opus): no BLOCKER/MAJOR; applied 対応シナリオ→公式シナリオ,
      en Expected result+how to verify, dropped 必須/required from completeHint, en intro impersonal.
      Adversarial (reviewer): APPROVE, all 15 checks SOUND; applied guide aria-current in hands-on,
      step-count in step notice (aria-live re-announce), guarded scenario/skill index lookups.
      Re-verified: 225 vitest, build 0/0/1, hands-on E2E 8/8 single-worker.

## Verification evidence (P8)
- Full E2E 4-worker showed 3 failures in UNRELATED existing tests (guide diagnosis L34, session-rating
  save-fail L619, analytics L959). Re-ran all 3 single-worker → PASS. Full suite single-worker → 72/72.
  Conclusion: 4-worker resource-contention flakiness (matches known port/parallelism caveat), NOT a
  regression. E2E is not in CI (only lighthouse + Vercel).

## Notes
(deviations logged here)
