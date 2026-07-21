# Task: コンテンツ型と validation 基盤の拡張 (PR2)

Branch: feat/content-model-study-guide-handson（origin/main = dd85302 から作成）

前回の tasks/todo.md (PR #27) は完了・無関係のため本内容に置き換え。

## 目的

後続 PR（学習ガイド / ハンズオン / 公式6シナリオ学習 / 難易度別出題 / スキル別分析 /
選択肢別解説 / 模試 / 誤答分析 / 学習準備度）が依存できる型・分類・データ・検証を整備する。
UI・storage・依存関係は変更しない。

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 既存問題の stem / choices.text / explanation / correctChoiceIds / format / sourceIds / verifiedAt を変更しない | user msg | 変更前後の JSON スナップショット差分 |
| localStorage key と version を維持 | user msg | `git diff src/lib/storage.ts` が空 |
| 新規 npm 依存を追加しない | user msg | `git diff package.json pnpm-lock.yaml` が空 |
| UI / CSS / 表示文言を変更しない | user msg | `git diff src/components src/styles src/i18n src/pages` が空 |
| 型アサーション・any・optional 化で不備を隠さない | user msg | types.ts / validate.ts の差分レビュー |
| 既存 validator の方式（zod + errors 配列 → throw）を維持 | user msg | validateContent() の公開 API 不変 |
| 既存 ID（question / card / scenario / source / objective）を変更しない | user msg | スナップショット差分と grep |
| Lighthouse の performance budget（LCP 3000ms）を満たす | CI (`scripts/check-lighthouse-budget.mjs`) | perf.yml の実行結果 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| validator は throw 方式、contentStats を module load 時に生成 | VERIFIED | src/content/validate.ts:115-119 |
| 問題は `question()` ヘルパー経由で 38 問生成される | VERIFIED | src/content/questions.ts:15-41、`grep -c "^  question("` = 38 |
| task statement = Domain.objectives の id（'1.1'〜'5.6' の 30 件） | VERIFIED | src/content/domains.ts、validate.ts:71 |
| 既存 Scenario 4 件は公式6シナリオとは別概念（アプリ独自の練習ケース） | VERIFIED | src/content/scenarios.ts:8-11 のコメント |
| UI は choice.text / question.explanation のみ参照し、新フィールドを読まない | VERIFIED | src/components/quiz/QuizQuestion.tsx |
| 既存コードに difficulty の正式な別命名は存在しない | VERIFIED | `grep -rniE "difficulty"` は DESIGN.md の散文 1 件のみ |

## Baseline（変更前 / dd85302）

- `pnpm test` → 9 files / 55 tests passed
- `pnpm build`（astro check + astro build）→ exit 0
- `pnpm test:e2e` → 50 passed
- `pnpm test:no-analytics` → exit 0
- baseline での失敗なし

## Plan

- [x] 1. 最新 main 取得と新ブランチ作成
- [x] 2. 既存コード調査（types / cards / questions / scenarios / sources / domains / validate / quiz / storage / UI）
- [x] 3. baseline test 実行 + 変更前 question スナップショット取得
- [x] 4. 型追加（OfficialScenarioId / PracticeScenarioId / SkillId / QuestionDifficulty / Choice.rationale / StudyGuideSection / HandsOnGuide）
- [x] 5. skills.ts（Skill taxonomy の一元管理、14 スキル）
- [x] 6. scenarios.ts に公式6シナリオ定義と練習ケースからの参照を追加
- [x] 7. questions.ts に difficulty / skills / 選択肢別 rationale を追加（38問 × 4選択肢 × ja/en = 304 本）
- [x] 8. study-guide.ts（3 セクション）/ hands-on.ts（1 ガイド）の型と実データ追加
- [x] 9. validate.ts を種別ごとの純粋関数へ分割し検証を拡張
- [x] 10. content.test.ts に正常系・異常系 unit test を追加（11 → 60 tests）
- [x] 11. スナップショット差分で既存問題の不変性を確認（差分 0）
- [x] 12. unit test / astro check / build / E2E / no-analytics 再実行
- [x] 13. 差分レビュー（スコープ外変更なし: `git diff` は src/content と tasks のみ）
- [x] 14. commit / push / PR 作成

## Notes（実装中の判断と逸脱）

- **リストの型**: 指示例の `learningObjectives: LocalizedText[]` ではなく、既存の
  `Objective.mustKnow` と同じ `LocalizedText<string[]>` を採用した。validate.ts の
  `localizedStringArraySchema` をそのまま再利用でき、ja/en 片方だけ空のケースを検出できる。
- **difficulty の命名**: `foundation` / `application` / `analysis` を採用。`easy` / `medium` / `hard`
  など別の正式命名は既存コード・DESIGN.md・tasks 配下のいずれにも存在しないことを grep で確認済み。
- **公式6シナリオ**: 既存 Scenario（アプリ独自の練習ケース 4 件）は公式6シナリオとは別概念のため、
  `OfficialScenarioId` を新設し、練習ケース側に `officialScenarioIds` を持たせて関連付けた。
  既存 Scenario ID は変更していない。Scenario ID 自体も `PracticeScenarioId` union にして型安全にした。
- **公式6シナリオ名の裏取り**: 公式 Exam Guide PDF を取得し、ToUnicode CMap を解いてテキスト抽出した上で
  6 シナリオ名・5 ドメイン配点・30 task statement を確認した（`verifiedAt: 2026-07-21`）。
  アプリに載せる summary はガイドの文をコピーせず独自の要約に書き換えている。
- **standalone / scenario の区別**: `ChoiceQuestion` を
  `StandaloneQuestion | ScenarioQuestion` の判別可能 union にし、型と validation の両方で区別した。
- **validator**: 既存の zod + errors 配列 → 最後に throw という方式を維持したまま、種別ごとの
  純粋関数（`validateQuestions` / `validateStudyGuideSections` / `validateHandsOnGuides` など）へ分割。
  入力を `unknown` で受けるため、テストは型アサーションなしで壊れたデータを渡せる。
  1 件ごとに safeParse するので、1 件の不備で他の不備が隠れない。
- **レビュー指摘への対応（fresh-context reviewer、Request Changes）**:
  - M1 バンドル +24KB gzip（+32%）: 当初は「次の PR で表示するので前払い」と判断したが、CI の
    Lighthouse budget が実際に落ちた（LCP main 2112ms → 本ブランチ 3062/3176ms、budget 3000ms）。
    レビュー指摘が正しかったため、rationale を `src/content/rationales.ts` へ分離し、
    `ChoiceRationales`（questionId → choiceId → LocalizedText）として持つ形へ変更した。
    このモジュールを静的に import するのはサーバー側で動く `validate.ts` だけなので、
    island バンドルには入らない。結果: `App.*.js` 287,681B/gzip 101,184B → 220,965B/gzip 77,475B
    （main は 218,062B/gzip 76,749B、差分は difficulty と skills の分のみ）。
    型の情報量は落としていない（全選択肢に ja/en の rationale が必須である点は
    `validateChoiceRationales` がビルド時に強制する）。後続 UI は動的 import で読み込む。
    なお分離後も CI の Lighthouse が一度 LCP 3057ms で落ちたため、ローカルで origin/main と
    本ブランチを同一マシンで A/B 計測した（main LCP 2319ms / 本ブランチ 2278ms、いずれも合格）。
    CI 再実行では LCP 2110ms・score 99 で合格しており、あの失敗は runner 側のばらつきと判断した。
    それでも分離自体は 24KB gzip をクイズ画面から外す改善なので維持する。
  - M2 スキル分布の偏り（`agent-loop` / `claude-code-workflow` / `prompt-design` が各 1 問）:
    問題追加は本 PR のスコープ外のため、taxonomy 側を削らず「全スキルが最低 1 問に使われる」ことを
    `validateSkillCoverage` としてビルド時検証に追加した。母数が少ないスキルの扱い（最低件数に満たない
    スキルは弱点判定しない等）は分析 PR の要件として残課題に記載。
  - m1 `HandsOnGuide.scenarioIds` → `officialScenarioIds` へ改名、m3 `revision` を Study Guide /
    Hands-on にも追加、m4 統計テストを固定値に、m5 taxonomy validator の異常系テスト追加、
    m6 `ContentIndex` をキー配列から導出、m7 ID 重複検査を parse 前の生入力に対して実行、
    m8 未使用 export 削除、m9 difficulty の値リストを `satisfies` で型と同期、m10 アサーションを
    フィールド名まで厳密化、m11 参照配列の重複検査、m12 rationale の重複・explanation 複製・ja=en の
    検査を validate.ts へ移してビルド時に落ちるようにした。
  - m2（`taskStatementIds` と `objectiveIds` の呼び分け）は既存フィールド名の変更を伴うため見送り。
    型にコメントで参照先を明記している。
- **rationale の一括執筆**: 38 問を 5 分割し、それぞれ独立したエージェントに執筆させた上で、
  変更前後の JSON スナップショット比較（id / stem / choices.text / correctChoiceIds / explanation /
  sourceIds / verifiedAt / scenarioId）で既存フィールドが 1 文字も変わっていないことを機械検証した。
