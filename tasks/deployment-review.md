# Production Deployment Review — 2026-07-15

The localized, performance-optimized working tree is live in Vercel Production.

- Deployment: `dpl_Chwb1VBd3EmgfA7t6U3AyMjDzgrX` (READY)
- Production: `https://cca.toshi0607.com`
- Immutable URL: `https://cca-study-guide-b4hfeoaah-toshi0607s-projects.vercel.app`
- Rollback reference: `dpl_9bTrgSSnKdaV4XBfEJJB3mf1eXro`
- Remote build: 0 Astro diagnostics, 4 routes
- Production routes: 4/4 HTTP 200 with correct locale, canonical, SSR/localized content, GA loader, and privacy restrictions
- Browser QA: Japanese/English app and Privacy pages passed; 0 console/page errors; sessions cleaned up

The only follow-up is environment maintenance: align Vercel's Node 24.x project setting with the repository's `node: 22.x` declaration. It did not block or warn during this successful deployment.
