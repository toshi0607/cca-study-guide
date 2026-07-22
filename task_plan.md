# Task Plan: Task 4 Study Guide Experience

## Goal

Ship a focused Study Guide experience that truthfully explains the learning path, covers all 5 domains and 30 task statements, persists explicit section progress with the existing storage v2 model, and provides accessible deep links into the currently available learning materials without implementing Task 5 or later features.

## Scope Guardrails

- Implement Task 4 only; do not create or start a Task 5 session.
- Preserve storage schema/version/keys and all existing reviews, quiz statistics, and hands-on progress.
- Do not imply readiness, pass probability, or a 720-equivalent score.
- Do not create dead controls for future hands-on, mock-exam, remediation, or final-checklist features.
- Use only public official primary sources for technical claims; keep official facts distinct from original study guidance.
- Add no dependency unless the existing stack demonstrably cannot meet an acceptance criterion.

## Phases

- [x] Phase 0: Verify PR #29, clean baseline, and create branch from current `origin/main`
- [x] Phase 1: Repository reconnaissance, baseline reproduction, and risk map
- [x] Phase 2: Detailed content/data model and UX design review before implementation
- [x] Phase 3: Content expansion and build-time validation with negative tests
- [x] Phase 4: Pure progress/revision helpers and save-first storage integration
- [x] Phase 5: Lazy Study Guide UI, diagnosis, deep links, i18n, responsive/a11y styling
- [x] Phase 6: Unit, build, no-analytics, Playwright, axe, mobile, and bundle verification
- [x] Phase 7: Matched main/branch Lighthouse runs (GitHub performance verification remains a delivery gate)
- [x] Phase 8: Independent content and adversarial review; fix blockers and re-verify
- [ ] Phase 9: Scope/diff audit, commit, push, PR, CI monitoring, and merge decision

## Key Questions

1. What is the smallest content shape that expresses all 30 statements, sources, order, cards, and questions without loading large prose into the initial App chunk?
2. How can related card/question navigation select the exact target while preserving the quiz double-answer guard?
3. What pure state machine correctly handles absent, current, stale, and future revisions without implicit writes?
4. Where should lazy-loading boundaries live so Guide code/content and validators stay out of the initial client chunk?
5. How will save-first behavior keep the UI unchanged and focus the existing accessible notice on every localStorage failure path?
6. How can matched A/B Lighthouse evidence distinguish existing local LCP variance from branch regressions?

## Decisions Made

- Branch from the verified merge commit `1cadb1f645c513f0b264e1904b4a8079a01eeadf`; no stacked dependency.
- Keep diagnosis answers in component state only and derive progress percentages from content plus existing records.
- Treat future revisions as read-only until a deliberately safe user action is defined and covered by tests; never overwrite them implicitly.
- Prefer a dynamic import boundary for the Study Guide view/content, with accessible loading and error states.
- Use eight Study Guide sections with each of the 30 task statements appearing exactly once; make questions optional for the five statements with no current question, but require every statement to have at least one linked card.
- Validate semantic linkage: section domains must match statements; linked cards/questions must intersect the declared statements/domains; section sources must represent each statement's claim-specific sources; bilingual lists must have matching lengths.
- Add a pure content-agnostic progress helper for current/stale/future classification, deterministic explicit transitions, and derived current progress.
- Centralize all same-tab writes through an App-owned `dataRef` save-first commit path to prevent stale-closure/double-action loss while preserving whole v2 documents.
- Use an App-owned exact learning target to open a single card or existing Quiz question flow; never duplicate card/quiz answering logic in Guide.
- Keep diagnosis state in App memory only. Use native fieldsets/radios, recommend a starting section only, and focus/announce the result.
- For stale completed reconfirmation, preserve the original `completedAt`; update only `revision` and `updatedAt`. This retains the only stored historical completion timestamp while recording the explicit acknowledgement time separately.

## Verification Gates

- Content: 5/5 domains, 30/30 task statements, contiguous unique order, bilingual/source/reference invariants.
- Persistence: explicit start/complete/reconfirm only; save-first; reload stable; stale retained; future protected; unrelated v2 records retained.
- UX: keyboard-only core flow, meaningful exact-target links, English parity, no dead future controls.
- A11y/mobile: semantic structure, live/focus notices, reduced motion, axe serious/critical clean, 360px no overflow.
- Regression: unit/build/Astro/no-analytics/all Playwright pass, including quiz double-answer/migration/import/export/reset.
- Performance: validator and rationales absent from client bundle; chunk raw/gzip before/after; matched 3-run mobile Lighthouse median; GitHub performance job succeeds.
- Review: independent content and adversarial reviewers report no blocking findings.

## Errors Encountered

- The web fetcher received HTTP 403 for both the specified Exam Guide PDF and certification access page. Local repository source records and prior verified notes remain available; retry direct read-only retrieval with the exact URLs and do not add claims that cannot be confirmed.
- System `pdftotext` was unavailable. The bundled PDF runtime provided `pypdf` extraction and Poppler rendering, which successfully verified the downloaded 39-page guide.
- Preliminary 3-run Lighthouse against the no-analytics baseline `dist` failed the local budget (Performance 87, LCP 3,951ms). Treat as a baseline diagnostic and require a same-variable matched main/branch A/B plus GitHub performance success before merge.
- A direct Node 26 type-stripping import could not resolve the repository's extensionless TypeScript module specifiers. Use the project's Vite/Vitest transform or static inspection instead; no files were changed.
- The initial progress-helper design replaced `completedAt` during stale completed reconfirmation, which would discard the only original completion timestamp. Corrected the contract to preserve `completedAt` and use `updatedAt` for reconfirmation time.
- The content worker's first large test-block replacement did not match the current fixture context and was rejected without partial changes. The worker re-read the bounded block and is applying smaller exact patches.
- UI review found a nonexistent diagnosis target ID behind the third choice, bare-ID related-material labels, and exact-target flows without a guaranteed focus/announcement or clear return path. Treat all three as blockers; replace with validated localized targets and cover every diagnosis/Practice/Quiz target branch in E2E.
- The initial stale-revision E2E tried to rewrite a source-module request that is absent from production output. Advance materially changed existing section IDs to revision 2 and test a real stored revision-1 record instead.
- Preserve shipped Study Guide IDs through editorial splits. Keep `sg-context-and-handoff` on the closest section-8 successor at revision 2; newly split sections remain not started rather than inheriting a duplicated completion.
- Final content review found diagnosis options that promised broader coverage than their destination sections. Narrow each option to the exact topic of its mapped section and rerun focused/full tests.
- Adversarial review reproduced four blockers: cross-tab stale whole-document overwrite, Quiz feedback advancing before persistence success, a cached failed Guide import that the retry button did not actually retry, and focus loss after clearing an exact Practice target. Fix each root cause and add browser regressions before final validation.
- Two full Playwright reruns lost their preview server mid-suite because the adversarial reviewer concurrently launched Playwright on the same configured port 4325. Early tests passed and remaining cases cascaded with `ERR_CONNECTION_REFUSED`; rerun once in isolation after the reviewer exits.

## Status

**Currently in Phase 9** — auditing scope, preparing the commit and PR, then monitoring every required CI job before the merge decision.
