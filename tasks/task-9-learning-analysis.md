# Task 9 — 模試結果の弱点分析・学習準備状況・次の学習アクション

Baseline main SHA: `2e19d16f026c9326c0512da6793309566c93a122`
Branch: `feature/task-9-learning-analysis`

## 開始条件の確認結果 (VERIFIED)

- PR #36 / #37 / #38 すべて main へマージ済み（`gh pr list` で確認）
- Baseline unit: 376 tests pass（`npx vitest run`）
- Baseline build: 0 errors（`npm run build`）
- Production question bank: `question(` ファクトリ呼び出し 60 件（`src/content/questions.ts` L65-1615）
- Domain 配分: `MOCK_EXAM_DOMAIN_DISTRIBUTION = { d1:16, d2:11, d3:12, d4:12, d5:9 }`（`src/lib/mock-exam-blueprint.ts`）
- Mock Exam 受験→結果→復習フローは既存 spec (tests/mock-exam.spec.ts) が緑

## 中心原則（このタスクで絶対に守る）

1. 分析は保存済み `mockExamAttempts` からの derived data。StudyData schema は変更しない。
2. stale 回答（question 不在 or revision 不一致）は Domain/difficulty/skill 軸集計から除外。
   ただし全体 raw 正答率・trend には attempt 保存済み `correct` を使って残す（再採点しない）。
3. 少数サンプルを弱点断定しない（evidence level で抑制）。
4. learning stability は「合否予測」ではなく、この学習ガイド内の反復状況のみ。
5. 公式 scaled score / 720 換算 / 合格確率 / 合否は一切算出しない。

## Constraints Ledger

| Constraint | Source | Verify by |
|------------|--------|-----------|
| StudyData schema を変更しない | 指示 §2.2 | `git diff src/lib/storage-schema.ts` = 空 |
| attempt の保存済み `correct` を再採点しない | §2.1/§2.3 | analyzer は `answer.correct` のみ参照、`isAnswerCorrect` 不使用 |
| stale 回答を現在 Domain/skill に紐付けない | §2.3 | unit test: revision-mismatch 回答が軸集計から除外 |
| stale 回答は全体 raw trend に残る | §2.3 | unit test: trend の correct は全 answers 由来 |
| evidence level 定数を中央管理 | §4 | `EVIDENCE_*` 定数を 1 箇所に定義 |
| insufficient/limited を弱点/得意/安定にしない | §4 | 候補は `sufficient` のみ、stability は Domain 全 sufficient 要件 |
| stability に正答率の高さを条件に入れない | §5 | 判定は count/spread/evidence のみ、accuracy level 不参照 |
| 状態名/文言に ready/passed/failed/合格圏 を使わない | §5 | grep で該当語なし |
| 分析ロジックを component に直書きしない | §2.1 | `mock-exam-analysis.ts` に pure layer |
| 初期 landing bundle に analysis を混ぜない | §8/§12 | analysis は MockExamView から dynamic import、別 chunk |
| chart library を追加しない | §6/§13 | package.json diff に新 dep なし |
| 日本語 hard-code しない | §10 | 文言は `copy.mockExam.*` 経由 |
| no-analytics 保証を維持 | §13 | `npm run test:no-analytics` pass |
| 既存 fast/full/a11y E2E 分割を維持 | §11 | 新 spec を @slow 分割、seeded storage |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| attempt.answers は questionRefs と 1:1（60件）| VERIFIED | mock-exam-storage.ts parseAttemptAnswers bijection |
| revision 一致 ⇒ 現在 question の domain/difficulty/skill = 受験時の内容 | VERIFIED | question factory revision=1、revision bump は content 変更時 |
| 全 attempt の total=60（questionRefs.length）| VERIFIED | blueprint QUESTION_COUNT=60、engine が固定 |
| Practice view は domainFilter を受け付ける | VERIFIED | App.tsx openWeakPractice(domainId) |
| skill は Practice の filter 軸ではない | VERIFIED | PracticeView は domainFilter のみ |

## 設計サマリ

### pure analyzer: `src/lib/mock-exam-analysis.ts`（+ `.test.ts`）

公開 API（すべて pure・deterministic・入力非破壊）:

- `EVIDENCE_LIMITED_MIN = 5`, `EVIDENCE_SUFFICIENT_MIN = 15`
- `evidenceLevelFor(compatibleCount): 'insufficient' | 'limited' | 'sufficient'`
- `analyzeMockExams(attempts, questions, range): MockExamAnalysis`

compatibility（per answer）: question 存在 && `question.revision === answer.questionRevision` → compatible。それ以外 stale。

AxisStat: `{ key, total, answered, unanswered, correct, incorrect, rawAccuracy, compatibleCount, evidenceLevel }`
（total == compatibleCount。stale は軸に置けないため両者一致。incorrect = total - correct。rawAccuracy = correct/total、total=0 は 0）

axes: byDomain(d1..d5順), byDifficulty(foundation/application/analysis順), bySkill(skillId順)。multi-skill は各 skill に 1 件寄与。

range: `all-time`(全) / `recent-3`(completedAt 昇順 tie-break id 昇順で末尾3)。

reviewPriority（domain / skill 各々）:
- sufficient 軸のみ候補。ランク: rawAccuracy 昇順 → incorrect 降順 → compatibleCount 降順 → key 昇順。
- ゲート: rawAccuracy < compatibleOverall.rawAccuracy（自分の compatible 平均未満 = 相対的に低い。固定合格ラインを使わない）。
- `{status:'insufficient'}`（sufficient 軸ゼロ）/ `{status:'none'}`（sufficient あるが平均未満ゼロ）/ `{status:'ranked', candidates}`。

stability（range 非依存・all-time）:
- `insufficient_data`: 完了 attempt ≤ 2 または compatible 合計 < 120
- `stable_practice`: 完了 ≥ 3 かつ compatible 合計 ≥ 120 かつ 直近3 attempt raw 正答率 spread ≤ 10pp（epsilon 1e-9）かつ 各 Domain evidence=sufficient
- それ以外 `building_evidence`
- 正答率の高さは条件に入れない。

trend（all-time, completedAt 昇順）: `{ attemptId, completedAt, outcome, correct, total, rawAccuracy, answered, unanswered, staleCount }`。correct/rawAccuracy は全 answers（stale 含む）由来。

nextActions（最大3, deterministic, rule-based）優先順:
1. domain review 候補(sufficient) → `review-domain`
2. skill review 候補(sufficient) → `review-skill`
3. limited/insufficient 領域の追加練習 → `practice-weak-area`
4. 完了 attempt < 3 → `take-another-exam`
5. stale 割合が高い(≥0.5) → `retake-latest`
descriptor `{ type, key? }` のみ返す（文言/導線は UI 側）。

### UI（`src/components/mock-exam/` 配下、dynamic import）

- `MockExamAnalysis.tsx`（主 view, 動的 import 先）
  - `MockExamTrend.tsx` / `MockExamAxisTable.tsx` / `MockExamNextActions.tsx`
- `MockExamView` から phase='analysis' 時に `import('./MockExamAnalysis')` で遅延ロード（rationales と同じ二段遅延）。
- landing / history から「学習分析」ボタンで開く。
- 主見出しへ focus、range 切替は aria-pressed/tablist、table に caption、色のみで正誤表現しない、evidence を text 表示。
- ナビゲーション: App から `onOpenPractice(domainId?)` を MockExamEntry→MockExamView→Analysis に配線（既存 navigate 再利用）。domain 候補→domain 絞り込み、skill/汎用→Practice を開く。take-another/retake→landing へ戻る。

### i18n: `copy.mockExam.analysis*` を ja/en 両方に追加。

## Todo（各項目に検証コマンド）

- [ ] 1. pure analyzer `mock-exam-analysis.ts` 実装
- [ ] 2. analyzer unit test（§11.1 の全ケース）→ `npx vitest run mock-exam-analysis` 緑
- [ ] 3. i18n analysis 文言 ja/en 追加 → `astro check` 型 OK
- [ ] 4. `MockExamAxisTable` / `MockExamTrend` / `MockExamNextActions` / `MockExamAnalysis` 実装
- [ ] 5. `MockExamView` に phase='analysis' と dynamic import、landing/history に導線
- [ ] 6. App→MockExamEntry→View に `onOpenPractice` 配線
- [ ] 7. CSS（既存 mock-exam スタイル準拠、mobile 横スクロール安全）
- [ ] 8. E2E spec `tests/mock-exam-analysis.spec.ts`（seeded storage, fast/@slow/a11y 分割維持）
- [ ] 9. `npx vitest run` 全緑 / `npm run build` 0 errors
- [ ] 10. `npm run test:no-analytics` pass
- [ ] 11. fast/a11y E2E pass、axe 0 violation
- [ ] 12. bundle 計測（main vs branch）、analysis 別 chunk 確認、Lighthouse budget
- [ ] 13. subagent 独立レビュー、Critical/High/Medium 修正

## Notes（逸脱ログ）

- schema 変更なし（storage-schema.ts 無編集）。分析は `mockExamAttempts` からの derived data のみ。
- 二段遅延: MockExamView → `MockExamAnalysisEntry`（動的 import）→ `MockExamAnalysis` 別 chunk。
- landing の「学習分析」ボタンは attempt 0 でも常時表示（空状態を到達可能にするため。history ボタンは従来どおり hasHistory 条件）。
- next-action の導線は既存 Practice view を再利用（`onOpenPractice(domainId?)`）。skill は Practice の filter 軸に無いため汎用「練習を開く」。捏造 route なし。
- unit test の fixture で当初 `perDomain` を attempt 合計と誤認し 2 件失敗 → fixture 修正（analyzer は正しい）。lesson: uniformAttempt の総回答数 = perDomain × 5。
- axis クラス名衝突（既存 review 画面の `.mock-exam-review-list/item`）を回避し `.mock-exam-priority-*` にリネーム。

### 計測結果 (VERIFIED)

Bundle (gzip, 初期 landing 経路):
- App: 12569 → 12626（+57、`onOpenPractice` 配線のみ、分析ロジック非混入）
- MockExamView chunk: 7452 → 7870（+418、entry ラッパー・phase・導線。`stable_practice` 一致 0）
- MockExamAnalysis chunk（新規・動的 import 専用）: 3556 gz（analyzer + 3 サブ component）
- questions chunk（ui copy 同梱）: 63426 → 65493（+2067、i18n 文字列のみ）

Lighthouse（同一マシン, mobile, 3 runs median, GA=test）:
- main baseline: score 93 / FCP 1442 / LCP 3204 / CLS 0.0000
- branch:        score 93 / FCP 1444 / LCP 3211 / CLS 0.0000
- Δ: score 0, FCP +2ms, LCP +7ms, CLS 0 → 回帰なし。
- LCP 3200ms 台の budget(3000) 超過は main 共通のローカル環境事象（CI lantern では main 合格＝開始条件）。分析 logic は初期経路に非混入のため budget への影響なし。

テスト:
- unit: 407 pass（うち analyzer 31 新規）
- E2E: mock-exam-analysis 10 pass（axe 0・en 含む）、mock-exam + accessibility 17 pass（非回帰）
- no-analytics: pass

## Review（レビュー結果と対応）

（fresh-context subagent レビュー後に記録）
