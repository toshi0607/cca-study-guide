# Task Plan: Simplify Analytics Disclosure

## Goal

Replace the site-wide analytics consent prompt with normal GA4 loading and a concise, discoverable analytics disclosure, while keeping advertising features disabled and avoiding custom learning-data events.

## Phases

- [x] Phase 1: Record the requested privacy/UX change and review prior lessons
- [x] Phase 2: Inspect the consent implementation, tests, and best disclosure location
- [x] Phase 3: Remove consent gating and add the analytics disclosure
- [x] Phase 4: Update documentation and automated tests
- [ ] Phase 5: Independently review, test, deploy, and verify production

## Key Questions

1. Which consent-specific UI, state, storage, and tests can be removed cleanly?
2. Where can the disclosure remain visible without interrupting study flows?
3. Which privacy-preserving GA settings should remain after normal loading is enabled?

## Decisions Made

- Keep analytics conditional on a valid public measurement ID, but load it without an in-page consent prompt when configured.
- Retain the absence of custom learning-card/search/rating/progress events and keep advertising personalization disabled.
- Replace the interruptive prompt with a `/privacy/` disclosure page linked from an app-wide footer; keep a short analytics summary in the existing Progress data panel.
- Explicitly grant analytics storage while denying ad storage, ad user data, and ad personalization; also disable Google Signals and ad-personalization signals in tag configuration.
- Set `cookie_domain: 'none'` so GA cookies remain host-only on both the custom hostname and Vercel alias instead of widening to their parent domains.

## Errors Encountered

- A combined tests/config/docs patch expected the technical-architecture sentence in `DESIGN.md` to be a bullet, but it is a paragraph. The patch was rejected atomically; split the changes by file and match the current text exactly.
- Playwright's `--device="iPhone 13"` screenshot selected an uninstalled WebKit runtime after the desktop Chromium capture succeeded. Re-ran the mobile visual check with the installed Chromium runtime and an explicit 390×844 viewport.
- The first production consent smoke check imported the transitive `playwright` package directly, which is not exposed by pnpm. Re-ran it through the installed `@playwright/test` package.
- The first immediate-load E2E attached network listeners after the shared `beforeEach` navigation, so a request from the existing document was counted alongside the reload and the test observed two Google requests. Reworked the test to use a fresh page with interception installed before its first navigation.
- Independent review found `reuseExistingServer: true` could reuse a no-ID preview and invalidate configured-ID E2E results. Disabled reuse so the suite always starts its own configured server.

## Status

**Currently in Phase 5** — Running independent review, full checks, deployment, and production verification.
