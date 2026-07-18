# 選択式演習モード（quiz view）実装プラン

Branch: `feat/choice-quiz`（origin/main = 44cf2b5 から分岐）

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| ChoiceQuestion 型に scenarioId? を予約フィールドとして定義 | user msg | types.ts diff |
| 問題は最低20問・ドメイン重み概比例・multiple 3割以上・ja/en 両方 | user msg | content.test.ts のアサーション |
| 誤答選択肢は「ありがちな誤解」ベースの完全独自作成。実試験問題/公式サンプル/Exam Guide転載は禁止 | user msg + cards.ts 方針 | 目視レビュー |
| storage は version 1 のまま quizStats? を後方互換追加。旧データ正常ロード、export に自然に含む | user msg | storage.test.ts |
| View 'quiz' 追加でナビ5項目。既存a11y水準維持（semantic/aria-live/44px/キーボード） | user msg | e2e + axe |
| e2e に演習フローを追加 | user msg | pnpm test:e2e |
| 見出し文字が subset に無ければ pnpm build && pnpm fonts:subset で再生成しコミット | README + user msg | pnpm test |
| コミット末尾 Co-Authored-By / PR末尾 Generated with | user msg | git log / PR body |
| 「合格保証」「本試験を再現」を示唆する文言禁止 | user msg | 文言レビュー |
| App.tsx / ui.ts は別セッションが並行編集中 → コンフリクト時は相手を理解して rebase | user msg | マージ時 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| HEAD は origin/main と同一 | VERIFIED | 両方 44cf2b5 |
| フォントテストは ui.ts の display 用文言リストを手動列挙 → quiz.title 追加が必要 | VERIFIED | src/lib/fonts.test.ts:9-22 |
| bottom-nav は repeat(4,1fr) 固定 → 5 に変更必要 | VERIFIED | global.css:634 |
| Playwright getByRole name は部分一致だが「練習」と「演習」は非干渉 | VERIFIED | 文字列比較 |
| validateContent() の戻り値は content.test.ts で完全一致比較 → questionCount 追加時にテストも更新 | VERIFIED | content.test.ts:9-14 |

## 問題配分（計21問 / multiple 7問 = 33%）

- D1 (27%): 6問（うち multiple 2）
- D2 (18%): 4問（うち multiple 1）
- D3 (20%): 4問（うち multiple 2）
- D4 (20%): 4問（うち multiple 1）
- D5 (15%): 3問（うち multiple 1）

## TODO

- [x] 1. types.ts に ChoiceQuestion 追加（scenarioId? 予約含む）— verify: pnpm build (astro check) パス
- [x] 2. questions.ts 新規作成（21問、cards.ts の helper スタイル踏襲）— verify: pnpm test 37 passed
- [x] 3. validate.ts 拡張（zod schema / ID重複 / correctChoiceIds⊆choices / format整合 / source実在）— verify: pnpm test 37 passed
- [x] 4. content.test.ts 拡張（questionCount、配分±6pt、multiple≥30%、ja/en 非空、scenarioId未使用）— verify: pnpm test 37 passed
- [x] 5. storage.ts に quizStats? 追加 + load 検証 — verify: pnpm test 37 passed
- [x] 6. storage.test.ts にケース追加（round-trip / 不正エントリ破棄 / 旧データロード）— verify: pnpm test 37 passed
- [x] 7. src/lib/quiz.ts 新規（出題選択・重み加重・採点）+ quiz.test.ts（8件）— verify: pnpm test 37 passed
- [x] 8. ui.ts に View 'quiz' + quiz copy（ja/en）— verify: pnpm build パス
- [x] 9. App.tsx に QuizView（setup → question → summary、role=status、quizStats 保存）— verify: e2e 40 passed
- [x] 10. global.css に quiz スタイル + bottom-nav 5列 — verify: e2e overflow tests パス
- [x] 11. fonts.test.ts に quiz.title 追加、subset 再生成（選・択・演を追加、633字）— verify: pnpm test 37 passed
- [x] 12. tests/app.spec.ts に演習フロー e2e 追加（フィードバック・サマリ・localStorage・axe）— verify: pnpm test:e2e 40 passed
- [x] 13. DESIGN.md スコープ節更新 + README 追記 — verify: 「再現ではない」文言を両方に明記
- [x] 14. pnpm test / test:e2e / build 全パス — verify: 37 unit / 40 e2e / build exit 0
- [x] 15. commit / push / PR 作成 — verify: https://github.com/toshi0607/cca-study-guide/pull/12（CI: Vercel / lighthouse 全パス）

## Notes

- saveRating が `{ version: 1, reviews }` を新規作成して quizStats を落とすバグを併せて修正（`{ ...data, reviews }` に変更）。quizStats 追加に伴う必須の随伴修正。
- 領域別サマリの右端表示は既存 progress ビューと同じ `n/m` 形式に統一（モバイルの 48px 列で溢れないため）。ui.ts の domainScore コピーは不要になり削除。
- 検証で correctChoiceIds が choices 全件と一致する問題（全選択肢が正解）を禁止するルールを追加（仕様外だが問題品質の下限として妥当と判断）。
- ブラウザペインでの目視確認中、スクロール後のスクリーンショットのみ白画面になったが、DOM 検査（elementFromPoint / getBoundingClientRect）でレンダリング正常を確認。キャプチャ側の不具合であり、実 Chromium の e2e は全パス。

## Review

/code-review high（8観点ファインダー→検証）の結果と対応:

| Finding | Verdict | 対応 |
|---------|---------|------|
| QuizView.answer() に同期的な再入ガードが無く、再レンダー前の二重クリックで同一問題を二重記録 | PLAUSIBLE | **修正**: answeredIdRef による同期ガードを追加（start でリセット）。全テスト再パス |
| recordQuizAnswer の stale closure で二重呼び出し時に attempts を過少記録 | PLAUSIBLE | 上記ガードで発火経路が閉じることを検証済み（二重呼び出しは answer() 経由のみ）。追加変更なし |
| recordQuizAnswer が saveRating の save→失敗通知スケルトンを複製 | CONFIRMED | 見送り: 2箇所・挙動同一。ヘルパー抽出は弱点可視化PRとのコンフリクト面を増やすため保留 |
| .quiz-start 等の CSS が既存プライマリボタン定義を複製 | CONFIRMED | 見送り: 既存セレクタへの合流は .data-actions button に flex を波及させるため非drop-in。現状維持 |
| localized() ヘルパーが3ファイル目の複製 | CONFIRMED | 見送り: cards.ts / domains.ts の既存パターンに合わせた意図的な踏襲。まとめて types.ts へ移す改善は別PR向き |
| View 型が App.tsx と ui.ts で二重定義 | PLAUSIBLE | 見送り: 既存構造の踏襲。共有型化は並行実装中の弱点可視化とぶつかるため別PR向き |

---

# 想起カード拡充（コンテンツ追加のみ）— 2026-07-17〜18

Branch: `claude/mystifying-heyrovsky-a4464f`（origin/main = 44cf2b5 から分岐、PR #13）

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 各objectiveが合計2枚以上でカバー | user msg | 集計で全30 objective >= 2 |
| 約30枚追加、D1最優先→重み順 | user msg | 追加枚数とドメイン別内訳 |
| kind 3種のバランス、contrast重視 | user msg | kind別集計 |
| ja/en 4フィールド全記述 | user msg | pnpm test (zod) |
| sourceIds実在、新規ソースはWebFetch確認 | user msg | pnpm test + validate.ts |
| 新規ソースは platform.claude.com / code.claude.com / modelcontextprotocol.io 配下のみ | user msg | sources.ts diff |
| 全主張を公式Docsで裏取り（記憶で書かない） | user msg | Notesのfetch記録 |
| 試験問題の複製・再構成禁止 | user msg / cards.ts冒頭 | 独自作成のみ |
| 既存カード改変禁止 | user msg | git diff がカード追加+sources追加のみ |
| UI・型・スケジューラ変更禁止 | user msg | git diff 対象ファイル |
| pnpm test / test:e2e / build 全パス | user msg | exit 0 |

## 結果

- [x] cards.ts へ35枚追加（D1:8, D2:7, D3:7, D4:7, D5:6、16→51枚。kind: recall16/contrast15/scenario20）
- [x] 全30 objective >= 2 カバレッジを一時vitestで機械確認
- [x] sources.ts へ define-tools を追加（verifiedAt=2026-07-18、WebFetchで実在・内容確認）
- [x] pnpm test 22/22 / pnpm test:e2e 39/39 / pnpm build 0 errors（マージ前時点）
- [x] PR #13 作成、Vercelチェック全pass

## Notes

- WebFetchで裏取りしたページ（2026-07-17〜18）: stop-reasons / how-tool-use-works / subagents / sessions / hooks-guide / agent-sdk claude-code-features / mcp / memory / agent-sdk skills / how-claude-code-works / best-practices / headless / develop-tests(evals) / claude-prompting-best-practices / structured-outputs / batch-processing / context-windows / context-editing / user-input / large-codebases / features-overview / MCP spec tools / define-tools。
- 逸脱1: 新規カードのverifiedAtを実際の検証日(2026-07-18)にするため、card()ヘルパーへ省略可能なverifiedAt引数を追加（既定値VERIFIED_ATで既存カードのデータは無変更）。
- 逸脱2: tests/app.spec.ts の2件がカード総数(16枚時代)をハードコードしており失敗（practice一覧15→16枚、進捗「1/4」）。期待値をsrc/content/cards.tsから導出する形に更新。アプリ側は非変更。
- フォントサブセット再生成は不要: .card-prompt h3 は--display非対象（subset-fonts.mjsの抽出対象はh2/wordmarkのみ）。
- 既存カードの誤りは発見なし。
- マージ時: main側のPR #12（quiz view）とコンフリクトは tasks/todo.md のみ。main版を採用し本セクションを追記。tests/app.spec.ts は自動マージ（quizテストと共存）。
