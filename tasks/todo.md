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

**Implementation and deployment complete.** The Vercel project is live at `cca.toshi0607.com`; Cloudflare DNS, Vercel domain verification, and HTTPS certificate issuance are complete.

## Review

- GitHub: https://github.com/toshi0607/cca-study-guide
- Production alias: https://cca-study-guide-two.vercel.app
- Attached custom hostname: https://cca.toshi0607.com
- Cloudflare DNS: `CNAME cca 7ebf0f3434199a88.vercel-dns-017.com` with proxy disabled (DNS only), verified by Vercel on 2026-07-14.
- HTTPS: Vercel certificate issued for `cca.toshi0607.com`; an HTTPS request returned HTTP 200 with the expected app title.
- Content validation: 5 domains, 30 objectives, 16 independently authored practice cards; every claim has an official claim-specific source.
- Link validation: all 27 registered official URLs returned HTTP 200 on 2026-07-14.
- `pnpm test`: 12/12 passed.
- `pnpm test:e2e`: 8/8 passed, including keyboard reveal/rating/persistence, axe WCAG A/AA checks, and horizontal-overflow checks at 375, 768, 1000, 1120, 1121, and 1440px.
- `pnpm build`: passed with 0 Astro errors, warnings, or hints.
- Independent test runner additionally checked the responsive breakpoint neighborhood at 761, 768, 800, 900, 1000, 1001, 1100, 1120, and 1121px with no overflow.
- Independent reviewer found no P0 legal or security blocker. Its traceability, storage-validation, terminology, client-date, persistence-failure, and automated-browser-test findings were addressed before release.

## Active Enhancement: Social Metadata and Analytics

- [x] Add a 1200×630 OGP image and complete Open Graph/Twitter metadata.
- [x] Add favicon assets and icon metadata that match the field-notes visual system.
- [x] Add privacy-conscious Google Analytics loading via a validated public measurement ID.
- [x] Add regression tests for metadata and generated public assets.
- [x] Deploy and verify production metadata, icons, and analytics configuration.

### Enhancement Verification (superseded on 2026-07-15)

The following records describe the original consent-gated release and are retained as historical verification only. The active enhancement below replaces that runtime behavior.

- `pnpm test`: 17/17 passed.
- `pnpm test:e2e`: 10/10 passed with a test measurement ID, including no requests before consent, deny persistence, grant/reload, revoke/cookie cleanup, axe, metadata/assets, and responsive layout.
- `pnpm test:no-analytics`: passed; the no-ID build contains no Google loader, consent UI, storage key, or analytics settings control.
- OGP: opaque 1200×630 PNG; favicon: SVG plus 16/32/48px ICO; Apple icon: opaque 180×180 PNG.
- Independent reviewer approved OGP/favicon release and required a real GA4 measurement ID before production analytics can be marked active.
- Production: `PUBLIC_GA_MEASUREMENT_ID` configured for Vercel Production; `cca.toshi0607.com` returned HTTP 200 with the expected ID, consent panel, OGP metadata, and all icon assets.
- Production consent smoke check: zero Google requests before consent and one `gtag.js` request after opt-in.

## Active Enhancement: Simplify Analytics Disclosure

- [x] Plan the consent-removal change and preserve privacy constraints.
- [x] Trace consent-specific UI, storage, settings controls, tests, and documentation.
- [x] Remove consent-specific UI, storage, and settings controls.
- [x] Add a concise analytics disclosure page and persistent footer link.
- [x] Update tests and documentation.
- [x] Run independent review, full verification, deployment, and production smoke checks.

### Enhancement Review

- Consent prompt, consent localStorage key, cookie cleanup, settings button, and consent event wiring were removed.
- A valid production ID now loads GA4 immediately with analytics storage granted; ad storage, ad user data, ad personalization, Google Signals, and ad-personalization signals remain disabled.
- `cookie_domain: 'none'` keeps analytics cookies on the current host rather than sharing them with sibling subdomains.
- `/privacy/` explains study-data storage, analytics collection, exclusions, Google data use, Cookie behavior, and opt-out options. The app-wide footer and Progress view link to it.
- `pnpm test`: 17/17 passed.
- `pnpm test:e2e`: 17/17 passed, including both-route axe checks, immediate loader/config assertions, removed-consent assertions, disclosure navigation, and overflow checks at 375/768/1000/1120/1121/1440px.
- `pnpm test:no-analytics`: passed across both generated pages.
- `pnpm exec astro check`: 0 errors, warnings, or hints; `git diff --check`: passed.
- Independent reviewer reported no remaining P0-P3 findings after cookie scope, server isolation, privacy-page accessibility, and responsive coverage fixes.
- Vercel production deployment `dpl_4k8BAy7CsM7n1GqoQe3aA71pjNYK` reached READY and was aliased to `cca.toshi0607.com`.
- Production smoke check: `/` and `/privacy/` returned HTTP 200; each contained exactly one `G-MR40SCH5M6` loader, the expected privacy restrictions and host-only cookie config, and no consent runtime remnants.

## Active Enhancement: Japanese / English Language Switcher

### Goal

Allow readers to switch the complete study experience between Japanese and English through stable, shareable locale URLs. Study progress must be shared between languages, and each URL must serve the correct document language and metadata in its initial HTML.

### Design Specification

- Stable locale routes: Japanese `/` and `/privacy/`; English `/en/` and `/en/privacy/`. Do not infer or persist locale separately—the URL is the source of truth.
- Generate locale-correct `html[lang]`, title, description, canonical, reciprocal `hreflang`, Open Graph locale/copy, image alt, skip link, and noscript text in the initial Astro HTML.
- Place a compact `日本語 / English` language navigation in the desktop rail and mobile header. Use real links with `lang`, `hreflang`, `aria-current`, visible selected state, and 44px minimum touch targets.
- Translate all app chrome, notices, confirmations, dates, navigation labels, guide summaries, objectives, practice-card content, progress/source/disclaimer copy, and the privacy page. Preserve official product names, source titles, objective IDs, and source URLs.
- Keep review state and card IDs locale-neutral so study progress is shared across both same-origin routes; do not change the storage schema, export shape, or card revisions for translation-only changes.
- Search only the currently displayed locale text. Route navigation may reset transient view/filter/reveal state; persisted study progress must remain intact.
- The standalone privacy routes share one localized component and the same language-navigation semantics.
- Use one shared bilingual OGP image with language-neutral artwork/copy, or provide locale-specific images if the current Japanese copy cannot be removed cleanly.

### Implementation Plan

- [x] Finalize architecture after explorer and architect reports; record rejected alternatives.
- [x] Add locale types, route helpers, shared Astro layout/metadata catalogs, UI-message catalogs, and content localization helpers.
- [x] Extend domain/objective/card data with complete English and Japanese fields while keeping IDs/source references stable.
- [x] Refactor the Preact app to render all content through the active locale and add responsive language controls.
- [x] Add locale routes and localize the privacy page plus all initial document metadata.
- [x] Add unit and end-to-end coverage for direct locale routes, shared progress, localized search, accessibility, metadata, and responsive overflow.
- [x] Run formatting/diff checks, unit tests, Astro check/build, no-analytics build check, Playwright, and visual browser QA in both locales.
- [x] Request independent correctness/regression review and resolve all findings.

### Acceptance Criteria

- Every user-facing Japanese string has a complete English counterpart, including dialogs and live notices.
- `/`, `/en/`, `/privacy/`, and `/en/privacy/` each direct-load with complete localized content and correct initial `html[lang]`/metadata.
- Switching languages preserves persisted study progress without adding or modifying a locale storage preference.
- Keyboard and screen-reader users can identify and operate the language navigation; axe reports no WCAG A/AA violations.
- No horizontal overflow occurs at the existing breakpoint matrix in either language.
- `pnpm test`, `pnpm build`, `pnpm test:no-analytics`, and `pnpm test:e2e` pass.

### Review

- Added stable Japanese `/` and English `/en/` app routes plus localized `/privacy/` and `/en/privacy/` routes. All routes emit locale-correct initial HTML, canonical URLs, reciprocal `hreflang`, Open Graph/Twitter metadata, skip links, and noscript copy.
- Added a typed two-locale UI/site catalog and `LocalizedText` content model. All 5 domains, 30 objectives, and 16 practice cards require non-empty Japanese and English content through Zod and tests; IDs, source references, review revisions, storage version, and JSON export shape remain unchanged.
- Added accessible language links to the desktop rail, mobile header, and Privacy header with `lang`, `hreflang`, `aria-current`, visible focus/selection, and 44px minimum targets. The shared neutral OGP artwork contains no Japanese-only copy.
- Search uses only the active locale. A card rated on the Japanese route remains recorded on the English route because both routes share the existing locale-neutral localStorage data.
- `pnpm test`: 18/18 passed. `pnpm build`: 32 files checked with 0 errors/warnings/hints and 4 routes built. `pnpm test:no-analytics`: passed across all 4 routes. `pnpm test:e2e`: 38/38 passed, including no-JavaScript prerendering, shared progress, localized search, both-locale axe checks, metadata, analytics, and responsive overflow. `git diff --check`: passed.
- Browser QA covered Japanese/English desktop, English Practice, 375px English mobile, and both Privacy locales; no horizontal overflow or console errors/warnings were observed.
- Independent review found one stale English no-JavaScript heading expectation after the concurrent SSR integration; it was aligned with the actual localized heading and the complete suite was rerun successfully.
- Environment note: the repository requests Node 22.x; verification ran on Node 26.5.0 with pnpm 10.30.3 and emitted only the engine/FORCE_COLOR warnings.

### Architecture Decision

Adopt locale-specific static routes instead of a same-URL client toggle. The same-URL option was rejected because the client-only Preact app cannot make initial HTML language and social metadata correct for English readers and crawlers. Browser-language redirects and locale localStorage were rejected to avoid display flashes, hidden routing behavior, and redundant state. A full i18n dependency was rejected as unnecessary for two compile-time locales.

## Active Enhancement: Lighthouse Performance Optimization

### Goal

Identify production-representative performance bottlenecks with repeatable Lighthouse measurements, choose the smallest architectural improvements that address root causes, implement them without regressing behavior or accessibility, and verify before/after results.

### Design and Measurement Specification

- Measure the built Astro site through its preview server rather than the development server.
- Capture at least three mobile Lighthouse runs for the main route and use the median to reduce run-to-run noise; inspect desktop and the privacy route when findings suggest shared-shell impact.
- Preserve raw Lighthouse JSON reports and record the exact environment, command, metrics, audits, and bundle evidence used in decisions.
- Prioritize user-visible metrics (LCP, INP/TBT, CLS) and transferred/executed JavaScript over score-only changes.
- Do not modify or overwrite the in-progress Japanese/English localization work; isolate performance edits and rebase reasoning on the current workspace state.
- Require unit tests, Astro check/build, relevant Playwright coverage, production-preview browser QA, and an independent regression review.

### Implementation Plan

- [x] Establish current buildability, preview workflow, Lighthouse availability, and a repeatable baseline.
- [x] Trace the largest Lighthouse opportunities to source, asset, hydration, CSS, and rendering causes.
- [x] Compare architectural options and select minimal, high-confidence changes with explicit trade-offs.
- [x] Implement the selected optimizations in isolated files/components.
- [x] Re-run a matched current-tree Lighthouse A/B and calculate median deltas.
- [x] Run functional, accessibility, responsive, and regression verification.
- [x] Complete independent correctness/performance review and resolve actionable findings.

### Acceptance Criteria

- Baseline and post-change Lighthouse reports are reproducible and retained outside shipped application assets.
- Chosen changes demonstrably improve or remove an identified bottleneck; no metric is materially regressed without an explained trade-off.
- Existing study flows, privacy behavior, analytics configuration, accessibility, and responsive layout remain intact.
- `pnpm test`, `pnpm build`, relevant `pnpm test:e2e`, and `git diff --check` pass, except for any clearly documented pre-existing failure caused by protected user changes.

### Review

- Root cause: both app routes used `client:only`, leaving initial HTML without meaningful application content; the remaining dominant payload is the immediate 145,360 B Google tag.
- Implemented deterministic SSR with `client:load` on `/` and `/en/`, truthful initial placeholders, localStorage/current-time initialization after hydration, minute/focus/visibility time refresh, and disabled pre-hydration stateful controls.
- Added Japanese/English no-JS SSR assertions, disabled-control coverage, and a 60-second due-card rollover test.
- Matched current-tree 3-run mobile Lighthouse A/B: Performance 96 → 98; TBT 151 ms → 79 ms; CLS stayed 0; LCP stayed effectively flat at about 2.29 s; transfer increased 1,533 B gzip.
- Kept the existing immediate GA pageview behavior. A diagnostic two-second delay improved LCP but was rejected because it can miss short visits and changes the recently selected analytics policy.
- Final verification: `git diff --check`; unit 18/18; build 4 routes with 0 Astro errors/warnings/hints; no-analytics build check; E2E 39/39; agent-browser Japanese/English hydration smoke with 0 console/page errors.
- Raw reports are retained locally in the gitignored `tmp/lighthouse-final/client-load/` and `tmp/lighthouse-final/client-only/` directories; detailed reproducible evidence: `tasks/performance-notes.md`; final summary: `tasks/performance-review.md`.

### Errors Encountered

- The protected localization migration temporarily made the shared tree unbuildable while types changed ahead of consumers. Baseline and proof-of-concept work moved to isolated worktrees until the localized tree stabilized.
- Concurrent shared `dist` rebuilds caused temporary E2E 404 responses; a fresh read-only snapshot produced coherent results.
- One Chromium run returned `ERR_NETWORK_IO_SUSPENDED` before an overflow assertion; the exact test passed alone, and the final coherent full suite later passed 39/39 without retries.
- The installed `agent-browser` skill referenced a missing `references/profiling.md`; used its complete core profiling instructions plus Lighthouse audit/trace data instead.

## Active Enhancement: Production Deployment — 2026-07-15

### Goal

Deploy the current localized and performance-optimized working tree to the existing Vercel production project, preserve the configured analytics environment, and verify all four public routes plus critical metadata and hydration on the custom domain.

### Deployment Plan

- [x] Confirm the linked Vercel project, authenticated account, production environment, and current working-tree scope.
- [x] Reconfirm deployment readiness from the completed build/test evidence and inspect the deploy diff for unintended files.
- [x] Create a Vercel Production deployment from the current working tree and wait for READY.
- [x] Confirm the production alias/custom domain points at the new deployment.
- [x] Smoke-check `/`, `/en/`, `/privacy/`, and `/en/privacy/` for HTTP 200, locale metadata, SSR content, analytics configuration, and hydration errors.
- [x] Record the deployment ID/URL, production verification, and rollback reference.

### Acceptance Criteria

- The deployment reaches READY and `https://cca.toshi0607.com` serves the new localized SSR release.
- All four locale/privacy routes return HTTP 200 with correct initial `html[lang]`, canonical/hreflang metadata, and expected content.
- The configured production GA ID and privacy restrictions remain present exactly once per route.
- Browser smoke checks find no console/page errors and both locale navigation paths work.

### Review

- Production deployment `dpl_Chwb1VBd3EmgfA7t6U3AyMjDzgrX` reached READY and was aliased to `https://cca.toshi0607.com`.
- Immutable deployment URL: `https://cca-study-guide-b4hfeoaah-toshi0607s-projects.vercel.app`; previous production/rollback reference: `dpl_9bTrgSSnKdaV4XBfEJJB3mf1eXro`.
- The remote Astro build checked 32 files with 0 errors/warnings/hints and generated all four static routes.
- `/`, `/en/`, `/privacy/`, and `/en/privacy/` each returned HTTP 200 with correct `html[lang]`, canonical URL, localized content, exactly one GA loader, and all expected analytics/privacy restrictions.
- Production browser QA confirmed Japanese/English application and privacy content, 9 enabled post-hydration app buttons on the English route, and no console/page errors. All named sessions were closed.
- Environment caveat: the Vercel project reports Node 24.x while `package.json` requests Node 22.x. The production build succeeded without diagnostics; align these versions in a separate maintenance change.

### Errors Encountered

- The first automated analytics-restriction boolean check returned false because nested shell quoting removed literal quote characters from the comparison. Direct snippet inspection showed the settings were present; a quote-agnostic structural regex then passed on all four routes.
- The first language-link browser session stopped producing output after a navigation/wait chain. Closed the named session, opened `/en/` directly in a fresh session, and completed the English smoke check with zero errors.

---

# Design Refinement — 2026-07-16 (frontend-design)

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 色味(紺+シアン+アンバーのパレット)は大体維持 | user msg | global.css の hue 変更なし(用法のみ変更) |
| web/モバイル両対応、モバイル優先で磨く | user answers | 375px/1440px スクリーンショット比較 |
| 世界観(blueprint/field notes)を強める方向 | user answers | 目視レビュー |
| Webフォント導入OK(見出しのみサブセット) | user answers | Google Fonts link + font-display: swap |
| ロジック変更なし(スタイル+head のみ) | fidelity | App.tsx のロジック diff なし |
| 既存テスト(vitest/build/axe e2e)を壊さない | pr.md | pnpm test / pnpm build 成功 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| 違和感の源 = JA見出しタイポ/余白むら/箱のフラットさ/色の分散 | VERIFIED | ユーザー回答(4候補すべて該当) |
| クラス名は据え置きで CSS 書き換えのみで到達可能 | VERIFIED | App.tsx 構造確認済み |
| e2e は markup semantics に依存(role/aria) | VERIFIED | pnpm test:e2e 39 passed(markup 変更なしで全通過) |

## Plan

- [x] 1. Webフォント導入(LocalizedLayout.astro): Barlow Condensed 600/700 + Zen Kaku Gothic New 700/900、preconnect + swap
- [x] 2. タイポ再設計: display スタック差し替え、JA 見出しの負字間廃止 + palt、line-height 1.16、hero/page-header のサイズ再調整、word-break: auto-phrase
- [x] 3. 階層の再設計: --shadow をハードオフセット影へ再定義、hero/page-header/due-block へ 2px 枠 + --shadow-strong
- [x] 4. blueprint ノード: タイトルを % より優先(1.6rem cyan 注記化)、CSS order で「タイトル→進捗帯」、モバイル 1 カラム
- [x] 5. 色の規律: D チップを ink 帯に統一、rating ボタンへ意味色の 3px 下線(color-mix)、--focus 変数化
- [x] 6. モバイル磨き: hero clamp(1.9-2.6rem)、bottom-nav アクティブ上線、safe-area-inset-bottom、blueprint 1 カラム
- [x] 7. 検証: vitest 18 passed / astro build 4 pages / playwright e2e 39 passed(axe + 6 breakpoints × ja/en 横はみ出しなし)、375/1440 スクリーンショット目視確認済み

## Notes

- Browser ペインのスクロール後スクリーンショットが空白になるため、検証は Playwright スクリプト(node_modules/.shots.mjs)で実施。
