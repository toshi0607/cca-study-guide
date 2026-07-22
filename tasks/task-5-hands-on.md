# Task 5A: Hands-on guides — content model, 4 guides, validation, tests

Scope: content-model-first PR (mirrors PR #28). No storage/UI behavior change.
Task 5B (UI, progress helper, save-first, navigation, i18n, a11y, E2E, bundle) is a
separate session AFTER 5A merges.

Base SHA: 7f7d9e110b7e2075dcc8cb21cfa694e957b2f016 (origin/main, PR #30 merged)
Branch: claude/task-5-hands-on-guides-98ac41

## Baseline (VERIFIED at start)
- pnpm test: 11 files / 185 tests pass
- pnpm build: 70 files / 0 errors / 0 warnings / 1 hint (Zod URL deprecation)
- storage-schema.ts already ships HandsOnProgress type + validation (no change needed)
- hands-on has never been rendered → zero handsOnProgress records exist in production

## Constraints
| Constraint | Source | Verify by |
|------------|--------|-----------|
| No storage v2 schema/key/migration change | user msg | git diff storage*.ts empty |
| No UI behavior change (5A only) | user msg | git diff components/ empty |
| Keep `ho-ci-review` ID | user msg + lessons.md L5/L7 | grep id in hands-on.ts |
| Don't include real exam questions / verbatim copy | user msg | content review |
| No API keys/tokens in content | user msg | grep audit |
| Official facts vs app recommendations distinguished | user msg | content review |
| ja/en meaning parity | user msg | content review + list-parity validation |
| Cover 4 required themes, distinct experiences | user msg | validation check |
| Don't grow unbounded string arrays; add only structured fields UI/validation need | user msg | type review |

## Assumptions
| Assumption | Status | Evidence |
|------------|--------|----------|
| storage already validates HandsOnProgress | VERIFIED | storage-schema.ts:102 isHandsOnProgress |
| hands-on content is unrendered today | VERIFIED | no import of hands-on in components/ |
| card/question refs must be in-domain + cover a task statement | DECIDED | mirror study-guide validation |
| ho-ci-review revision bump is safe (no records) | VERIFIED | hands-on unrendered |

## Revision decision for ho-ci-review
Enhancing ho-ci-review to be the core of Theme B (team config + CI): adding a
project-configuration step (CLAUDE.md + shared allowed-tools) plus the new metadata
fields. Because a step is ADDED, bump revision 1 → 2. Safe: hands-on has never been
rendered, so no stored progress records exist; the bump has zero learner impact.
Existing step IDs are preserved; only one new step id is added.

## Type extension (minimal, structured)
HandsOnStep += expectedResult: LocalizedText<string[]>
New: HandsOnPitfall { id; symptom: LocalizedText; isolation: LocalizedText }
HandsOnGuide += taskStatementIds, skillIds: SkillId[], environment, setup,
  troubleshooting: HandsOnPitfall[], securityNotes, costNotes, reflection.

## 4 guides
- A ho-support-agent-escalation → customer-support-resolution; d1,d2,d5; TS 1.1,2.1,2.2,5.2,5.5
- B ho-ci-review (rev 2) → claude-code-ci; d3; TS 3.1,3.6
- C ho-structured-extraction → structured-data-extraction; d4; TS 4.1,4.3,4.4,4.5,4.6
- D ho-multi-agent-research → multi-agent-research; d1,d5; TS 1.2,1.3,5.1,5.3,5.4

## Steps
- [x] Extend types.ts
- [x] Author 4 guides (hands-on.ts)
- [x] Verify official sources for new commands/terms (subagent: all confirmed; content stayed conceptual so no corrections needed)
- [x] Extend validate.ts (schema + new checks + 4-theme + distinct + parity + domain consistency; theme checks split into validateHandsOnThemes)
- [x] Update content.test.ts (fixture new fields, count 4, +15 negative tests)
- [x] Update DESIGN.md (Hands-on guides subsection)
- [x] pnpm test 200 pass (was 185) / pnpm build 70 files 0 err/0 warn/1 hint (pre-existing)
- [x] pnpm test:no-analytics pass
- [x] forbidden import audit: hands-on/validate NOT in client bundle (dist grep clean); contentStats build-time only via index.astro frontmatter
- [x] pnpm test:e2e 64/64 pass (single run, port 4325 cleared; no UI change so no regression)
- [~] Independent content review + adversarial validation review (running)
- [x] Resolve findings
- [x] PR #31 created; CI green (Vercel pass, lighthouse pass). Merge-ready, awaiting user merge.

## Task 5B handoff (from 2nd-round review)
- Do NOT assume no ho-ci-review progress records exist. A revision-1 handsOnProgress
  record could arrive via manual v2 import. Task 5B MUST add a test that seeds a
  ho-ci-review revision-1 record and proves stale-revision handling preserves its
  completedAt/history (do not silently overwrite), never prunes unknown/future records,
  and never prunes unknown step IDs on read.

## Notes
- Verification subagent confirmed all official terms; content stayed at concept level
  (stop_reason/tool_use/tool_result, JSON-Schema structured output, print mode), so no
  brittle-flag corrections were needed.
- Split theme checks into validateHandsOnThemes (cross-guide) so per-guide fixture tests
  still validate to [] in isolation.
- Final tests: 202 pass (baseline 185). Build 70 files, 0 err / 0 warn / 1 pre-existing hint.

## Review results
Independent content review (opus, fresh ctx): no BLOCKER/MAJOR. Applied: softened the
file-header claim to describe the structural (sources-vs-steps) separation it actually
provides; added an actionable/low-false-positive criteria line to ho-ci-review step-scope
to honor the claude-code-ci scenario; reworded ho-structured-extraction step-schema
expectedResult ("型/types" -> "必須フィールド/required fields").

Adversarial validation review (reviewer): 1 MAJOR + 1 related MINOR, same root cause —
validateHandsOnThemes only inspected guides[0] per theme, so a near-duplicate slipped past
once a theme had 2+ guides, and a single guide spanning two themes false-positived. Fixed
by deduping theme-carrying guides by id and comparing every carrier's skill-set signature;
error now names the two colliding guides. Added tests: two-guides-per-theme duplicate is
caught; single guide spanning two themes is not flagged. All other adversarial concerns
(false negatives, multi-domain false positives, skillIds runtime enforcement, revision-bump
soundness, build-time throw) checked SOUND by the reviewer.
