# CCA Field Notes

**English** | [日本語](README.ja.md)

An unofficial web app for studying the public exam scope of the Claude Certified Architect – Foundations (CCAR-F) exam through original summaries and recall cards. Study content is written in Japanese.

## Principles

- Unofficial and not affiliated with Anthropic
- Short, original summaries of the 5 domains and 30 tasks from the official Exam Guide v1.0 (July 2026)
- Practice cards are authored independently from the publicly available official product docs
- Does not include real exam questions, questions reconstructed from memory, non-public materials, or official sample questions
- In addition to recall cards, includes multiple-choice practice from original questions (single- and multiple-select, with instant feedback and per-domain summaries). Not a reproduction of the real exam
- The multiple-choice practice includes a scenario mode: an original study aid to get comfortable with reading a fictional company's case description and then answering the linked questions. Not a copy or reproduction of the real exam's scenarios
- The practice view offers a focused review session in addition to the list view. It cycles through filtered results one card at a time in a "recall → reveal → rate" loop, with keyboard shortcuts (Space/Enter to reveal, 1/2/3 to rate, Esc to stop)
- Progress is stored only in the browser's localStorage (JSON export/import lets you migrate across devices and browsers)
- When configured, Google Analytics is loaded normally and does not send any learning data beyond page views as custom events

## Features

These are the features currently available in the service. Everything runs entirely in the browser — no server, no login, no billing.

- **Study Guide** — original summaries of the 5 domains and 30 tasks. Tracks not-started / done / needs-review progress per section
- **Hands-on guides** — step-by-step guides to try in your own environment, with per-step checks and progress tracking
- **Official scenario mapping** — starts from an official scenario and bridges to the related Study Guide sections, cards, questions, and hands-on guides
- **Practice cards** — recall cards, with both a list view and a focused review session (Space/Enter to reveal, 1/2/3 to rate, Esc to stop)
- **Choice quiz** — single- and multiple-select multiple-choice practice with instant feedback and per-domain summaries
- **Scenario quiz** — read a fictional company's case, then answer the linked set of questions
- **60-question, 120-minute Mock Exam** — a full-length exam at production scale
  - **resume** — pick up from a saved session even after interrupting
  - **history** — a list of past mock exam results saved on the device
  - **result review** — review each question from the result screen
  - **per-choice rationale** — an explanation for every choice
- **Learning analysis** — suggests which domains to review next based on mock exam results (does not compute an official score, pass/fail, or readiness)
  - **evidence level** — shows whether there are enough answers to back the analysis
  - **stale attempt safety** — answers whose question content has since changed are not re-scored and are excluded from the per-axis aggregation
- **local-only storage** — progress is stored only in this browser's localStorage
- **JSON export/import** — export/import progress to migrate across devices and browsers

## Suggested study order

This is the service's own study suggestion. It is not the official recommended order, and it does not indicate passing or readiness. It assumes no particular exam date or timeframe — repeat it at your own pace.

1. Choose a starting point ("Choose a starting point" in the guide)
2. Review the fundamentals in the Study Guide
3. Try things out with the Hands-on guides
4. Recall with the Practice cards
5. Practice judgment with the Quiz and official scenarios
6. Take the 60-question mock exam
7. Check your mistakes with results, review, and learning analysis
8. Return to the priority review candidates and repeat

## Development

```sh
pnpm install
pnpm assets:generate
pnpm dev
pnpm test
pnpm test:e2e
pnpm build
```

Uses Astro's static build. No server, API key, or database required.

### E2E tests (Playwright)

`tests/` is split into per-feature specs, and shared logic is centralized in `tests/fixtures/` (a single navigation start with clean storage, shared UI helpers, and axe/storage helpers). Vitest (`pnpm test`) exhaustively verifies pure logic; E2E covers browser integration, focus, storage, routing, lazy chunks, downloads, accessibility, and responsiveness.

```sh
pnpm test:e2e          # Full regression (builds production every time). Merge gate
pnpm test:e2e:fast     # For iterating during development. Excludes @slow (axe, responsive, heavy scenarios)
pnpm test:e2e:a11y     # Accessibility (axe) only
pnpm test:e2e:ui       # Playwright UI mode
```

`test:e2e:fast` is for fast feedback and assumes a running server is reused (start the server as shown below to skip the build and finish in tens of seconds). If no server is running, it builds automatically, so that first run takes as long as the gate.

`pnpm test:e2e` rebuilds the production build every time, so repeating it during development gets slow. If you already have a local preview server running, you can explicitly reuse it (reuse is disabled by default to avoid accidentally using a stale build).

```sh
# Start in a separate terminal (build with the same ID as the webServer, since the analytics tests require a measurement ID)
PUBLIC_GA_MEASUREMENT_ID=G-TEST123456 pnpm build && pnpm preview --host 127.0.0.1 --port 4325
pnpm test:e2e:reuse   # or test:e2e:fast. Runs against the already-running server
```

`test:e2e:fast` is for development feedback; always pass `pnpm test:e2e` (full) before merging. The worker count can be overridden with `PW_WORKERS` (default 2).

### Web fonts

The heading fonts (Barlow Condensed / Zen Kaku Gothic New) are self-hosted as woff2 subsetted to only the characters in use and committed under `public/fonts/`. If you change a heading or UI string and the subset no longer has the needed characters, `pnpm test` fails; regenerate with the following in that case.

```sh
pnpm build
pnpm fonts:subset
```

File names include a content hash, and references follow automatically via `public/fonts/manifest.json`. Commit the generated woff2 files and the manifest.

## Google Analytics

The measurement ID shown on the GA4 web data stream is set for the Production environment only. If unset, no Google tag or analytics output is emitted. An invalid format is a build error.

```sh
vercel env add PUBLIC_GA_MEASUREMENT_ID production
vercel deploy --prod
```

The value is in `G-...` format. When set, `gtag.js` is loaded normally and configures basic page views with ad storage, ad user data, and ad personalization denied. Google Signals and ad-personalization signals are also disabled, and GA cookies are limited to the host being visited. No app-specific custom events are implemented. To limit to page views only, also disable "enhanced measurement" on the GA4 web data stream. A user-facing explanation is published at `/privacy/`.

## Promo video (video/)

`video/` is a standalone Remotion project that generates a social promo video (about 30 seconds, 1920×1080, H.264). It has its own `package.json` and does not affect the main app's build, test, or deploy. The screen material is real screenshots placed in `video/assets/`, and you render with `cd video && pnpm install && npx remotion render promo out/promo.mp4` (the artifacts under `video/out/` are not committed).

## Official information

- [Certification page](https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification)
- [Exam Guide v1.0](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)

Last verified: 2026-07-14

## License

Source code is released under the MIT License. Study content is independently authored; Anthropic product and certification names remain the property of their respective owners.
