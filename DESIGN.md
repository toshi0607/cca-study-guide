# CCA Study Guide — Product and Technical Design

Last reviewed: 2026-07-14

## Product thesis

An unofficial Japanese field notebook for preparing for **Claude Certified Architect – Foundations**. Its single job is to turn the public exam blueprint and public Claude documentation into short, source-traceable retrieval practice: think first, reveal second, rate recall, revisit later.

The site must never imply Anthropic endorsement and must not contain, reconstruct, solicit, or redistribute live exam questions or access-controlled training material.

## MVP scope

- A dashboard with today's due cards and the five official domain weights.
- A guide covering all 30 official task statements under the five domains in Exam Guide v1.0 (effective July 2026).
- Independent recall/contrast cards whose answers start collapsed and reveal on click/tap/keyboard.
- Short explanations, common-confusion notes, and direct official documentation links.
- Ratings: `もう一度`, `難しい`, `できた`; local due-date scheduling and persistent progress.
- Filters by domain and state; card search.
- Progress summary, JSON export/import for moving between devices, and local reset.
- A source and disclaimer section with the blueprint verification date.
- No login, API, database, or user-generated content. Optional aggregate usage analytics loads when configured, with advertising storage and signals disabled; the app emits no custom events for study content or progress and links to a dedicated disclosure page.

In scope since July 2026: a multiple-choice quiz mode built from independently authored questions (single- and multiple-select), with weighted or per-domain draws, immediate feedback with official-source links, and locally stored per-question stats.

Also in scope since July 2026: a scenario-practice mode inside the quiz view. Each scenario is an independently authored fictional case (a 2–4 paragraph background about an invented company plus 3–5 linked questions) for practicing the read-a-long-case-then-answer format. It reuses the quiz answering, scoring, and per-question stats machinery unchanged; the case description stays reachable from every question via a disclosure. Scenarios are original teaching material grounded in public documentation — they do not reproduce, reconstruct, or approximate the live exam's scenarios.

Out of scope: device sync, community submissions, paid content, an exam simulator that claims to reproduce the live test, and pass-probability estimates. The quiz mode practices the answer formats only; it does not mirror live exam questions, difficulty, or scoring.

## Source-of-truth hierarchy

1. Current Anthropic Academy certification page for exam metadata and weights.
2. The official Exam Guide v1.0 (effective July 2026, exam code CCAR-F) for the 30 task statements. Link to it directly; do not copy or host the guide.
3. Public Claude Platform, Claude Code, Agent SDK, and MCP documentation for technical explanations.
4. Original author inference, clearly labeled, only when a study hint is not itself an official claim.

Every guide objective and card has source IDs and `verifiedAt`. Facts are phrased as paraphrases, not long quotations.

## Information architecture

The MVP is a single fast page with four views to avoid routing overhead while retaining clear navigation.

- `今日`: due-card count, start/restart CTA, five-domain coverage map, weak areas.
- `ガイド`: five domain sections, 30 task statements, must-remember bullets, official links.
- `練習`: due/all filters, domain chips, search, one reveal card at a time or browsable stack, plus a focused review session that runs the current filtered set one card at a time (the today CTA starts one directly over the due cards).
- `演習`: random quiz (question count and weighted/per-domain draw) and scenario practice (case list → background → linked questions) sharing one answering flow and summary.
- `進捗`: domain completion, due counts, local-data explanation, export/import/reset, sources/disclaimer.

On narrow screens, the four views use a bottom navigation bar. On wide screens, a left rail carries the same navigation.

## Interaction model

1. The card initially renders only its prompt and an explicit `答えを見る` button.
2. The button exposes the answer region with `aria-expanded` and `aria-controls`.
3. The answer region shows the answer, 2–5 sentence explanation, a confusion warning, source links, and verification date.
4. A rating sets the next due date:
   - `もう一度`: now/learning queue (10 minutes)
   - `難しい`: next day
   - `できた`: 3 days, then a progressively longer interval after consecutive success
5. Content revision changes preserve history but mark the card for reconfirmation.
6. A focused review session applies the same reveal-then-rate loop to one card at a time with keyboard shortcuts (Space/Enter reveals, 1/2/3 rates, Esc stops after a confirm). `もう一度` re-queues the card at the end of the running session without changing what is persisted, and a summary reports the rating breakdown plus the remaining due count.

The schedule is intentionally described as a simple study aid, not as a scientifically optimal algorithm.

## Content model

```ts
type Source = {
  id: string
  title: string
  publisher: 'Anthropic' | 'MCP Project'
  url: string
  official: true
  verifiedAt: string
}

type Domain = {
  id: string
  number: 1 | 2 | 3 | 4 | 5
  title: string
  titleJa: string
  weight: number
  summary: string
  objectives: Objective[]
}

type Objective = {
  id: string
  title: string
  titleJa: string
  mustKnow: string[]
  sourceIds: string[]
}

type Card = {
  id: string
  revision: number
  domainId: string
  objectiveIds: string[]
  kind: 'recall' | 'contrast' | 'scenario'
  prompt: string
  answer: string
  explanation: string
  pitfall: string
  sourceIds: string[]
  verifiedAt: string
}

type ReviewState = {
  cardId: string
  cardRevisionSeen: number
  dueAt: string
  intervalDays: number
  streak: number
  lapses: number
  lastRating: 'again' | 'hard' | 'good'
}
```

Content validation must fail the build for duplicate IDs, invalid domain totals, orphan source IDs, missing sources, or missing verification dates.

The sketch above is the MVP shape. `src/content/types.ts` is the authoritative model and also carries the later additions: quiz questions (`ChoiceQuestion`, with a `difficulty` of `foundation` / `application` / `analysis` and `skills` drawn from the taxonomy in `src/content/skills.ts`), per-choice review copy (`ChoiceRationales` in `src/content/rationales.ts`, deliberately outside the question bank so the quiz island does not ship review-only text), fictional practice cases (`Scenario`), the six official exam scenarios used as a classification axis (`OfficialScenarioId`), the design-judgment learning layer over those six (`OfficialScenarioLearning`, in `src/content/official-scenarios.ts`), and the study-guide and hands-on models (`StudyGuideSection`, `HandsOnGuide`). Domain, task statement, and skill stay distinct axes: a domain carries exam weight, a task statement names an area of the guide, and a skill names the capability a question measures. Validation covers every one of these types, including reference integrity between them.

### Hands-on guides

Hands-on guides are reproducible exercises the learner runs in their own environment; the app never fabricates a Claude/MCP/CI runtime and never holds credentials — a guide says where a secret belongs, never what it is. `HandsOnGuide` therefore carries, beyond the study-guide-style metadata, the fields a real build needs: `taskStatementIds` and `skillIds` (the exam areas and capabilities it exercises), `environment` and `setup` (what to have ready and prepare once), `steps` where each `HandsOnStep` names its own `expectedResult` so every checklist item has an observable success signal, a structured `troubleshooting` list (`HandsOnPitfall` with `symptom` and `isolation` kept apart so the UI can render diagnosis distinctly), and `securityNotes`, `costNotes`, and `reflection`. The content model shipped first (Task 5A), and the UI followed (Task 5B), mirroring how the study guide shipped.

Hands-on is a sub-area **under the Guide view**, not a sixth bottom-nav item: the 360px bottom bar is a five-column grid tuned for five destinations, and the Guide view's eight-stage learning path already frames hands-on as stage four. That stage (and a dedicated entry section in the Guide view) links into the hands-on list; `'hands-on'` is a `View` but is deliberately excluded from the navigable keys, so no nav button crowds narrow screens. The list and detail are lazy-loaded through `HandsOnEntry` (the same manual dynamic-import + chunk-error-recovery pattern as `GuideEntry`), so the long guide prose never enters the initial route bundle. Detail↔list is internal component state with an explicit in-app back button; focus moves to the detail heading on open and back to the list heading on return.

Progress uses pure helpers in `src/lib/hands-on-progress.ts` (mirroring `study-guide-progress.ts`): `getHandsOnGuideStatus` classifies not-started/in-progress/completed/stale/future without rewriting the record; `startHandsOnGuide`, `setHandsOnStepCompletion`, `completeHandsOnGuide`, and `reconfirmHandsOnGuide` are the only mutations, each returning the input unchanged on an incompatible action. Completion is explicit and allowed only when every current step is done; unchecking a required step on a completed guide drops it back to in-progress; the derived step count and completion rate are never persisted. Records for removed or not-yet-known guide ids, and completed step ids that are no longer current steps, are ignored on read but never pruned. **Stale handling (Option 1):** a stale record renders read-only until the learner explicitly reconfirms, which moves it to the current revision as *in-progress* — because a guide has sub-steps, a record completed at an older revision cannot be silently treated as completed at a revision that may have added steps. This differs from `reconfirmStudyGuideSection` (which keeps `completed`): completion is re-earned. Crucially, the prior completion time is **not lost** — it is carried onto the in-progress record as `previousCompletedAt` (never overwritten with the current time), so the learner keeps the fact that they finished the earlier revision, and the detail view surfaces it ("previously completed on …"). The original time survives repeated revision bumps. A `previousCompletedAt` is an **optional, backward-compatible v2 field** (no version bump, no key change, no migration): it appears only on an `in_progress` record, must be a real datetime no later than `updatedAt`, and older records that predate it — and every `completed` record — simply omit it; `parseStudyDataV2` validates it and rejects a misplaced or malformed one. App writes go through the existing save-first `commitData` (re-reads canonical storage before mutating, so a concurrent tab is never lost); a step toggle only announces via the aria-live notice so keyboard focus stays on the checkbox, while guide-level transitions move focus to the notice because the pressed control unmounts.

Four guides cover four distinct implementation experiences, each mapped to one official scenario: an escalating multi-tool agent (`customer-support-resolution`), Claude Code team configuration and CI diff review (`claude-code-ci`, the pre-existing `ho-ci-review` kept at its ID and expanded — its revision was bumped to 2 because a project-configuration step was added; the hands-on UI is unreleased, so normal app use has created no progress records, and if a revision-1 record exists via manual import, Task 5B's stale-revision handling covers it), a structured extraction pipeline (`structured-data-extraction`), and a multi-agent research pipeline (`multi-agent-research`). `validateHandsOnGuides` enforces per-guide integrity — unique step and troubleshooting IDs, valid task-statement/skill/scenario/card/question references, `domainIds` equal to the domains of the task statements, related cards/questions in-domain and covering a task statement, and ja/en list-length parity; `validateHandsOnThemes` enforces across the set that all four required themes are present and that no two theme-carrying guides share an identical skill set (a mechanical guardrail against accidental clones — semantic distinctness stays a content-review concern). Guide steps cite official documentation for stable concepts (`stop_reason`/`tool_use`/`tool_result`, JSON-Schema structured output, print-mode non-interactive runs) rather than volatile CLI flags, and separate official facts (linked sources) from this app's own recommended order of work. `HandsOnProgress` (in `src/lib/storage-schema.ts`) stores per-step completion by revision under the v2 schema; Task 5B added one backward-compatible optional field, `previousCompletedAt`, without a version, key, or migration change (see Stale handling below).

### Official scenario learning

The six official exam scenarios (`OfficialScenarioId`) are two layers, not one. `OfficialScenario` (`officialScenarioById` in `scenarios.ts`) stays a lightweight **classification axis**: id, ja/en title and summary, domains, sources, `verifiedAt`. It is what questions, cards, and hands-on guides tag themselves against, so it must stay small where it is imported from the quiz and hands-on chunks. `OfficialScenarioLearning` (`official-scenarios.ts`) is the **design-judgment layer** over each scenario: task statements, skills, learning objectives, scenario-specific requirements, structured `decisionPoints` (`decision` + the `considerations` that move it), `recommendedApproach` (this app's guidance) with its `rationale`, `antiPatterns` (`mistake` + `consequence`), `tradeoffs` (`condition` + how the judgment `shift`s), and exact links to the related practice case, hands-on guide, cards, and questions. Identity is not duplicated: the UI joins a learning entry to `officialScenarioById[id]` for title and summary, so the two layers cannot drift.

`validateOfficialScenarioLearnings` enforces per-entry integrity — references resolve, `domainIds` equals exactly the domains of the task statements **and** is a subset of what the classification axis declares (so the two layers never contradict), related practice cases and hands-on guides reference this scenario back, related cards/questions support at least one task statement or skill, decision/anti-pattern/trade-off ids are unique, and ja/en list item-counts match. `validateOfficialScenarioLearningCoverage` (kept apart, like `validateHandsOnThemes`) enforces the cross-set invariants: exactly the six scenarios once each, and all five domains covered. Mechanical validation cannot judge semantic non-duplication, technical accuracy, or learning value — those stay a content-review concern, and the copy is explicit that "recommended approach" is this app's independent guidance while official sources back only the technical facts.

Official scenarios are a **sub-area under the Guide view**, mirroring hands-on: `'official-scenarios'` is a `View` excluded from the navigable keys, so the 360px five-item bottom bar is unchanged, and the Guide button stays `aria-current` while inside it. The Guide's eight-stage learning path already framed stage five as "scenario judgment"; that stage was a dead label and is now the live link into the list (plus a dedicated Guide entry section). `OfficialScenariosEntry`/`OfficialScenariosView` use the same manual dynamic-import + chunk-error-recovery + list↔detail focus pattern as hands-on, so the long scenario prose never enters the initial route bundle. Exact-target navigation out of a scenario reuses the existing card/question targets and adds two typed targets — `QuizView.targetScenarioId` (opens the practice case's background and focuses its heading) and `HandsOnView.targetGuideId` (opens that guide's detail and focuses its heading) — with no routing framework introduced. Task 6 adds **no persisted state**: viewing a scenario writes nothing, and unknown or future storage records are preserved untouched.

## Technical architecture

- Astro static output + TypeScript.
- Preact island(s) for navigation, filters, reveal state, progress, scheduling, and import/export.
- Static source/content modules validated by Zod at build time.
- `localStorage` for the small MVP state; keep access behind a storage adapter so IndexedDB can replace it later without rewriting UI.
- Vitest for content invariants and scheduler/storage behavior.
- Playwright/axe for the critical reveal/rating/persistence/keyboard/mobile flow when browser binaries are available.
- Standard static output deployable unchanged to Vercel or Cloudflare Workers Static Assets.

No server secret is required. An optional build-time `PUBLIC_GA_MEASUREMENT_ID` enables GA4 and its linked disclosure; when absent, analytics scripts and analytics-specific disclosure are omitted entirely.

## Hosting decision

Use **Vercel Hobby for the first deployment** because the current machine is already authenticated as `toshi0607`; this is a personal, non-commercial static study tool and fits the Hobby plan. Keep the build provider-neutral.

Attach `cca.toshi0607.com` to the Vercel project. The zone is already on Cloudflare DNS, so create the exact CNAME target Vercel returns. A future move to Cloudflare Workers Static Assets is a hosting-only change.

## Visual direction

Subject: an architect reviewing a production system blueprint. Audience: a Japanese software architect studying in short sessions. Page job: expose the next decision to recall.

### Tokens

- `Drafting white` `#F4F7F9`: cool paper background.
- `Tracing paper` `#FFFFFF`: cards and panels.
- `Blueprint ink` `#173447`: primary text and navigation.
- `Signal cyan` `#087E9B`: interactive/action color.
- `Grid blue` `#D7E4EA`: structural rules and blueprint grid.
- `Review amber` `#A85B18`: due/warning state, never used as the sole cue.
- `Verified green` `#287158`: mastered/source-verified accents.

Typography uses a Japanese UI stack (`BIZ UDPGothic`, `Hiragino Sans`, system sans) for long-form clarity, a condensed display stack for the product wordmark and large weights, and a monospace stack for objective IDs, percentages, and dates.

### Signature element

The five-domain **coverage blueprint** is the single visual risk: five connected technical nodes sized/annotated by their official exam weights. Progress fills each node like a reviewed drawing stamp. It encodes real structure rather than decorating the page.

### Layout sketch

```text
Wide
┌──────────── rail ───────────┬────────────────────────────────────┐
│ CCA / FIELD NOTES           │ TODAY · 2026-07-14                 │
│ 今日                         │ 12 cards due     [復習を始める]     │
│ ガイド                       ├────────────────────────────────────┤
│ 練習                         │      D1 27% ─── D2 18%              │
│ 進捗                         │       │   coverage blueprint        │
│                              │      D3 20% ─── D4 20% ─ D5 15%    │
│ 非公式 / local only          ├────────────────────────────────────┤
│                              │ next card / weak domains            │
└──────────────────────────────┴────────────────────────────────────┘

Mobile
┌──────────────────────────────┐
│ CCA / FIELD NOTES      非公式 │
│ 今日の復習 12   [始める]      │
│ compact coverage blueprint   │
│ next card                    │
├──────────────────────────────┤
│ 今日  ガイド  練習  進捗     │
└──────────────────────────────┘
```

Avoid warm editorial cream, neon-on-black, decorative gradients, Claude logos, and generic dashboard stat tiles. Motion is limited to one deliberate blueprint-line draw on first view and a short disclosure transition; both are disabled for reduced motion.

## Accessibility and quality floor

- `lang="ja"`, semantic landmarks, one page heading, logical heading order.
- Real buttons with at least 44px targets, visible focus, `aria-current` for navigation, and disclosure semantics.
- Hidden answer content is absent from the accessibility tree until revealed.
- No color-only state; labels/icons accompany every status.
- No horizontal overflow at 360px; target readable through 1440px.
- Content remains usable when animation is disabled.
- Production build, unit tests, content coverage checks, local persistence, and custom-domain HTTPS are required before completion.

## Legal and editorial guardrails

- Display `非公式・Anthropicとは提携していません` in persistent chrome and a full disclaimer in progress/sources.
- Do not use Anthropic or Claude logos, trade dress, or language implying official status.
- Never accept or publish recalled live questions, screenshots, leaked materials, or partner-only text.
- Link to the current official exam page and guide rather than mirroring them.
- Label practice questions as independently authored and provide a correction/contact path through GitHub Issues.
- Show `最終確認 2026-07-14` and make version updates explicit.

## Release acceptance criteria

- Five domains and weights total 100 and match the official page.
- All 30 blueprint objectives are present; every objective and card has at least one public official source.
- A learner can reveal, rate, and revisit cards using keyboard only.
- Progress survives reload and can be exported/imported/reset.
- Build and tests pass; axe has no serious/critical findings in the core flow.
- 360px layout has no horizontal scroll.
- Repository is created under `toshi0607`; deployment works on a provider URL.
- `cca.toshi0607.com` resolves with HTTPS, or the exact single remaining DNS action is documented if Cloudflare authentication is unavailable.
