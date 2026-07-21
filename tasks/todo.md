# Task: App.tsx の責務分割 (PR1)

Branch: claude/app-tsx-refactor-e3a7fb

前回のtasks/todo.md(Remotion動画PR)は完了・無関係のため本内容に置き換え。承認済みプラン: `/Users/toshi0607/.claude/plans/cozy-growing-glacier.md`

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| ユーザーから見える挙動(文言/レイアウト/CSS/デザイン/ナビ項目/復習アルゴリズム/採点/即時フィードバック/シナリオ進行)を変更しない | user msg | 手動確認 + Playwright全緑 |
| `STORAGE_KEY`/`StudyData.version`/`ReviewState`/`QuizStat`型を変更しない | user msg | `src/lib/storage.ts` diff 0行 |
| export/import形式・resetの挙動を変更しない | user msg | storage.test.ts全緑 + import/export E2E緑 |
| 日英表示・言語切替・locale依存フォーマット・aria-labelを変更しない | user msg | ロケールE2E緑 + i18n/*無変更 |
| 学習データをGA等へ送信しない(現状維持) | user msg | check-no-analytics.mjs緑 + lib/analytics.ts無変更 |
| 新機能を実装しない | user msg | src/content/*無変更 |
| 新しいnpm dependencyを追加しない | user msg | package.json diff 0行 |
| src/content/*, src/i18n/*, src/lib/* は移動・変更しない | user msg | 各diff 0行(import追加のみ許容) |
| CSS classは維持、DOM構造の大幅変更を避ける | user msg | 既存Playwright selectorが緑のまま |
| import順/formatのみの大量差分・無関係ファイル整形をしない | user msg | diffの範囲を分割対象のみに限定 |
| pnpm test / build / test:e2e / (該当時)test:no-analytics が成功 | user msg | exit code 0 |
| 抽出単位ごとに小さく変更し都度確認 | user msg | 各Stepでtsc/test確認 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| App.tsxの呼び出し元はsrc/pages/index.astroとsrc/pages/en/index.astroのみ | VERIFIED | grep結果2件、共にdefault import |
| ファイル分割はPreact islandの単一バンドルのためLighthouse予算に影響しない | VERIFIED | `pnpm build`後の`dist/_astro/`確認: コンポーネント17ファイルに分割後もJSは単一の`App.[hash].js`(217,802 bytes)のみで、チャンク分割は発生していない |
| tests/app.spec.ts(490行)が既存挙動を広くカバーしている | VERIFIED | 全文精読済み |
| vitestはnode環境でDOM非依存、分割の影響を受けない | VERIFIED | vitest.config.ts:5 |
| pnpm install後の現状ベースラインが全緑かどうか | VERIFIED | Step 1で確認: `node_modules`が`package.json`と不一致(vitest実体3.2.7 vs 指定^4.1.10等)だったため`pnpm install`で同期後、`pnpm test`(55 passed)/`pnpm build`(0 errors)/`pnpm test:e2e`(47 passed)/`pnpm test:no-analytics`(pass)すべて変更前の時点でグリーンと確認 |

## Plan

- [x] 1. ベースライン確認: pnpm test(55 passed) / pnpm build(0 errors) / pnpm test:e2e(47 passed)。node_modulesがpackage.jsonと不一致だったためpnpm installで同期
- [x] 2. 共有小コンポーネント抽出: LanguageNav → SourceLinks → Blueprint → AppNavigation(AppHeader/AppBottomNav)。都度astro check(0 errors)確認
- [x] 3. 低state View抽出: GuideView → TodayView → ProgressView
- [x] 4. Practice抽出: CardAnswer → PracticeSession → PracticeView
- [x] 5. Quiz抽出: ScenarioBackground → QuizSetup/QuizQuestion/QuizSummary → QuizView
- [x] 6. App.tsxを最終形に整理(782行 → 228行)
- [x] 7. 新規E2Eテスト2件追加(Practice離脱でsession終了 / rating保存失敗時にカードが進まない)
- [x] 8. 最終テスト: pnpm test(55 passed) / build(0 errors) / test:e2e(49 passed) / test:no-analytics(pass)
- [x] 9. 手動確認: 日本語/英語/mobile/practice一覧+session/quiz random+scenario/今日→練習遷移。すべてブラウザで目視確認、console error無し
- [x] 10. 完了報告作成(本ファイル + チャット報告)

## Notes

- state所有権の判断で計画時の想定を1点修正: `query`/`domainFilter`/`stateFilter`/`revealed`(一覧モード)/`sessionCards`はPracticeViewへ完全移管せずAppに残した。理由はplan file(B節)に記載の通り、View切替をまたいでこれらが保持される現状挙動を壊さないため
- 実装中に新規発見: `views/QuizView.tsx`(コンテナ)が`quiz/QuizQuestion.tsx`等をコンポーネントとしてimportする一方、`QuizResult`/`QuizMode`型を子から親へimportし返すと循環参照になることが判明。計画にはなかった`src/components/quiz/types.ts`を追加してこれらの型の単一の置き場所とし、循環を回避した(No circular dependenciesルール準拠)
- `node_modules`が`package.json`/lockfileと不一致(vitest 3.2.7 実体 vs ^4.1.10 指定)だったため、Step 1で`pnpm install`を実行して同期。既存の依存関係更新PR(#18-22)の内容そのもので、本PRの変更ではない
- ブラウザでの手動確認中、`computer`ツールのkey送信がPracticeSessionのdocumentレベルkeydownリスナーに届かない(event.key不一致と推測されるツール側の制約)ことを確認したが、変更していない既存コードであり、Playwright E2E(「drives a session with keyboard shortcuts」)が正確にこの経路を検証し緑であることを確認した
- `.claude/launch.json`をブラウザプレビュー用に一時作成したが、本PRのスコープ外のため作業完了後に削除した

## Review

### セルフクイズ(unknowns.md 3.1)

1. **最もリスクの高い行は何故安全か**: `App.tsx`の`query`/`domainFilter`/`stateFilter`/`revealed`/`sessionCards`をPracticeViewへcontrolled propsとして渡す変更。安全な理由: これらの値の「所有」はAppのままで、PracticeViewは受け取った値と setter を right通りに使うだけの薄いラッパーであり、状態遷移ロジック自体(persistRating/saveRating/navigate)を一切変更していないため。ブラウザ手動確認でView切替後もフィルタ・検索語・開示状態が保持されることを確認済み(VERIFIED)
2. **何が壊れるか、テストしたか**: (a) View離脱時のsession終了 → 新規E2Eで検証しGreen。(b) rating保存失敗時にセッションが進まない → 新規E2Eで検証しGreen。(c) list/session二経路の取り違え(saveRating vs persistRating) → props名を`onRateInList`/`onRateInSession`で明示的に分離し、E2Eの両経路(list rating・session rating)がともにGreen
3. **テストしなかったもの**: Quiz回答二重記録防止(`answeredIdRef`)の直接テスト、`studyStorage()`の`window.localStorage`アクセス自体が例外を投げるケース。どちらも本PR以前から未テストで、`answer()`/`studyStorage()`のロジックは一切変更せず単純移動のみのため、回帰リスクは低いと判断(残課題に記載)
4. **plan/Assumptionと矛盾する点はないか**: なし。B節の状態所有権表どおりに実装し、Constraints(`src/lib`/`src/i18n`/`src/content`無変更、新規依存なし等)はすべて`git diff --stat`で確認済み

### 元の依頼の再確認

ユーザー依頼(App.tsxの責務分割、挙動変更なし、新機能なし)を文字通り実行。View/機能別の16ファイルへ分割し、`App.tsx`は現在View・StudyData正本・グローバル通知・永続化callback・View間遷移のみを持つ構造に整理した。
