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
- Configured ID: load `gtag.js` normally and configure the default page view. The measurement ID is exposed to the client through a `<meta name="ga-measurement-id">` tag, and a bundled (non-inline) init script reads it and calls `gtag`. This keeps the page free of inline `define:vars` script so `script-src` can omit `'unsafe-inline'` (see Security headers below).
- Advertising storage, advertising user data, advertising personalization, Google Signals, and ad-personalization signals are disabled in app configuration.
- `cookie_domain: 'none'` keeps GA cookies host-only instead of sharing them with sibling subdomains.
- The app emits no custom events for card IDs/content, search terms, ratings, review state, exported data, or other study progress. GA4 Enhanced Measurement can add events such as outbound clicks at the property layer; disable it in the Web data stream to enforce page-view-only collection.
- The Progress view summarizes the analytics behavior and the app-wide footer links to `/privacy/` for details and opt-out information.

Recommended GA4 property settings: keep Google Signals off, do not link Google Ads, disable Enhanced Measurement if only page views are desired, and use the shortest suitable retention period.

Production activation completed on 2026-07-14. The GA4 measurement ID is stored in Vercel's Production environment; the built page exposes it as expected for a public Google tag. Consent gating was removed by user choice on 2026-07-15 in favor of immediate loading plus a dedicated disclosure page. Production smoke checks returned HTTP 200 for `/` and `/privacy/`, found exactly one loader per page, and found no consent runtime remnants.

## Security headers

`vercel.json` applies a single set of security headers to every route (`source: "/(.*)"`), alongside the existing immutable `Cache-Control` rules for OGP and fonts. These headers ship only from the Vercel edge — `astro dev`/`astro preview` (and therefore the Playwright suite) do not see them, so their correctness is guarded by the build-time inventory and `scripts/check-csp-hashes.mjs` rather than by E2E.

- `X-Frame-Options: DENY` and `frame-ancestors 'none'` — the app is never meant to be framed (no embed use case).
- `X-Content-Type-Options: nosniff` — forbids MIME sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — sends only the origin cross-site.
- `Permissions-Policy` — disables device/sensor features the app never uses (camera, microphone, geolocation, payment, USB, sensors, autoplay, display-capture).

### Content-Security-Policy directive rationale

The site is fully static and self-hosted, so `default-src 'self'` is the baseline; each directive below only widens it where the build output requires it.

| Directive | Value | Why |
| --- | --- | --- |
| `default-src` | `'self'` | Static, same-origin app; everything defaults to first-party. |
| `script-src` | `'self'` + three `sha256-…` hashes + `https://www.googletagmanager.com` | No `'unsafe-inline'`. Astro emits a few unavoidable inline scripts: the island hydration bootstrap (two scripts, present on pages using a `client:*` component) and the Google Analytics init module. Each is allow-listed by the exact sha256 of its bytes. `gtag.js` is the only external script host. |
| `style-src` | `'self' 'unsafe-inline'` | Astro inlines small `<style>` blocks and the layout injects an `is:inline` `@font-face` block; there is no CSP-nonce path for these on static output, so inline styles (data-only, no script capability) are permitted. |
| `img-src` | `'self' data:` + `https://www.googletagmanager.com https://*.google-analytics.com` | First-party icons/OGP plus the GA measurement pixel; `data:` for any inlined image data. |
| `font-src` | `'self'` | Fonts are self-hosted `.woff2`; no external font CDN. |
| `connect-src` | `'self'` + `https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com` | GA4 collection endpoints; nothing else makes network calls. |
| `object-src` | `'none'` | No plugins/embeds. |
| `base-uri` / `form-action` | `'self'` | Lock down `<base>` hijacking and form posting. |
| `frame-src` | `'none'` | The app embeds no iframes. |
| `upgrade-insecure-requests` | — | Defense in depth; all resources are already same-origin/HTTPS. |

The `script-src` hashes are byte-derived and therefore change when Astro is upgraded or the GA init script is edited. `scripts/check-csp-hashes.mjs` (run via `pnpm test:csp`) rebuilds `dist/`, extracts every inline `<script>` hash, and fails if any is missing from `vercel.json`, converting a silent production CSP breakage into a loud build failure. The hashes above were verified stable across repeated builds and confirmed to execute under the real header (island hydration and GA init both run, zero CSP violations).
