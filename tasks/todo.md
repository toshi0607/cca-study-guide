# シナリオ演習の実装

Previous plan (weak-area visualization, PR #11) completed and merged; replaced by
the scenario-practice plan below.

Branch: claude/amazing-lehmann-f723d4（origin/main ada1a51 からリセット済み）

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 選択式演習の回答UI・採点・保存ロジックを再利用（重複実装禁止） | user msg | App.tsx diff（QuizView内で answer/advance/results を共用） |
| 実試験のシナリオ・設問の複製・再構成の禁止、独自作成明記 | user msg + cards.ts方針 | 全コンテンツが独自の架空事例、UI/README/DESIGNに明記 |
| ja/en両ロケール必須 | user msg + ui.ts | content.test.ts のローカライズテスト |
| Scenario: id/revision/title/background(2〜4段落)/domainIds/sourceIds/verifiedAt | user msg | validate.ts zodスキーマ |
| シナリオ3本以上、各3〜5問、single/multiple混在、scenarioId紐づけ | user msg | content.test.ts |
| scenarioId参照整合・設問3問以上を validate/テストで担保 | user msg | validateContent() |
| quizStats は既存の仕組み（questionId単位）にそのまま乗せる | user msg | storage.ts 変更なし |
| 設問中にケース記述を参照可能（折りたたみ） | user msg | e2e |
| e2e にシナリオ演習フロー追加 | user msg | tests/app.spec.ts |
| pnpm test / test:e2e / build 全パス | user msg + pr.md | exit 0 |
| フォントサブセット不足時は再生成しコミット | user msg | fonts.test.ts |
| コミット末尾 Co-Authored-By / PR末尾 Generated with | user msg | git log / PR body |
| アクセシビリティ既存水準維持（axe wcag2a/aa） | user msg | e2e axe |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| シナリオ設問はケース前提のためランダム演習プールから除外する | DECISION | 設問単体では文脈不足。標準プール＝ !scenarioId でフィルタ |
| 領域配分テスト（±6%）は非シナリオ設問のみに適用へ変更 | DECISION | 上記除外に伴う整合。既存21問の配分は不変 |
| 新規UI文言はdisplayフォント要素に載せない → サブセット再生成不要 | VERIFIED | fonts.test.ts / subset-fonts.mjs のdisplay対象は既存見出しのみ |
| content.test.ts の「scenarioId未使用」テストは置換する | VERIFIED | content.test.ts:64 |
| background は LocalizedText<string[]>（段落配列）で表現 | DECISION | mustKnow と同じパターン。zodで2〜4段落を検証 |

## Todo

- [x] types.ts に Scenario 型追加
- [x] scenarios.ts 新規作成（独自シナリオ4本 ja/en、うち3本は複数ドメインをまたぐ）
- [x] questions.ts にシナリオ設問17問追加（scenarioId付き、single/multiple混在）
- [x] validate.ts: scenarioスキーマ + 参照整合 + 3〜5問・形式混在チェック
- [x] content.test.ts 更新（scenario検証、配分テストのスコープ変更、ローカライズ）
- [x] i18n/ui.ts に ja/en 文言追加
- [x] App.tsx QuizView にモード選択・シナリオ一覧・ケース記述・折りたたみ参照を追加（既存回答ロジック再利用）
- [x] global.css にシナリオUIスタイル追加
- [x] e2e: シナリオ演習フロー + axe
- [x] DESIGN.md / README.md 更新（独自作成であることを明記）
- [x] pnpm test（44 passed, exit 0）/ pnpm test:e2e（43 passed, exit 0）/ pnpm build（exit 0）
- [x] コミット・push・PR作成

## Notes

- 2026-07-17: 依存の選択式演習モードが未マージのため停止。
- 2026-07-18: PR #12 マージ済みを確認、origin/main へリセットして着手。
- シナリオ4本: MCPツール設計（d2）、マルチエージェント構成（d1/d5）、Claude Codeチーム導入（d3）、構造化出力と信頼性設計（d4/d5）。全て架空企業の独自ケース。
- サマリの「解説の見直し導線」: 間違えた問題リストに解説本文を追加表示（両モード共通、既存CSSはfirst-child基準に調整）。
- e2e回答ループは既存quizテストのパターンを踏襲（ヘッダの 第n問/全m問 を利用）。
- 逸脱: sc-code-rollout に MCP設定共有（d2）の段落と設問を追加し5問構成へ（「複数ドメインをまたぐ題材」の充足のため）。フォント再生成は不要だった（新規文言はdisplayフォント要素に載せず、fonts.test.tsパス）。

## Review

/code-review high（6アングル並列）の結果: バグ指摘0件、クリーンアップ5件を反映済み。
- 背景段落レンダリングを ScenarioBackground コンポーネントへ共通化（indexキー化）
- ランダム演習プール standaloneQuestions を questions.ts へ一元化
- validate.ts に 3〜5問・single/multiple混在のビルド時チェックを追加
- localizedStringList ファクトリでbackgroundスキーマを共通化
- 未使用の scenarioById エクスポートを削除
反映後に pnpm test（44）/ test:e2e（43）/ build すべて exit 0 を再確認。

---

## Maintenance: Dependabot

### Plan

- [x] Root pnpm project用のDependabot設定を追加する。
- [x] GitHub側の脆弱性アラートとセキュリティ更新を有効化する。
- [ ] 設定をPRとして作成し、レビュー後にmainへマージする。

### Configuration

- npm ecosystemでルートの`package.json`と`pnpm-lock.yaml`を対象に、毎週月曜09:00（Asia/Tokyo）にバージョン更新を確認する。
- production/developmentのminor・patch更新は別々にグループ化し、major更新は個別PRにする。version update PRは最大5件に制限する。
- セキュリティ更新はグループ化・上限制限の対象外とし、脆弱性検出時に個別・即時で作成する。自動マージは有効化しない。
