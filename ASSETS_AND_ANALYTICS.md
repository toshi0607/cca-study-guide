# Assets and Analytics

## Social preview

- Source: `assets/ogp.svg`
- Output: `public/ogp.png` (1200×630)
- Canonical origin: `https://cca.toshi0607.com`
- Design: the existing drafting-paper grid, CCA Field Notes wordmark, five-domain blueprint, and explicit unofficial/non-affiliation label. No third-party logo is used.

## Icons

- Source: `assets/favicon.svg`
- Outputs: SVG favicon, multi-size ICO, and opaque 180×180 Apple touch icon.
- Regenerate committed outputs with `pnpm assets:generate`.

## Analytics

- Configuration: optional `PUBLIC_GA_MEASUREMENT_ID` in `G-...` form.
- Missing ID: no consent panel, Google script, cookie, or analytics request.
- Before opt-in: no Google tag is loaded and no consent ping is sent.
- After opt-in: load `gtag.js`, deny advertising-related storage/personalization, and configure the default page view.
- The app emits no custom events for card IDs/content, search terms, ratings, review state, exported data, or other study progress. GA4 Enhanced Measurement can add events such as outbound clicks at the property layer; disable it in the Web data stream to enforce page-view-only collection.
- Consent choice is stored locally under `cca-analytics-consent:v1` and can be changed from the Progress view.

Recommended GA4 property settings: keep Google Signals off, do not link Google Ads, disable Enhanced Measurement if only page views are desired, and use the shortest suitable retention period.

Production activation completed on 2026-07-14. The GA4 measurement ID is stored in Vercel's Production environment; the built page exposes it as expected for a public Google tag. A production smoke check confirmed zero Google requests before consent and one tag-loader request after opt-in.
