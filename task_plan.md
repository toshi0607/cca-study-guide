# Task Plan: Social Preview, Favicon, and Analytics

## Goal

Add production-ready OGP metadata and imagery, a complete favicon set, and opt-in Google Analytics loading to the deployed Astro app without weakening privacy or the existing visual identity.

## Phases

- [x] Phase 1: Plan scope and inspect the current metadata surface
- [x] Phase 2: Confirm current official metadata and Google Analytics integration requirements
- [x] Phase 3: Create visual assets and implement head/analytics integration
- [x] Phase 4: Add regression checks and verify rendered assets, metadata, and production build
- [x] Phase 5: Review, deploy, and verify the production hostname

## Key Questions

1. Which OGP, Twitter Card, icon, and manifest tags are required for a robust static deployment?
2. How can the existing field-notes visual language be translated into a legible 1200×630 social card and small favicon?
3. How should GA load only when a valid public measurement ID is configured?
4. Is an existing `G-...` measurement ID already available for this project?

## Decisions Made

- Keep all share assets deterministic and source-controlled so text and branding render exactly.
- Treat the Google measurement ID as public configuration, not a hard-coded secret; omit the analytics script entirely when it is absent or invalid.
- Preserve the app's unofficial/non-affiliation positioning in social metadata.
- Require explicit visitor opt-in before loading `gtag.js`; configure only the default page view in app code and disable advertising-personalization signals. Document that GA4 Enhanced Measurement must also be disabled in the property to guarantee page-view-only collection.
- Generate the OGP and icon raster assets from committed SVG sources for deterministic typography and color.

## Errors Encountered

- A combined tests/config/docs patch expected the technical-architecture sentence in `DESIGN.md` to be a bullet, but it is a paragraph. The patch was rejected atomically; split the changes by file and match the current text exactly.
- Playwright's `--device="iPhone 13"` screenshot selected an uninstalled WebKit runtime after the desktop Chromium capture succeeded. Re-ran the mobile visual check with the installed Chromium runtime and an explicit 390×844 viewport.
- The first production consent smoke check imported the transitive `playwright` package directly, which is not exposed by pnpm. Re-ran it through the installed `@playwright/test` package.

## Status

**Complete** — OGP/favicon are live, the production GA4 measurement ID is configured, consent gating is active, and the production hostname/assets/metadata were verified.
