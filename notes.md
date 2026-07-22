# Notes: Task 4 Study Guide

## Verified Start State

- Date: 2026-07-22 (Asia/Tokyo)
- PR #29: merged at `1cadb1f645c513f0b264e1904b4a8079a01eeadf`
- Initial HEAD and `origin/main`: `1cadb1f645c513f0b264e1904b4a8079a01eeadf`
- Worktree: clean detached HEAD before branch creation
- Branch: `codex/task-4-study-guide`, created directly from `origin/main`
- Existing lesson reviewed: confirm UX/regulatory posture before choosing an interruptive privacy design; not directly applicable to this Study Guide change.

## Scope and Evidence Log

### Repository reconnaissance

- Current `GuideView` renders `domains` and 30 objective summaries directly; it does not consume the three existing `studyGuideSections` or expose section progress/actions.
- Existing Study Guide model already contains revision, recommended order, bilingual prose, task statements, cards, questions, sources, and verification date.
- Existing validator checks schema, orphan references, and duplicate fields, but not 30/30 coverage, 5/5 domains, or order contiguity.
- App statically imports every view. A Guide dynamic import must ensure neither App nor another eager module imports `studyGuideSections`.
- Exact Practice and Quiz targets need App-owned target state and narrow view props; direct source anchors can use existing `SourceLinks`/`sourceById`.
- Existing quiz synchronous `answeredIdRef` guard must remain intact.

### Local baseline (Node 26.5.0 / macOS; package declares Node 22.x)

- Initial `pnpm test` could not run because `node_modules` was absent; `pnpm install --frozen-lockfile` completed without lockfile changes.
- `pnpm test`: 10 files / 173 tests passed.
- `pnpm build`: Astro check 0 errors, 0 warnings, one existing Zod URL deprecation hint; 4 pages built.
- `pnpm test:no-analytics`: passed.
- `pnpm test:e2e`: 52/52 passed.
- Client JS: App 225,946 raw / 78,951 gzip; aggregate 249,495 raw / about 88,945 gzip.
- No rationale content or Zod validator implementation was found in the emitted client JS.
- Preliminary baseline Lighthouse (3-run, current no-analytics `dist`): Performance 87, FCP 1,235ms, LCP 3,951ms, CLS 0. The budget script failed on Performance and LCP. Because CI builds with a test GA ID and local variance is known, this is diagnostic only; formal evidence must use matched main/branch builds with identical environment and build variables.

### Official Exam Guide verification

- Exact specified PDF downloaded successfully via direct `curl` to ignored `tmp/pdfs/`.
- PDF metadata: 39 pages, created 2026-07-09, PDF 1.4, unencrypted.
- Text extraction confirms task statement IDs 1.1-1.7, 2.1-2.5, 3.1-3.6, 4.1-4.6, and 5.1-5.6 (30 total).
- Rendered page 5 visually confirms the detailed-objective layout and Domain 1 statement headings. Content work will remain independent summaries rather than copied knowledge/skills bullets.

### Implementation specification after independent pre-review

- Eight sections, exact-once mapping: (1) `1.1,1.2,1.3,1.6`; (2) `1.4,1.5,1.7`; (3) `2.1-2.5`; (4) `3.1-3.3`; (5) `3.4-3.6,5.4`; (6) `4.1-4.5`; (7) `4.6,5.1`; (8) `5.2,5.3,5.5,5.6`.
- Existing section IDs `sg-agentic-loop` and `sg-tool-and-mcp` have materially changed content/linkage and therefore advance to revision 2. Newly introduced section IDs begin at revision 1.
- Preserve the third shipped ID `sg-context-and-handoff` on the closest successor (section 8: escalation/reliability) at revision 2. Objectives split into the new sections 2 and 7 start untouched; one historical completion is never cloned across the split.
- Questions do not exist for `2.5`, `3.4`, `3.5`, `4.6`, or `5.4`; these remain truthfully card-only. No new questions are added in Task 4.
- Validator will require exact taxonomy coverage, exact-once section coverage, contiguous order, statement/domain/link/source semantic alignment, at least one card per statement, and ja/en list-length parity.
- UI boundary: manual dynamic import with accessible loading, focused retryable error, rejected-promise reset, and unmount cancellation.
- Progress state: absent/current in-progress/current completed/stale/future. Only Start, Complete, and stale Reconfirm write; future is read-only. Stale completed reconfirm preserves its original `completedAt` and updates `revision`/`updatedAt` only. Unknown stored IDs are preserved but ignored in derived display.
- All writes use a synchronous App data ref and save-first whole-document replacement. Storage schema/version/key/parser stay unchanged.
- Related resources open exact existing Practice/Quiz targets; source links stay direct official anchors. Existing quiz answer guard remains the only answer path.
- Diagnosis is in-memory, keyboard-native, and only recommends a starting section. Section order/timing/diagnosis/calendar pacing are labeled original study guidance.

## Errors

- 2026-07-22: the web fetcher received HTTP 403 for the specified Exam Guide PDF and certification access page. No content decision was based on the failed response.
- 2026-07-22: system `pdftotext` was unavailable. Switched to the bundled PDF runtime (`pypdf` extraction plus Poppler rendering) and verified the downloaded document successfully.
- 2026-07-22: direct Node 26 type-stripping import failed on extensionless TypeScript module resolution. No content decision depended on it.
- 2026-07-22: pre-review initially proposed stamping a new `completedAt` on stale completed reconfirm. Orchestrator review identified the historical-data loss; contract and tests were changed to retain the original completion timestamp.
- 2026-07-22: the first large content-test replacement patch did not match the current fixture block and was rejected atomically. The worker switched to bounded exact patches; no partial test edit occurred.
- 2026-07-22: orchestrator UI review found one nonexistent diagnosis section ID, bare-ID related-material labels, and exact-target navigation lacking focus/announcement and an exit path. These are blocking and are being corrected with safe lookup, localized labels, explicit clear behavior, and E2E coverage.
- 2026-07-22: the first stale-revision E2E attempted to intercept a source-module URL, which does not exist in the production build served by Playwright. Fixed the underlying content semantics by advancing materially changed existing sections to revision 2 and seeding revision 1 directly.
- 2026-07-22: initial reorganization replaced shipped `sg-context-and-handoff` with a new ID, which would hide its record from displayed progress. Kept the ID on the closest semantic successor at revision 2 instead of fabricating completion records for every split destination.
- 2026-07-22: final content review found diagnosis choices broader than their destination sections. Narrowed each ja/en option to exactly match agent loops/delegation, tool/MCP boundaries, or escalation/human review/provenance.
- 2026-07-22: adversarial browser review reproduced cross-tab document loss, Quiz UI advancing after a failed write, a nonfunctional retry for a cached failed Guide chunk, and focus loss after leaving exact-card mode. Fixes use a fresh canonical read before mutation, save-first Quiz state, an actual page reload recovery, and explicit search focus.
- 2026-07-22: two full E2E reruns cascaded with `ERR_CONNECTION_REFUSED` after 22-27 tests because two agents started Playwright web servers on the same fixed port 4325; the second runner's teardown killed the shared preview. Classified as test-infrastructure collision and scheduled an isolated rerun.

## Final Local Verification

- Isolated `pnpm test`: 11 files / 185 tests passed.
- `pnpm build`: 70 files checked, 0 errors, 0 warnings, one existing `z.string().url()` deprecation hint; four static pages built.
- `pnpm test:no-analytics`: passed.
- Isolated `pnpm test:e2e`: 64/64 passed in about one minute. This confirms the earlier `ERR_CONNECTION_REFUSED` cascade was the fixed-port runner collision, not a product regression.
- The E2E suite covers all three diagnosis destinations, memory-only diagnosis, keyboard section start/complete, reload, stale read-without-write and explicit reconfirm, preserved `completedAt`, future revision protection, unrelated v2 field preservation, localStorage failure with unchanged UI/focused notice, duplicate-action suppression, cross-tab fresh-document preservation, localized exact card/question/source transitions, Practice return/focus, Quiz target focus and scenario context, Guide chunk failure recovery, English flow, ja/en axe, and 360px overflow.
- Final content review: 8 sections, exact-once 30 statements, 5 domains, ja/en/source alignment, original guidance labeling, truthful availability, and exam-dump guardrails; no blockers.
- Final adversarial review: initial cross-tab, Quiz save failure, cached Guide retry, and Practice focus blockers were fixed and independently rechecked; no blockers remain. Residual localStorage read-modify-write behavior is not a strict cross-process transaction, but the reproduced stale-tab data-loss path is fixed by re-reading canonical storage immediately before every mutation.

### Browser-observed JS graph

Built both `origin/main` and the final branch with `PUBLIC_GA_MEASUREMENT_ID=G-TEST123456`, loaded each initial route in Chromium, captured first-party `.js` resource entries, opened Guide, then measured emitted files with gzip.

- Main initial: App 225,946/78,935; client 2,716/1,394; hooks 2,590/1,139; preact 10,499/4,425; total **241,751 raw / 85,893 gzip**. Guide open adds 0 because Guide is eager.
- Branch initial: App 36,310/10,763; questions 197,838/69,710; preload helper 11,833/5,018; client 1,407/808; hooks 2,591/1,140; total **249,979 raw / 87,439 gzip**.
- Branch Guide open additionally requests only GuideView: **18,263 raw / 7,506 gzip**; cumulative after Guide is 268,242/94,945.
- Comparing only App filenames would incorrectly claim a 189KB raw reduction. The real initial-route aggregate changes by **+8,228 raw / +1,546 gzip**. Large Study Guide prose is nevertheless absent from the initial graph and deferred to the Guide interaction.
- All emitted JS aggregate: 275,982 raw / about 97,795 gzip. No `rationales.ts` or validator/Zod implementation is included in the client output.

### Final matched Lighthouse A/B

Three mobile Lighthouse runs per build were interleaved main/branch with identical build variables and served artifacts. Reports are in `/tmp/cca-task4-lighthouse-final-ab`.

- Main runs: Performance 95/87/94; FCP 1,219/1,596/1,215ms; LCP 2,973/3,923/3,053ms; TBT 53/12/11ms; CLS 0/0/0. Median: Performance 94, FCP 1,219ms, LCP 3,053ms, CLS 0. Budget script fails only the already-observed local LCP threshold by 53ms.
- Branch runs: Performance 97/95/89; FCP 990/1,290/1,302ms; LCP 2,593/2,893/3,754ms; TBT 51/13/11ms; CLS 0/0/0. Median: Performance 95, FCP 1,290ms, LCP 2,893ms, CLS 0. Budget script passes.
- Classification: branch does not regress the matched local median and passes the local budget. GitHub's Node 22/Linux performance job remains a mandatory merge gate.
