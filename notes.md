# Notes: CCA Study Guide

## Official sources

- Anthropic announcement (2026-03-12): https://www.anthropic.com/news/claude-partner-network
  - Announces Anthropic's first technical certification for solution architects building production Claude applications.
- Anthropic Academy certification page: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
  - Current page reports: Claude Certified Architect – Foundations; 60 questions; 120 minutes (~135-minute seat time); English; USD 125; validity 12 months; online proctored or Pearson test center.
  - Domain weights: Agentic Architecture & Orchestration 27%; Tool Design & MCP Integration 18%; Claude Code Configuration & Workflows 20%; Prompt Engineering & Structured Output 20%; Context Management & Reliability 15%.
- Current official Exam Guide v1.0 (effective July 2026; exam code CCAR-F): https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf
  - Downloaded as a 39-page PDF created 2026-07-09 and verified by text extraction plus rendered inspection of cover, task-statement, and document-control pages.
  - Confirms 60 multiple-choice/multiple-response items, 4 randomly selected scenarios from a bank of 6, 120 minutes, scaled passing score 720/1,000, $125, and 12-month validity.
  - Confirms all 30 task statements across the five domains. The guide is authoritative and subject to change; the app should link to it and publish original Japanese summaries rather than mirror/translate it wholesale.
  - Exam-guide terminology explicitly uses the `Task` tool for subagents. Current public Agent SDK docs use the `Agent` tool. The app must preserve the tested term while visibly flagging the current-doc terminology drift.
- Public official product-doc sources verified:
  - Stop reasons: https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
  - Tool loop: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
  - Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
  - Hooks: https://code.claude.com/docs/en/hooks-guide
  - Feature choice: https://code.claude.com/docs/en/features-overview
  - Agent SDK features: https://code.claude.com/docs/en/agent-sdk/claude-code-features
  - Agent SDK subagents: https://code.claude.com/docs/en/agent-sdk/subagents
  - MCP tools (latest stable specification at review time): https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- Certification terms/policy review:
  - Terms: https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F34hhd92iyp94a0gtbr15cy5jk%2Fpublic%2F1782870634%2FCertification+Terms+and+Conditions.pdf
  - Policy: https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F34hhd92iyp94a0gtbr15cy5jk%2Fpublic%2F1782870704%2FAnthropic+Certification+Exam+Policy.pdf
  - Policy prohibits distributing, copying, displaying, publishing, recording, downloading, transmitting, or posting exam tasks/questions/answers and treats exam content as confidential.
  - Public app therefore uses short original Japanese objective summaries and independently written cards sourced from public docs. It does not include the guide's sample questions, live/recalled questions, or detailed copied knowledge/skills bullets.

## Learning UX

- The primary action is retrieval practice: think first, reveal second, then rate `もう一度 / 難しい / できた`.
- MVP routes/views: 今日, ガイド, 練習, 進捗・設定; source traceability is available from every guide item/card.
- Use browser-local progress, due dates, streak/lapse metadata, JSON export, and reset. No account/database is necessary.
- Distinguish official paraphrase from author inference; never include live, recalled, reconstructed, or leaked exam questions.
- Accessibility: semantic buttons, `aria-expanded`, keyboard operation, 44px targets, visible focus, reduced-motion support, Japanese document language.

## Product and architecture

- Static React + TypeScript app. Content is versioned TypeScript/JSON data; runtime progress is persisted in localStorage.
- Two card modes: recall cards and independent scenario questions. MVP can start with recall/contrast cards and expand to full scenario sets after human content review.
- Content entities: Domain, Topic, Card, Source, ReviewState, Attempt. All facts carry source IDs and a `verifiedAt` date.
- Visual direction: an architect's field notebook / blueprint, without copying Anthropic branding. Signature element: a five-domain coverage map whose node size/label reflects official exam weight.

## Deployment

- `github.com/toshi0607` and Vercel user `toshi0607` are authenticated locally. Wrangler is installed on demand but Cloudflare authentication is absent.
- `toshi0607.com` uses Cloudflare nameservers (`cloe.ns.cloudflare.com`, `roan.ns.cloudflare.com`). `cca.toshi0607.com` is currently unassigned.
- Recommended MVP hosting: Vercel Hobby, suitable for a personal/non-commercial static app. Attach the custom subdomain in Vercel, then add the requested CNAME in Cloudflare DNS.
- Cloudflare Pages is also sufficient (500 builds/month, 20,000 files, 100 custom domains; static asset requests free/unlimited), but using it now would require a new interactive login. Vercel avoids that setup and remains portable because the app is a standard static build.

## Social metadata and analytics enhancement

- Existing `index.astro` has only charset, viewport, description, theme color, and title. There are no canonical, Open Graph, Twitter Card, favicon, manifest, or analytics tags, and no `public/` assets.
- The Open Graph protocol requires `og:title`, `og:type`, `og:image`, and `og:url`; it also recommends a concise description. Source: https://ogp.me/
- Production site origin is `https://cca.toshi0607.com`. Set Astro's `site` value and emit absolute canonical/OG URLs in the statically rendered head.
- Translate the established drafting-paper palette (`#f4f7f9`, `#173447`, `#087e9b`) and five-domain blueprint into deterministic SVG assets, then render committed PNG variants. Avoid generated illustration because exact wordmark typography and small-size legibility matter more than pictorial novelty.
- Google recommends placing the Google tag in the head on every measured page, using the GA4 `G-...` measurement ID in both the loader URL and `gtag('config', ...)`. Source: https://developers.google.com/tag-platform/gtagjs
- GA4's default implementation stores a first-party `_ga` client ID cookie and collects basic visit/session/device information. Source: https://support.google.com/analytics/answer/11593727
- Superseded privacy design (2026-07-14): the original release delayed `gtag.js` until opt-in. Replaced by the user-selected immediate-load plus disclosure model on 2026-07-15. Advertising signals remain disabled, and card content, search terms, ratings, and local progress are still excluded from custom events.
- No `G-...` ID exists in tracked files, local repo configuration, or Vercel project environment variables. The integration must be conditional and production activation requires an ID from a GA4 web data stream.
# Analytics Disclosure Simplification — 2026-07-15

- Consent-specific runtime logic is isolated to `src/components/GoogleAnalytics.astro`; it can be replaced by deterministic immediate initialization when a valid ID exists.
- `App.tsx` only needs the existing `analyticsEnabled` prop for truthful conditional disclosure. The settings button and custom consent event can be deleted.
- Keep `ad_storage`, `ad_user_data`, and `ad_personalization` denied. Set `allow_google_signals` and `allow_ad_personalization_signals` to false. No custom study events are emitted.
- A dedicated `/privacy/` page best matches the requested replacement. Link it from an app-wide footer and keep the shorter Progress-panel summary.
- No-ID builds must continue to omit the Google loader, ID, and analytics-specific disclosure.
- Old `cca-analytics-consent:v1` localStorage values are inert and do not require migration code.
