# Task 7 — Question metadata and per-choice rationale UI

Branch: `claude/task-7-metadata-rationale-ui-ad5260`
Base: `d1dc280` (Task 6 / PR #33 merge; confirmed latest `origin/main`)

## Purpose

Existing question data already defines `difficulty`, `skills`, and per-choice
`choiceRationales`, but the quiz never surfaces them. Task 7 connects that data
to the learner's answer/review experience so the goal shifts from "memorize the
correct choice" to "judge each choice." No new persisted state; the rationale
text stays out of the initial and pre-answer quiz bundles via dynamic import.

## Scope

- Show a human-readable, localized `difficulty` label (basics/application/analysis).
- Show `skills` by their `skills.ts` localized titles, safely resolved (no `!`).
- After the first answer, show per-choice rationale: correct/incorrect + selected + text.
- Keep `question.explanation` as the whole-question "judgment points"; label both.
- Load `content/rationales.ts` via dynamic import only after the first answer.
- Reuse the same review rendering in QuizSummary for missed questions.
- i18n (ja/en) for every new string; color is never the sole cue; 360px no overflow.

## Non-goals (out of scope)

Mock exam, countdown timer, readiness score, weakness dashboard, large question
additions, storage schema migration, difficulty/skill draw filters, Task 8+.
Difficulty/skills/rationale must stay reusable for Task 8's mock exam.

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| No static import of `content/rationales` on the quiz path | task req #5 | grep client chunks for a distinctive rationale phrase |
| Rationale chunk loads only after first answer | task req #5 | E2E: no `rationales.*.js` request before answer |
| Save-first preserved: `onAnswer` failure blocks answered UI | task req #6 | existing save-fail E2E stays green |
| Rationale load failure never fails answer/quizStats | task req #6 | E2E chunk-failure test |
| No storage schema/version change | task req #11 | `CURRENT_STUDY_DATA_VERSION` unchanged, no new keys |
| No non-null assertion on authored IDs | lessons.md | code review of skill/domain resolution |
| Existing E2E/unit stay green | task req | full suite run |
| axe serious/critical = 0 on review + summary | task req #10 | E2E axe scans |
| No raw difficulty/skill IDs in UI | task req #1/#2 | E2E asserts localized labels |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| Content validation already covers difficulty/skills/rationale integrity + negative tests | VERIFIED | `src/content/validate.ts`, `content.test.ts` (difficulty enum, skill ref/dup/empty, rationale coverage/empty ja-en) |
| `rationales.ts` is not shipped to any client chunk today | VERIFIED | grep of `dist/_astro/*.js` for a rationale phrase → not found |
| `skills.ts` is only reached via lazy view chunks today | VERIFIED | App.js references `skills.*.js` only through dynamic `__vitePreload` |
| Dynamic `import('../content/rationales')` yields a `rationales.<hash>.js` chunk | VERIFIED | Vite names dynamic chunks by module basename |
| QuizView is bundled in the eager App island (not lazy) | VERIFIED | `choice-button` string lives in `App.*.js` |

## Current baseline (before changes)

- Unit tests: 259 passed (12 files).
- E2E: 45 `test(...)` blocks (many parameterized).
- Build: `astro check && astro build` → 0 errors, 0 warnings, 1 hint.
- Initial route eager JS (App static graph): `App` 39,458 raw / 11,398 gz,
  `questions` 207,765 / 72,435 gz, `format` 2,073 / 863 gz.
- Quiz answering lives in App chunk; `skills` (57,899 / 20,009 gz shared chunk)
  and view chunks load lazily.
- Rationale text: absent from every client chunk.
- no-analytics / Lighthouse: to be run.

## Architecture

- `lib/rationales-loader.ts`: module-cached `loadChoiceRationales()` (dynamic
  import, reused promise) + `useChoiceRationales(active)` hook (loading/loaded/
  error, cancelled guard). Recovery is an honest page reload (mirrors GuideEntry).
- `lib/quiz.ts`: add pure `classifyChoice(correctIds, selectedIds, choiceId)` →
  `correct-selected | correct-unselected | incorrect-selected | incorrect-unselected`.
- `components/quiz/QuestionMetadata.tsx`: domain + difficulty + skills, safely
  resolved (filter Boolean), localized. Used in question view and summary.
- `components/quiz/ChoiceReview.tsx`: per-choice review list (state class + text
  status + your-choice + rationale/loading/error). Used post-answer and in summary.
- `components/quiz/AnswerReview.tsx` (or inline in QuizQuestion): verdict +
  "判断のポイント"(explanation) + "選択肢別の解説"(ChoiceReview) + sources + next.
- `QuizView`: after first successful answer, flip `rationalesRequested`; the hook
  loads once and the state flows to QuizQuestion and QuizSummary (single source).

## Dynamic import design

- First answer → `setRationalesRequested(true)` AFTER `onAnswer` succeeds.
- `useChoiceRationales(rationalesRequested)` calls `loadChoiceRationales()`; the
  module promise is cached, so later questions reuse it (one request per session).
- Rationale keyed by question id and localized at render → a late async result
  can never show the wrong question's or wrong locale's text.
- Failure: answer/quizStats already saved; review still shows correctness from
  question data; an `aria-live`/`role=alert` note + a "ページを再読み込み" button
  (real reload) is the recovery — no cached-rejection replay dressed as a retry.

## Accessibility

- Focus still moves to the feedback region on answer; lazy rationale never steals focus.
- Correct/incorrect/selected conveyed by text labels + id badge, not color alone.
- Loading announced via `aria-live=polite`; error via `role=alert`.
- Heading order: stem `h3` → review `h4`s. 44px targets. 360px no overflow. axe 0.

## Validation

Existing validation already enforces every task-req #8 item and every negative
test (difficulty enum, skill ref/dup/empty, rationale exact coverage + empty ja/en,
orphan/extra choice, unknown/missing question). No rewrite; add only if a gap is
found. UI classification covered by unit tests on `classifyChoice`.

## Test plan

- Unit: `classifyChoice` four states (single + multiple); rationale loader
  caches/reuses the resolved module; answer independence documented.
- E2E: difficulty/skill labels (ja + en switch, no raw ids); single-select
  rationale (no chunk before answer, chunk after, both explanations, choices,
  next); multiple-select rationale + no double quizStats; summary review of a
  missed question with no new storage keys; chunk-failure keeps answer/quizStats
  and offers reload recovery; axe + responsive on review and summary.

## Bundle comparison

Eager initial-route JS = the static-import closure from the `App` island entry
(computed by following `from"./x.js"`/`import"./x.js"`, excluding `import(...)`).

| Metric | Baseline (d1dc280) | Branch (Task 7) | Delta |
|--------|--------------------|-----------------|-------|
| Eager closure chunks | 6 | 7 | +1 |
| Eager raw | 264,875 | 274,082 | +9,207 |
| Eager gzip | 91,295 | 94,892 | **+3,597 (+3.9%)** |
| `App` chunk gzip | 11,382 | 12,100 | +718 |
| `skills` chunk gzip | (lazy only) | 2,540 eager | +2,540 (skill titles) |
| `questions` chunk gzip | 72,413 | 72,752 | +339 (hash/tree-shake noise) |
| Rationale chunk | none | 67,332 raw / **25,832 gz deferred** | new deferred |

- Rationale text is absent from every eager chunk: grep of a distinctive rationale
  phrase (`stop_reason は API が返す`) hits only `rationales.<hash>.js`, never
  `App.*.js` / `questions.*.js`.
- The rationale chunk is loaded via `import('../content/rationales')` only after
  the first answer (E2E asserts zero `rationales.*.js` requests before answering).
- The +3.6 KB gzip eager increase is the cost of localized skill titles + the new
  metadata/review components; it does not include any rationale prose.

## Lighthouse results

Replicated the perf workflow locally (build with `PUBLIC_GA_MEASUREMENT_ID`,
preview on 4321, 3 mobile runs, median budget check):

| Audit | Median | Budget | Result |
|-------|--------|--------|--------|
| performance score | 95 | ≥90 | pass |
| first-contentful-paint | 1,297 ms | ≤2,000 | pass |
| largest-contentful-paint | 2,850 ms | ≤3,000 | pass |
| cumulative-layout-shift | 0.0000 | ≤0.02 | pass |

`All Lighthouse budgets met.` LCP is dominated by the unchanged `questions`
chunk; the +3.6 KB eager delta does not move it materially.

## Commands run and results

- `pnpm test` → 13 files, **266 passed** (was 259; +7 for classifyChoice + loader).
- `pnpm build` (`astro check && astro build`) → 0 errors, 0 warnings, 1 hint (a
  pre-existing zod deprecation hint in `validate.ts`).
- `pnpm test:no-analytics` → "No-ID build omits analytics loading, consent
  remnants, and analytics disclosure."
- `pnpm test:e2e` → **87 passed** (added 6 Task 7 tests). Two isolated one-off
  failures across earlier full runs (a different test each time; all passed in
  isolation and a clean full run) were confirmed to be the pre-existing
  timing-sensitivity the Playwright config already documents, not a regression.
- Lighthouse budget check → all budgets met (see above).

## Known constraints

- Local node is v26; package engines pin 22.x (warning only). CI uses node 22.
- The E2E suite is timing-sensitive by design (`workers: 1`, fixed port); a rare
  unrelated test can flake under full-suite load but passes in isolation and on
  re-run.

## Notes (deviation log)

- Content validation and its negative tests already covered every task-req #8
  item (difficulty enum, skill ref/dup/empty, rationale exact coverage + empty
  ja/en, orphan/extra choice, unknown/missing question). No rewrite was needed;
  UI-side classification is covered by new `classifyChoice` unit tests instead.
- Removed the duplicate domain badge from the question header; domain now renders
  once inside `QuestionMetadata` (also removed a `domains.find(...)!` non-null
  assertion from the header in the process). No test relied on the header badge.
- Hardened the Task 7 accessibility E2E to the proven `.press('Enter')` +
  `toBeVisible` before `toBeFocused` pattern after a load-dependent focus flake.

## Review

Fresh-context `reviewer` (opus) pass over all eight required perspectives:
**Approve — no Critical/High/Medium findings.** It independently re-ran
`pnpm test` (266), `pnpm build` (0/0/1), the 6 Task 7 E2E tests (6 passed), and
the bundle-prose isolation grep, and confirmed: save-first + double-submit guard
intact and rationale request placed after a successful save; rationales reached
only via dynamic import (server-only `validate.ts` is the sole other importer);
stale/locale-safe by keyed lookup + full-reload locale change; honest reload
recovery; focus/aria/contrast/heading/overflow all hold; no raw ids; no storage
change. Two non-blocking nits, both kept by decision:

1. `resetChoiceRationalesCache` is a test-only export in a production module —
   kept: it is minimal, tree-shaken from the client graph, and is the only way to
   unit-test genuine re-import after a reset.
2. `role="alert"` re-announces the rationale error on each subsequent answered
   question after a chunk failure — kept: it matches the existing
   `GuideEntry`/`HandsOnEntry` load-error pattern and the degraded state ends on
   reload.

Pre-review self-cleanups applied: removed an unused `reviewLabel` copy key and
replaced a subtle `state.endsWith('-selected')` with explicit equality in
`ChoiceReview`.

## PR URL

(added after PR creation)
