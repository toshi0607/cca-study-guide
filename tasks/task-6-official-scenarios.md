# Task 6 — Official Scenario Learning

Branch: `claude/official-scenario-learning-8ba154` (recommended name in prompt: `feat/official-scenario-learning`; this worktree branch is already based on latest `origin/main`).

Base SHA: `fa68f72ee320887390c6893378b2fd40cb9d8021` (origin/main HEAD at start, = PR #32 merge).

## Purpose

Turn the six official CCAR-F exam scenarios from a bare classification axis into a *design-judgment* learning experience: each scenario teaches what to design, which requirements move the decision, the recommended approach + rationale, common anti-patterns + why they fail, trade-offs, and exact links to the practice case / hands-on guide / cards / questions to study next.

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 1 session / 1 PR; branch off latest origin/main | prompt | `git merge-base HEAD origin/main` == origin/main HEAD |
| Do NOT delete the 4 existing practice `Scenario`s | prompt §3 | scenarios.ts diff |
| Keep existing `OfficialScenario` classification axis; add a separate learning layer | prompt §1 + arch consistency | types.ts diff |
| Official 6 scenarios covered exactly once | prompt §2/§4 | validation + test |
| Official scenario vs practice scenario never conflated in UI | prompt §3/§8 | UI copy + E2E |
| No new persisted storage state (no v3) | prompt §7 | storage-schema.ts unchanged |
| Viewing scenarios must not write storage / prune unknown records | prompt §7, tests 15-16 | E2E localStorage assertions |
| No 6th/7th bottom-nav item (Guide sub-area) | prompt §5/§6 | AppNavigation viewKeys unchanged |
| Long scenario prose is a deferred chunk; no validate.ts/zod/rationales in initial bundle | prompt §10 | build chunk graph + browser resource graph |
| ja/en parity; safety/security/cost/human-review notes not one-sided | prompt §8 | validation list-parity + content review |
| Distinguish "this app's recommendation" from "official fact"; no pass guarantee; unofficial | prompt content policy | content review |
| Only Exam Guide + Anthropic/MCP public docs as official sources; no exam dumps | prompt content policy | source hosts allowlist (existing) + content review |
| Exact-target navigation: announced focused destination + path back, both E2E-tested | lessons.md | E2E |
| Playwright official config only (`workers: 1`, port 4325), run serially | prompt | `pnpm test:e2e` |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| `OfficialScenario` (classification) stays lean; new `OfficialScenarioLearning` type holds pedagogy | DECIDED | mirrors StudyGuideSection/HandsOnGuide living in own modules |
| Learning content lives in new `src/content/official-scenarios.ts`, imported only by lazy view | DECIDED | keeps initial bundle unchanged (like hands-on.ts → HandsOnView) |
| Every official scenario has ≥1 practice scenario referencing it | VERIFIED | scenarios.ts officialScenarioIds reverse map covers all 6 |
| Only 4 official scenarios have a hands-on guide (support/ci/extraction/multi-agent); code-gen & dev-productivity have none | VERIFIED | DESIGN.md + hands-on.ts; so relatedHandsOnGuideIds may be empty |
| `View` gains `'official-scenarios'`, excluded from nav keys like `'hands-on'` | DECIDED | AppNavigation pattern |
| Learning path stage 5 "Scenario judgment" is the entry point (dead label → target) | VERIFIED | i18n ui.ts guide.path[4], available:true, no target |
| Exact nav needs new typed target state: QuizView `targetScenarioId`, HandsOnView `targetGuideId` | DECIDED | App only has practiceTargetCardId/quizTargetQuestionId today |
| No new persisted state; derived readiness computed at read time if shown | VERIFIED | storage-schema strictRecord preserves unknown records, no prune |

## Current-state baseline (before changes)

- `pnpm test`: **230 passed (12 files)** — VERIFIED
- `pnpm build`: **exit 0**, 4 pages — VERIFIED
- `pnpm test:no-analytics`: (running)
- `pnpm test:e2e`: (pending)
- Bundle (raw / gzip), from `dist/_astro/*.js`:
  - `questions.DS-*.js` 202709 / 70997 — shared content chunk, **statically imported by App (initial route)**
  - `App.*.js` 38018 / 11120
  - `HandsOnView.*.js` 66361 / 22193 — lazy
  - `GuideView.*.js` 18718 / 7646 — lazy
  - `preload-helper` 11833 / 5045; `signals.module` 7740 / 2968; `hooks.module` 2678 / 1180; `format` 2073 / 863; `client` 1407 / 826; `study-guide-progress` 1068 / 516
  - No client chunk contains `buildContentIndex` / `ZodError` / `choiceRationales` (validation + zod + rationales are build-time only) — VERIFIED
- Browser-observed initial first-party JS: (measure during verification)
- Lighthouse: (measure during verification)

## Content model (planned)

New `src/content/types.ts` additions:
- `OfficialScenarioDecisionPoint { id, question, considerations }`
- `OfficialScenarioAntiPattern { id, mistake, consequence }`
- `OfficialScenarioTradeoff { id, condition, shift }`
- `OfficialScenarioLearning { id: OfficialScenarioId, revision, domainIds, taskStatementIds, skillIds, estimatedMinutes, learningObjectives, requirements, decisionPoints, recommendedApproach, rationale, antiPatterns, tradeoffs, relatedPracticeScenarioIds, relatedHandsOnGuideIds, relatedCardIds, relatedQuestionIds, sourceIds, verifiedAt }`

Title/summary are NOT duplicated — the UI joins to `officialScenarioById[id]` (classification axis) for identity, and renders the learning layer for pedagogy. This keeps the classification axis lean and the two layers cross-checkable.

## Validation (planned) — `validateOfficialScenarioLearnings`

Mechanical guarantees (what validation CAN prove): reference integrity, exact 6-coverage, record-key==id, unique ids, positive revision, ja/en present, ja/en meaning-unit count parity, domain==domains-of-taskStatements and ⊆ classification domains, related practice/hands-on reference back to this official id, related card/question exist and support ≥1 taskStatement/skill, decisionPoint/antiPattern/tradeoff ids unique per scenario, no empty arrays/strings, no duplicate refs, ≥1 claim-specific source, valid verifiedAt, union of domains across the 6 == all 5.

NOT provable mechanically (content-review responsibility): semantic non-duplication across scenarios, technical accuracy of design guidance, real learning value, ja/en meaning equivalence.

## TODO

- [x] 1. Types: add learning subtypes + `OfficialScenarioLearning` (types.ts)
- [x] 2. Content: author 6 bilingual learning entries (official-scenarios.ts)
- [x] 3. Validation: `validateOfficialScenarioLearnings` (+ `...Coverage`) wired into `validateContent`, `officialScenarioLearningCount` added
- [x] 4. Unit tests: positive + negative (content.test.ts) — 259 pass (was 230; +29)
- [x] 5. i18n: `officialScenarios` copy block, `views` key, guide path stage-5 target, guide entry section (ui.ts)
- [x] 6. App wiring: view + target state (quizTargetScenarioId, handsOnTargetGuideId) + callbacks
- [x] 7. Extend QuizView (targetScenarioId), HandsOnView+HandsOnEntry (targetGuideId), GuideView+GuideEntry (onOpenOfficialScenarios)
- [x] 8. New `OfficialScenariosEntry.tsx` (lazy) + `OfficialScenariosView.tsx`
- [x] 9. CSS (global.css) — reuse existing classes, minimal new
- [x] 10. E2E tests (app.spec.ts) — the required checks (running)
- [~] 11. Verify: test ✓ / build ✓ / no-analytics (pending re-run) / e2e (running); axe (in E2E); bundle ✓; lighthouse (pending)
- [~] 12. Docs: DESIGN.md + this file
- [ ] 13. Reviews: content-review + adversarial-review subagents; resolve blockers
- [ ] 14. PR (do not merge)

## Notes (deviation log)

- Kept `OfficialScenario` (classification axis) unchanged; added a separate `OfficialScenarioLearning` type + `src/content/official-scenarios.ts` module. Title/summary are NOT duplicated — the UI joins to `officialScenarioById[id]`. Rationale: matches StudyGuideSection/HandsOnGuide living in own modules; keeps the axis lean where it is referenced from lazy chunks; keeps the long prose out of the initial bundle.
- Split coverage checks into `validateOfficialScenarioLearningCoverage` (mirrors `validateHandsOnThemes`) so single-entry fixture tests do not trip the exact-6 / all-5-domains cross-checks.
- `relatedHandsOnGuideIds` is allowed to be empty: code-generation-claude-code and developer-productivity have no matching hands-on guide (verified against hands-on.ts). Each listed guide must still reference the official scenario. `relatedPracticeScenarioIds` requires ≥1 (all six official scenarios have coverage).
- Exact-target navigation added typed target state: `QuizView.targetScenarioId` (opens practice-case background, focuses its heading) and `HandsOnView.targetGuideId` (opens that guide's detail, focuses its heading). No routing framework introduced.
- Bundle: apples-to-apples initial-route JS (same static-graph trace) — main 259786 raw / 90386 gz → branch 266317 raw / 92114 gz = **+6531 raw / +1728 gz**. The 55KB scenario prose is a deferred chunk (`OfficialScenariosView` + a lazy `skills` chunk Rollup split out). The small initial delta is only the i18n copy (Guide entry section + nav labels) that `App` imports. No validate.ts/zod/rationales in any client chunk (verified).
- Storage: no new persisted state (no v3). Viewing derives nothing that needs saving; the app never writes on load, so unknown/future records are preserved untouched (E2E-asserted).

## Review

**Content review (opus, read-only)** — Verdict: Approve, no blockers. All safety checks passed (provenance ≥1-source not 1:1; untrusted-PR least privilege; semantic≠JSON-Schema; human review preserved). ja/en semantically equivalent; 6 scenarios distinct; no content-policy issues. Should-fix items resolved:
- customer-support idempotency gap → added recommendedApproach[5] (idempotency key + bounded wait/timeout→escalate) and anti-pattern `ap-nonidempotent-retry`. Also folds in the timeout nice-to-have.
- developer-productivity claimed 1.6/d1 without teaching it → added decisionPoint `dp-automation-shape` (fixed vs dynamic decomposition), a recommendedApproach item, learningObjective, and the `orchestration` skill, so d1/1.6 is genuinely taught rather than dropped.
- Nice-to-have (not fixed, known trade-off): multi-agent-research's only practice case is `sc-support-agents` (valid back-reference, support-flavored). A dedicated research practice case is deferred to keep scope focused and reuse existing cases per the task.

**Adversarial review (opus, read-only)** — Verdict: Approve, no Critical/High/Medium. All 9 angles verified safe (references total over a closed union; lazy recovery identical to Guide/HandsOn; target effects independent, double-answer guard intact; storage never written on view; no validate/zod in initial bundle; nav excludes the sub-view; i18n parity compile-enforced). Nice-to-have resolved:
- dead i18n key `officialScenarios.summary` → removed from the type and both locale blocks.

## Verification results (final)

- `pnpm test`: 259 passed (was 230; +29)
- `pnpm build`: exit 0
- `pnpm test:no-analytics`: exit 0
- `pnpm test:e2e` (official config, workers:1, port 4325): **81 passed** (main: 72; +9). Earlier run flagged one axe contrast miss on `.official-badge--practice` (4.49 vs 4.5) → fixed (dark ink text, amber border kept) → final run green.
- Bundle (initial-route JS, apples-to-apples static trace + browser resource graph): main 259786 raw / 90386 gz → branch 266317 raw / 92114 gz (+6531 / +1728). Browser-confirmed 7 files, 94,214 B transfer. Opening the scenarios view fetches 2 deferred chunks only: `OfficialScenariosView` (55,149 decoded / 19,175 transfer) + `skills` (57,899 / 20,290). No validate/zod/rationales in any client chunk.
- Lighthouse: measured in CI (`perf.yml` `lighthouse` check, green), median of 3 mobile runs — **performance 98**, FCP 1365ms (budget 2000), LCP 2119ms (budget 3000), CLS 0.000 (budget 0.02); all budgets met. `perf.yml` also runs `pnpm test` + `pnpm build`. (Local headless Chrome returned NO_FCP — sandbox limitation; browser-observed DCL 21ms / load 43ms; axe serious/critical = 0.)
- PR: https://github.com/toshi0607/cca-study-guide/pull/33 — CI green (Vercel + lighthouse). Not merged.
