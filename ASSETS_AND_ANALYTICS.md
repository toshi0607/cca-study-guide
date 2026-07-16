# Assets and Analytics

## Social preview

- Source: `assets/ogp.svg`
- Outputs: `public/ogp.<hash>.png` (1200×630; the canonical `og:image` URL — the content hash busts social-media image caches such as Slack's) and `public/ogp.png` (stable-path copy for previously shared pages). The mapping lives in `public/assets-manifest.json`.
- Canonical origin: `https://cca.toshi0607.com`
- Design: the existing drafting-paper grid, CCA Field Notes wordmark, five-domain blueprint, and explicit unofficial/non-affiliation label. No third-party logo is used.

## Icons

- Source: `assets/favicon.svg`
- Outputs: SVG favicon, multi-size ICO, and opaque 180×180 Apple touch icon.
- Regenerate committed outputs with `pnpm assets:generate`.

## Fonts

- Sources: Barlow Condensed 700 and Zen Kaku Gothic New 900, downloaded from the google/fonts repository (SIL OFL; license copies ship in `public/fonts/`).
- Outputs: content-hashed subset woff2 files plus `public/fonts/manifest.json`, all committed. The layout reads file names from the manifest, and `vercel.json` serves `/fonts/*.woff2` with immutable long-lived caching.
- Subset scope: printable ASCII, kana, CJK punctuation, full-width forms, every `src/i18n/ui.ts` string literal, and the display-font text in the built HTML — the characters the `--display` stack (`.wordmark b`, `.today-hero h2`, `.page-header h2`) can render.
- Regenerate with `pnpm build && pnpm fonts:subset` when `src/lib/fonts.test.ts` reports missing characters after copy changes.

## Analytics

- Configuration: optional `PUBLIC_GA_MEASUREMENT_ID` in `G-...` form.
- Missing ID: no Google script, cookie, analytics request, or analytics-specific disclosure.
- Configured ID: load `gtag.js` normally and configure the default page view.
- Advertising storage, advertising user data, advertising personalization, Google Signals, and ad-personalization signals are disabled in app configuration.
- `cookie_domain: 'none'` keeps GA cookies host-only instead of sharing them with sibling subdomains.
- The app emits no custom events for card IDs/content, search terms, ratings, review state, exported data, or other study progress. GA4 Enhanced Measurement can add events such as outbound clicks at the property layer; disable it in the Web data stream to enforce page-view-only collection.
- The Progress view summarizes the analytics behavior and the app-wide footer links to `/privacy/` for details and opt-out information.

Recommended GA4 property settings: keep Google Signals off, do not link Google Ads, disable Enhanced Measurement if only page views are desired, and use the shortest suitable retention period.

Production activation completed on 2026-07-14. The GA4 measurement ID is stored in Vercel's Production environment; the built page exposes it as expected for a public Google tag. Consent gating was removed by user choice on 2026-07-15 in favor of immediate loading plus a dedicated disclosure page. Production smoke checks returned HTTP 200 for `/` and `/privacy/`, found exactly one loader per page, and found no consent runtime remnants.
