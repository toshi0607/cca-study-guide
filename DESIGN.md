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
- Progress summary, JSON export, and local reset.
- A source and disclaimer section with the blueprint verification date.
- No login, API, database, or user-generated content. Optional aggregate usage analytics loads when configured, with advertising storage and signals disabled; the app emits no custom events for study content or progress and links to a dedicated disclosure page.

In scope since July 2026: a multiple-choice quiz mode built from independently authored questions (single- and multiple-select), with weighted or per-domain draws, immediate feedback with official-source links, and locally stored per-question stats.

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
- `練習`: due/all filters, domain chips, search, one reveal card at a time or browsable stack.
- `進捗`: domain completion, due counts, local-data explanation, export/reset, sources/disclaimer.

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
- Progress survives reload and can be exported/reset.
- Build and tests pass; axe has no serious/critical findings in the core flow.
- 360px layout has no horizontal scroll.
- Repository is created under `toshi0607`; deployment works on a provider URL.
- `cca.toshi0607.com` resolves with HTTPS, or the exact single remaining DNS action is documented if Cloudflare authentication is unavailable.
