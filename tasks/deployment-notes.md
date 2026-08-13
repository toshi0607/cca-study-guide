# Production Deployment Notes — 2026-07-15

> Security-policy update (2026-08-11): third-party analytics was removed from
> the application. The historical deployment identifiers below remain the
> record of the 2026-07-15 release; current releases must pass
> `pnpm test:no-analytics` and the local-manifest served-byte verifier.

## Preflight

- Linked Vercel project: `cca-study-guide` (`prj_Vi2Ppx42rZhmNESh5WKuAbXshjdG`) in `toshi0607s-projects` (`team_44cZxCtuWKPcLHQd7sVyyc35`).
- Authenticated Vercel user: `toshi0607`; CLI 56.2.0 executed through `pnpm dlx` because no local/global CLI is installed.
- Production must not configure a Google Analytics measurement ID; the app ignores the legacy variable if it remains in an environment.
- Previous production deployment before this release: `dpl_9bTrgSSnKdaV4XBfEJJB3mf1eXro`, READY, aliased to `cca.toshi0607.com` and the project aliases.
- Current working tree intentionally includes the completed Japanese/English localization and Lighthouse SSR optimization plus their tests/documentation. `git diff --check` passed and no secret-like source assignments/private keys were found.
- Release verification immediately before deployment must include the no-third-party-analytics check alongside unit tests, build, E2E, and Japanese/English browser smoke.

## Deployment

- Command: `pnpm dlx vercel@latest --prod --yes` from the linked repository root.
- Vercel CLI: 56.2.0; authenticated user `toshi0607`.
- Deployment ID: `dpl_Chwb1VBd3EmgfA7t6U3AyMjDzgrX`.
- Immutable URL: `https://cca-study-guide-b4hfeoaah-toshi0607s-projects.vercel.app`.
- Inspector: `https://vercel.com/toshi0607s-projects/cca-study-guide/Chwb1VBd3EmgfA7t6U3AyMjDzgrX`.
- State/target: READY / production.
- Custom domain alias: `https://cca.toshi0607.com`.
- Remote build: 32 Astro files checked with 0 errors/warnings/hints; four static routes generated.
- Previous production rollback reference: `dpl_9bTrgSSnKdaV4XBfEJJB3mf1eXro` (`cca-study-guide-9p19w5udf-toshi0607s-projects.vercel.app`).

## Production Verification

- HTTP/HTML checks on `/`, `/en/`, `/privacy/`, and `/en/privacy/`: HTTP 200; expected `ja`/`en` document language; correct canonical; localized route content; app routes contain SSR `client:load` HTML.
- All four routes contain no third-party analytics loader, tracking code, or external egress allow-list.
- Named `agent-browser` QA confirmed Japanese/English application shells and both localized Privacy pages. English app hydration enabled 9 buttons; console errors 0; page errors 0.
- `vercel inspect https://cca.toshi0607.com` resolves to the new READY deployment and lists the custom/project aliases.
- No agent-browser sessions remain active after verification.

## Errors Encountered

- One browser navigation session became unresponsive after clicking the language link; closed it and completed direct-route verification in a fresh named session.
