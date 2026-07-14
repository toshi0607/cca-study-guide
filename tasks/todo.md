# CCA Study Guide Web App — Task Plan

## Goal

Design and build a Japanese study-guide web app for the current Claude Certified Architect exam, backed by official sources, with reveal-on-tap practice Q&A and a free hosting/custom-subdomain deployment path.

## Phases

- [x] Phase 1: Confirm official certification scope, source availability, and naming constraints
- [x] Phase 2: Define information architecture, learning model, visual direction, and hosting choice
- [x] Phase 3: Scaffold and implement the web app with sourced starter content
- [x] Phase 4: Verify content traceability, UX, accessibility, responsive layout, tests, and production build
- [x] Phase 5: Create/configure the repository and deploy when credentials and DNS access allow
- [x] Phase 6: Review and document the result

## Key Questions

1. What is the current official exam name, syllabus, and weighting?
2. Which official source URLs can support each guide section and answer explanation?
3. Which stack offers the simplest durable free hosting and custom subdomain setup?
4. How should progress and spaced repetition work without requiring accounts or a database?
5. What actions can be completed from the current authenticated local environment?

## Decisions Made

- Working repository name: `cca-study-guide` (verify before public creation).
- Japanese UI with official-source links; original questions/explanations, not copied exam material.
- Local-first progress is the default unless research shows a backend is necessary.
- Stack: Astro static output + TypeScript + Preact islands; localStorage behind an adapter for the MVP.
- Initial hosting: Vercel Hobby because the local session is authenticated; keep the build portable to Cloudflare Workers Static Assets.
- Custom hostname: `cca.toshi0607.com`.
- Visual signature: five-domain coverage blueprint on a cool drafting-paper system; no Anthropic brand mimicry.

## Errors Encountered

- An obsolete exam-guide URL returned HTTP 403. Resolved by following the current Skilljar link to the July 2026 v1.0 guide; downloaded and visually/textually verified the current 39-page PDF. The app links to it but does not redistribute it.
- One four-query official-documentation web search stalled and was terminated after repeated waits. Continue with smaller queries and direct official URLs.
- System `pdftotext` was unavailable even though Poppler rendering tools were present. Used bundled `pdfplumber` for extraction and `pdftoppm` for visual verification.
- First `pdfplumber` policy extraction iterated the PDF object instead of `.pages` and raised `TypeError`. Corrected the iteration and reran successfully.
- Policy-page render used Poppler's unpadded `policy-1.png` name rather than the expected `policy-01.png`; listed outputs and inspected the correct file.
- Implementation worker stopped responding after creating the content model, scheduler, and UI skeleton. Interrupted further writes, audited the saved files in the root thread, and replanned to complete styling/tests locally before independent review.
- The in-app browser does not support `networkidle` in `waitForLoadState`; switched to `domcontentloaded`.
- Read-only page evaluation could not access `localStorage`; verified persistence through the UI before and after reload instead.
- Mobile preview tab detached once during interaction and the fixed bottom-nav click was not dispatched reliably by the preview overlay. Recreated a tab per Browser recovery guidance; verified the mobile view at 360px, no horizontal overflow, and rendered the Guide state after changing views at desktop width. No console warnings/errors were present.
- First link-check pipeline stripped `https:` with an unnecessary `cut -d:` and produced invalid URLs. Removed the cut stage; all 14 official-source URLs then returned HTTP 200.
- A broad multi-file source-traceability patch missed the current file context. Split it into focused patches for domains, cards, validation, and storage, then reran the full suite.
- The first zsh link-check used the reserved variable name `status`; renamed it to `http_code`. All 27 official-source URLs returned HTTP 200.
- The first Playwright web server exited because `astro check` included a config reference to untyped `process.env`. Removed that dependency. The first interaction assertion also followed the accessible-name change to the next reveal button; anchored the assertion to the original button element and reran successfully.

## Status

**Implementation and deployment complete.** The Vercel project is live and `cca.toshi0607.com` is attached. Cloudflare still needs the one DNS record listed below before the custom hostname resolves.

## Review

- GitHub: https://github.com/toshi0607/cca-study-guide
- Production alias: https://cca-study-guide-two.vercel.app
- Attached custom hostname: https://cca.toshi0607.com
- Required Cloudflare DNS record: `CNAME cca 7ebf0f3434199a88.vercel-dns-017.com` with proxy disabled (DNS only).
- Content validation: 5 domains, 30 objectives, 16 independently authored practice cards; every claim has an official claim-specific source.
- Link validation: all 27 registered official URLs returned HTTP 200 on 2026-07-14.
- `pnpm test`: 12/12 passed.
- `pnpm test:e2e`: 8/8 passed, including keyboard reveal/rating/persistence, axe WCAG A/AA checks, and horizontal-overflow checks at 375, 768, 1000, 1120, 1121, and 1440px.
- `pnpm build`: passed with 0 Astro errors, warnings, or hints.
- Independent test runner additionally checked the responsive breakpoint neighborhood at 761, 768, 800, 900, 1000, 1001, 1100, 1120, and 1121px with no overflow.
- Independent reviewer found no P0 legal or security blocker. Its traceability, storage-validation, terminology, client-date, persistence-failure, and automated-browser-test findings were addressed before release.
