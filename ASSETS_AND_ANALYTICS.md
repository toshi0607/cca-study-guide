# Assets and Privacy

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

- Sources: Barlow Condensed 700 and Zen Kaku Gothic New 900, downloaded from the google/fonts repository (SIL OFL; license copies ship in `public/fonts/`). `scripts/subset-fonts.mjs` fetches from a pinned google/fonts commit (never the mutable `main` ref) and verifies each download's sha256 against a value recorded in the script before subsetting; update the font, its license, or the upstream source by editing the `PINNED_COMMIT`/`sha256`/`licenseSha256` constants in that script.
- Outputs: content-hashed subset woff2 files plus `public/fonts/manifest.json`, all committed. The layout reads file names from the manifest, and `vercel.json` serves `/fonts/*.woff2` with immutable long-lived caching.
- Subset scope: printable ASCII, kana, CJK punctuation, full-width forms, every `src/i18n/ui.ts` string literal, and the display-font text in the built HTML — the characters the `--display` stack (`.wordmark b`, `.today-hero h2`, `.page-header h2`) can render.
- Regenerate with `pnpm build && pnpm fonts:subset` when `src/lib/fonts.test.ts` reports missing characters after copy changes.

## Privacy

- The app has no third-party analytics, advertising tags, or behavioral tracking.
- Study progress is stored only in the browser's localStorage. It is not synchronized to a server or sent to another service.
- The footer on both application locales always links to `/privacy/` (or `/en/privacy/`), where this behavior is explained to learners.
- Legacy `PUBLIC_GA_MEASUREMENT_ID` values are not read by the application and therefore cannot re-enable analytics.

Third-party analytics were removed on 2026-08-11: an analytics script executing on the same origin as learner localStorage cannot be meaningfully isolated by this static app's CSP.

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
| `script-src` | `'self'` + two `sha256-…` hashes | No `'unsafe-inline'`. Astro emits two unavoidable inline scripts for the island hydration bootstrap; each is allow-listed by the exact sha256 of its bytes. No external scripts are permitted. |
| `style-src` | `'self' 'unsafe-inline'` | Astro inlines small `<style>` blocks and the layout injects an `is:inline` `@font-face` block; there is no CSP-nonce path for these on static output, so inline styles (data-only, no script capability) are permitted. |
| `img-src` | `'self' data:` | First-party icons/OGP plus `data:` for any inlined image data. |
| `font-src` | `'self'` | Fonts are self-hosted `.woff2`; no external font CDN. |
| `connect-src` | `'self'` | The static app makes no third-party network calls. |
| `object-src` | `'none'` | No plugins/embeds. |
| `base-uri` / `form-action` | `'self'` | Lock down `<base>` hijacking and form posting. |
| `frame-src` | `'none'` | The app embeds no iframes. |
| `upgrade-insecure-requests` | — | Defense in depth; all resources are already same-origin/HTTPS. |

The `script-src` hashes are byte-derived and therefore change when Astro is upgraded. `scripts/check-csp-hashes.mjs` (run via `pnpm test:csp`) rebuilds `dist/`, extracts every inline `<script>` hash, and fails unless `vercel.json` contains exactly that set, converting a silent production CSP breakage or stale capability into a loud build failure. The hashes above were verified against the built hydration scripts on 2026-08-11.
