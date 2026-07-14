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
