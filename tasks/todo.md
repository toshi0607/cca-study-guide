# CCA Study Guide Web App — Task Plan

## Goal

Design and build a Japanese study-guide web app for the current Claude Certified Architect exam, backed by official sources, with reveal-on-tap practice Q&A and a free hosting/custom-subdomain deployment path.

## Phases

- [x] Phase 1: Confirm official certification scope, source availability, and naming constraints
- [x] Phase 2: Define information architecture, learning model, visual direction, and hosting choice
- [x] Phase 3: Scaffold and implement the web app with sourced starter content
- [x] Phase 4: Verify content traceability, UX, accessibility, responsive layout, tests, and production build
- [ ] Phase 5: Create/configure the repository and deploy when credentials and DNS access allow
- [ ] Phase 6: Review and document the result

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

**Currently in Phase 5** — content, unit, browser, accessibility, responsive, and production-build checks pass; preparing the GitHub and Vercel release.

## Review

Pending.
