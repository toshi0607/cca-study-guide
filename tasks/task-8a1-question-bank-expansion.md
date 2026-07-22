# Task 8A.1 — Mock Exam用問題バンク拡充（38→60問）

## 背景 / ゴール

Task 8A（PR #36, mainへマージ済み `a8d5045`）でMock Exam engineは完成しているが、
問題バンクが38問しかなく `createMockExamSession()` が `insufficient-question-bank` を返す。
本タスクは学習価値のある22問を追加し、問題バンク全体を **exactly 60問 / d1:16 d2:11 d3:12 d4:12 d5:9**
にして、engineを一切変えずに60問sessionを生成できる状態にする。

- baseline main SHA: `a8d50453abc3ca855bdeac23892dff0d8c88c1b5`
- branch: `claude/cca-question-bank-expansion-01ed33`（最新mainベース、clean）

## Constraints（制約台帳）

| Constraint | Source | Verify by |
|---|---|---|
| 問題バンク全体を exactly 60問にする | user msg | content.test.ts の総数assert |
| Domain配分 exactly 16/11/12/12/9 | user msg / blueprint | 新規distribution test |
| engineを変更しない（最小修正のみ許可） | user msg | `git diff src/lib/mock-exam*.ts` = 空 |
| 追加分はstandalone（scenarioIdを付けない） | 既存設計 | 新規questionにscenarioId無し |
| 既存問題を削除・別Domain付替えしない | user msg | 既存38 IDが全て残る |
| skill IDは既存taxonomyのみ | validate.ts | validateContent 成功 |
| objective IDは公式blueprintのみ | validate.ts | validateContent 成功 |
| source は一次情報（Anthropic/MCP公式） | user msg | validateSources host allowlist |
| 全choiceにrationale、正解偏重なし | user msg | validateChoiceRationales + 目視 |
| initial bundleにrationale混入させない | 既存方針 | rationales.tsは別module維持 |
| scaled score/合否推測を入れない | user msg | engine非変更で自明 |
| Task 8B UIを実装しない | user msg | src/components未変更 |
| E2E高速化構成を壊さない | 既存方針 | playwright.config非変更 |

## Assumptions（前提台帳）

| Assumption | Status | Evidence |
|---|---|---|
| engineはfull `questions` bank（standalone+scenario）をdomainでbucketする | VERIFIED | src/lib/mock-exam.ts:95-112 |
| full bankをexactly quotaにすると全問選抜され配分は常に16/11/12/12/9 | VERIFIED | mock-exam.ts:118-123（need==haveでslice全件） |
| `mock-exam.test.ts:105` は「実バンクは不足」をassertしており反転が必要 | VERIFIED | mock-exam.test.ts:105-113 |
| content.test.ts:38 `choiceRationaleCount:152` は 38×4。240へ更新要 | VERIFIED | validate.ts:905 計算式 |
| standalone配分test(6%以内)は追加後も緑（d1が最大32.6%, diff5.6） | VERIFIED | 下記計算 |
| standalone multiple比率≥30%は追加後も緑（15/43=34.9%） | VERIFIED | 下記計算 |
| question() helperのverifiedAt上書きはscenario専用→standalone用に拡張要 | VERIFIED | questions.ts:38-53 |

## 監査結果（最新main, 2026-07-23）

`src/content/questions.ts` を機械集計。全38問、重複ID無し、source/verifiedAt/revision欠落無し、revisionは全て1。

| Domain | 現状(full) | 必要 | 追加 | standalone現状 |
|---|---:|---:|---:|---:|
| d1 | 8 | 16 | +8 | 6 |
| d2 | 9 | 11 | +2 | 4 |
| d3 | 8 | 12 | +4 | 4 |
| d4 | 7 | 12 | +5 | 4 |
| d5 | 6 | 9 | +3 | 3 |
| 計 | 38 | 60 | +22 | 21 |

タスク記載の不足数と一致。format: single26/multiple12。difficulty: foundation8/application21/analysis9。

### 薄い/未カバーのTask Statement・skill（優先追加対象）

- 未カバーobjective: **2.5**(built-in tools), **3.4**(plan mode), **3.5**(iterative refinement), **4.6**(multi-pass review), **5.4**(codebase exploration)
- 薄いskill: **agent-loop**(1), **claude-code-workflow**(1), **prompt-design**(1), evaluation(2), throughput-and-cost(3), human-oversight(3)

### 追加後の回帰計算

- standalone: d1:14 d2:6 d3:8 d4:9 d5:6 = 43。share vs weight差: d1 32.6%/27(5.6) d2 14.0%/18(4.0) d3 18.6%/20(1.4) d4 20.9%/20(0.9) d5 14.0%/15(1.0)。全て≤6 → 緑。
- standalone multiple: 既存7 + 新規8 = 15 / 43 = 34.9% ≥30% → 緑。

## 22問設計表

verifiedAt: 2026-07-23に公式docを実確認したものは `2026-07-23`、Task 5-7で確認済みの安定pageに依拠するものは `2026-07-14`(VERIFIED_AT)。

| # | ID | Dom | Obj | skill | fmt | diff | テーマ / 既存との差 | source(確認) |
|---|---|---|---|---|---|---|---|---|
| 1 | q-d1-loop-toolresult | d1 | 1.1 | agent-loop | single | application | 並列tool_use→全tool_resultを1つのuser messageで返す。既存loop-continueはstop_reason分岐、本問は結果返却契約 | tool-use(✓23) |
| 2 | q-d1-stop-max-tokens | d1 | 1.1 | agent-loop | foundation | foundation | stop_reason=max_tokensは打切り。完了扱いせずmax_tokens増/継続 | stop-reasons(✓23) |
| 3 | q-d1-single-vs-multi | d1 | 1.2,1.6 | orchestration | single | analysis | 単一agentが最適な場合（調整/文脈受渡しoverhead）。multi-agentを使わない判断 | subagents(✓23) |
| 4 | q-d1-coordination | d1 | 1.2 | orchestration | multiple | analysis | 中央o
rchestrator採用条件を2つ（統合所有者/相互依存）。既存fanoutは並列可否 | subagents,sdk-features(✓23/14) |
| 5 | q-d1-subagent-scope | d1 | 1.3,1.7 | orchestration,context-management | single | application | 親へは要約のみ返す（全transcript禁止）。既存subagent-inputは起動時入力契約 | subagents(✓23) |
| 6 | q-d1-handoff-data | d1 | 1.4 | workflow-enforcement,structured-output | multiple | application | 引き継ぎ必須データを構造化（2つ選択）。既存enforcementは強制境界 | sdk-features(✓14),hooks(✓23) |
| 7 | q-d1-hook-exitcode | d1 | 1.5 | workflow-enforcement | single | foundation | PreToolUse hookがexit code 2でblock。既存hook-timingはlifecycle位置 | hooks(✓23) |
| 8 | q-d1-fork-resume | d1 | 1.7 | context-management,orchestration | single | application | 別案探索=fork(原本不変)/継続=resume。既存session-stateは状態保持 | sessions(✓23) |
| 9 | q-d2-builtin-tools | d2 | 2.5 | claude-code-workflow | multiple | application | 組込tool安全運用を2つ（狭い検索先行/変更前read・後verify）。2.5未カバー。skillはreviewer指摘によりtool-design→claude-code-workflow（「組み込みツールの選択」を明記） | code-how,code-best-practices(✓23) |
| 10 | q-d2-tool-disambiguation | d2 | 2.1 | tool-design | single | application | 説明が重複する2ツール→境界/説明を鋭くして誤選択解消。既存2.1は契約/引数 | tool-use,define-tools(✓23) |
| 11 | q-d3-plan-mode | d3 | 3.4 | claude-code-workflow | single | application | 大変更はplan modeでread+design先行、些末はskip。3.4未カバー | code-best-practices(✓23) |
| 12 | q-d3-iterative-eval | d3 | 3.5 | claude-code-workflow,evaluation | multiple | analysis | 反復改善を2つ（基準先行定義/毎回regression）。3.5未カバー | code-best-practices,evals(✓23) |
| 13 | q-d3-headless-perms | d3 | 3.6 | claude-code-workflow,structured-output | single | application | headless CIは最小allowedTools+JSON出力+exit code。既存3.6はgating設計 | headless(✓23) |
| 14 | q-d3-command-vs-skill | d3 | 3.2 | claude-code-configuration | single | foundation | user起動の定型=command/自動読込知識=Skill。既存3.2はSkill説明簡潔化 | skills,code-features,code-best-practices(✓23) |
| 15 | q-d4-fewshot | d4 | 4.2 | prompt-design | single | application | few-shotは境界例で曖昧解消、指示と矛盾しない。4.2は既存で共有のみ | prompting-best(✓14) |
| 16 | q-d4-multipass | d4 | 4.6 | evaluation,prompt-design | multiple | analysis | 生成/局所評価/統合を分離する理由を2つ。4.6未カバー | evals,subagents(✓23) |
| 17 | q-d4-review-criteria | d4 | 4.1 | evaluation,prompt-design | single | application | 「高品質」を観測可能な合否基準へ。評価前定義 | evals(✓23) |
| 18 | q-d4-schema-design | d4 | 4.3 | structured-output | multiple | analysis | schema設計の規律：後段が使う項目に絞り過度なネストを避ける／enum大小は非保証で比較は区別しない。既存structured-guaranteeは構文保証≠意味妥当（reviewer指摘の重複を回避しrename） | structured(✓23) |
| 19 | q-d4-batch-tradeoff | d4 | 4.5 | throughput-and-cost | single | application | 対話パス＝同期／夜間大量＝batchの振り分け判断。既存q-d4-batchはbatch機構（reviewer指摘の重複を回避し配分判断へ） | batch(✓23) |
| 20 | q-d5-exploration | d5 | 5.4 | context-management | single | application | 探索は狭い検索から広げ、変更前に実ファイルで仮説検証。5.4未カバー | large-codebases(✓23) |
| 21 | q-d5-provenance-carry | d5 | 5.6 | structured-output | single | analysis | 出典が食い違う場合の来歴保持：丸めず両出典を保持。既存q-d5-provenanceはclaim単位のstructured-carry（reviewer指摘の重複を回避し対立処理へ／multiple→single） | structured(✓23) |
| 22 | q-d5-error-propagation | d5 | 5.3 | failure-handling,structured-output | multiple | analysis | 下流失敗は原因保全+再試行可否+部分結果を上流へ(2つ) | tool-use,mcp-tools(✓23) |

新規 difficulty: foundation3 / application12 / analysis7。新規 format: single15 / multiple7（reviewer対応で#21をmultiple→single化）。全体→ foundation11/application33/analysis16、single41/multiple19。standalone multiple比率 = 14/43 = 32.6%（≥30%）。新規skill増分: agent-loop+2, orchestration+3, claude-code-workflow+4（#9をtool-designから変更）, prompt-design+3, evaluation+3, tool-design+1, structured-output+4, workflow-enforcement+2, context-management+2, throughput-and-cost+1, failure-handling+1。

## 実装手順チェックリスト

- [ ] questions.ts: question() helperのverifiedAt上書きをstandaloneでも可能に
- [ ] questions.ts: 22問追加（d1→d2→d3→d4→d5のbatch、各batch自己レビュー）
- [ ] rationales.ts: 22問×全choiceのrationale追加
- [ ] content.test.ts: choiceRationaleCount 152→240、60問/配分distribution test追加
- [ ] mock-exam.test.ts: :105 を production-bank統合test（ok/60/配分/unique/revision一致）へ反転
- [ ] gates: test / astro check / build / no-analytics / e2e:fast / bundle計測
- [ ] subagent独立レビュー→対応
- [ ] commit / push / PR作成（マージしない）

## Notes（逸脱ログ）

- q-d1-coordination の source `sdk-features` は本日未取得だが subagents(取得済) が中央調整の記述を含むため主根拠に採用。
- verifiedAt 混在は「実確認日」を正直に反映する方針（機械的更新をしない）。
- q-d1-handoff-data(#6) は主根拠 `sdk-features`（構造化handoff）を本日再取得していないため、保守的に verifiedAt=2026-07-14 のまま。`hooks` は本日取得済だが、enforcement境界の傍証であり構造化handoff主張の一次根拠ではないため昇格しない。
- q-d4-fewshot(#15) も `prompting-best` が本日未取得のため verifiedAt=2026-07-14。

## Review（下部・レビュー結果）

独立レビュー: `reviewer` agent（opus, fresh context）。**Approve（Blocker/Highなし）**。160 tests green、engine差分なし、配分16/11/12/12/9・schema検証を確認。

対応した指摘:
- **Should-fix 重複3件**（配分quota上、既カバーobjectiveに追加が集中したことが一因）を、domainId/objectiveIdを変えずに別facetへ差し替えて解消:
  - #19 `q-d4-batch-tradeoff`: batch機構の言い換え → 対話/夜間の実行方式**振り分け判断**へ。
  - #18 `q-d4-schema-semantic` → `q-d4-schema-design`: 構文保証≠意味妥当の言い換え → schema**設計規律**（最小化＋enum大小非保証）へrename。
  - #21 `q-d5-provenance-carry`: claim単位structured-carryの言い換え → **出典対立時**の来歴保持へ（multiple→single）。
- **Nice-to-have #5 skill-fit**: #9 `q-d2-builtin-tools` の skill を `tool-design`（authoring）→ `claude-code-workflow`（「組み込みツールの選択」を明記）へ変更。
- **Nice-to-have #4 verifiedAt整合**: #6 の設計表注記を(✓23)→(✓14)へ訂正し、Notesに保守的据置の理由を記録（コードは元から2026-07-14で正直な状態）。

未対応: なし（全指摘に対応）。
