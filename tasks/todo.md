# 伴走学習フィードバック F-1〜F-8 の実装

出典: `tasks/agent-study-feedback.md`（実際の伴走学習で踏んだ摩擦のみを記録したメモ）。
8項目を「学習者価値 ÷ コスト ÷ リスク」で並べ替えて順に実装する。

## 優先順位と理由

| 順 | 項目 | 理由 |
| --- | --- | --- |
| 1 | F-7 ステージ所要時間の表示 | 既存 `estimatedMinutes` を合計するだけ。表示のみで最安 |
| 2 | F-6-1 模試の既回答問題数の表示 | `quizStats` の読み取りのみ。ストレージ変更なし |
| 3 | F-1 学習状況の要約コピー | 読み取り + クリップボードのみ。メモ自身の摩擦 #1 |
| 4 | F-4 + F-5 確信度・部分正答 | どちらも `QuizStat` の任意フィールド追加 + 回答記録経路。同時にやる |
| 5 | F-3 受験予定日と残り日数 | 別 localStorage キー。StudyData 契約に触れない |
| 6 | F-8 hash ディープリンク | UI 面は広いがストレージ risk なし |
| 7 | F-2 import マージ | 最もデータ破壊リスクが高いので最後 |

## Constraints（制約台帳）

| Constraint | Source | Verify by |
| --- | --- | --- |
| 合否・準備完了度・点数を示唆しない | AGENTS.md 絶対的制約 | 追加文言に「十分/不足/準備完了/合格」等が無いことを grep |
| 学習内容・進捗を外部送信しない | AGENTS.md 絶対的制約 | 追加コードに fetch/XHR/beacon が無いこと |
| 永続化 content ID とストレージスキーマは互換性契約 | AGENTS.md | v3 のまま。新規は任意フィールド or 別キー |
| 依存追加は既存スタックで満たせない場合のみ | AGENTS.md | package.json 差分ゼロ |
| 文言は `src/i18n/ui.ts` に ja/en 両方。JSX 直書き禁止 | src/AGENTS.md | 追加 JSX に日本語リテラルが無いこと |
| 色/font-size/`!important` の生値禁止・共有クラスから組む | src/AGENTS.md | `pnpm test:styles` |
| 初期バンドル予算を超えない | AGENTS.md | `pnpm test:bundle` |
| 仕様変更は同じ PR で `DESIGN.md` を更新 | AGENTS.md | DESIGN.md 差分あり |

## Assumptions（前提台帳）

| Assumption | Status | Evidence |
| --- | --- | --- |
| 模試は quiz と同じ `src/content/questions.ts` のバンクから出題する | VERIFIED | `src/components/mock-exam/MockExamView.tsx:2` が `content/questions` を import |
| 模試は `quizStats` を書かない（書くのは quiz 回答のみ） | VERIFIED | `quizStats` への書き込みは `src/components/App.tsx:139-141` の1箇所のみ |
| `parseStudyDataV3` は既知フィールドから新オブジェクトを組み直すので、StudyData 直下に足した任意フィールドは load 往復で消える | VERIFIED | `src/lib/storage-schema.ts:185-200` |
| `strictRecord` は値を参照のまま代入するので、`QuizStat` の任意フィールドは parse を通過する | VERIFIED | `src/lib/storage-schema.ts:146-154` |
| ステージ3ハンズオンの合計は480分 | VERIFIED | `src/content/hands-on.ts` の 120+90+120+150 |
| 学習ガイド8セクションの合計は360分 | VERIFIED | `src/content/study-guide.ts` の 45+40+55+35+50+55+35+45 |

## メモからの意図的な逸脱

- **F-2 `quizStats` のマージ**: メモは「回答数・正答数を単純加算」とするが、加算は冪等でない
  （同じファイルを2回 import すると倍になる。祖先を共有する2台でも二重計上になる）。
  代わりに **回数フィールドは両者の最大値**、「最後に答えた事実」（`lastAnsweredAt` / `lastCorrect` /
  `lastConfidence`）は `lastAnsweredAt` が新しい側からまとめて採る。冪等で水増しが起きない。
- **`reviews` の新旧判定**: メモは `dueAt` の比較を提案するが、`dueAt` は新しさの代理にならない
  （`again` は10分後、`good` は数日後に due が来るので、直近の `again` より古い `good` が勝ってしまう）。
  `scheduleReview` を逆算して実レビュー時刻を復元し、それで比較する。
- **`hands-on` の完了ステップは和集合**（メモに規定なし）。「PCでステップ1-3、スマホで4-5」が
  この機能の想定ケースそのものなので、新しい方の status を採りつつステップは合流させる。
- `mock-exam attempts` はメモ通り attempt ID の和集合。

## タスク

### F-7 学習パスのステージ所要時間
- [x] `src/lib/stage-cost.ts`（純関数）+ テスト。完了条件: `pnpm test` 緑
- [x] 学習パス各ステージとハンズオン一覧に所要時間表示。完了条件: `pnpm build` exit 0 / `pnpm test:styles` 緑

### F-6-1 模試の既回答問題数
- [x] 模試開始画面に「60問中N問は演習で回答済み」を事実のみ表示。完了条件: `pnpm test` + `pnpm build`

### F-1 学習状況の要約コピー
- [x] 要約テキスト生成の純関数 + テスト
- [x] 進捗ビューにコピーボタン（クリップボードのみ・外部送信なし）

### F-4 / F-5 確信度と部分正答
- [x] `QuizStat` に任意フィールド追加（`lastConfidence` / `guessedCorrect` / `partial`）+ バリデータ拡張 + テスト
- [x] `quiz.ts` に正答/部分正答/誤答の純粋分類関数 + テスト
- [x] 回答後 UI に確信度3ボタン（スキップ可）
- [x] 弱点ビューで「惜しい」と「未理解」を分けて出す

### F-3 受験予定日
- [x] 別 localStorage キーの読み書き + バリデータ + テスト
- [x] 進捗ビューに入力、今日ビューに「残りN日」、学習ガイドに「未消化M分 / 推奨順の次セクション」
      （未消化分数を今日ビューに出すと `content/study-guide` が初期バンドルに入るため、ガイド側に置いた）

### F-8 hash ディープリンク
- [x] hash ⇄ ビュー/ターゲット ID の相互変換の純関数 + テスト
- [x] App で hash 読み書き、各詳細画面に「リンクをコピー」

### F-2 import マージ
- [x] マージ純関数（reviews / quizStats / attempts）+ テスト
- [x] import 時に「置き換える / 統合する」を選ぶダイアログ

### 仕上げ
- [x] `DESIGN.md` 更新、`tasks/agent-study-feedback.md` の状態行を更新
- [x] `pnpm test`(614) / `pnpm build`(0 errors) / `pnpm test:e2e`(131 passed) / `pnpm test:styles` / `pnpm test:bundle` / `pnpm test:no-analytics` すべて緑
- [x] マージ前レビュー（`reviewer` エージェント / opus・フレッシュコンテキスト）: Critical / High ゼロ、Medium 3・Low 5 を指摘 → 下記で対応済み
      （`/code-review` はこのセッションで利用可能なスキル一覧に無いため `reviewer` エージェントで代替した）

## Notes（逸脱記録）

- **F-7 の項目2は実装不要だった**: ハンズオン一覧の所要時間表示は既に存在していた（`src/components/views/HandsOnView.tsx:182`）。ステージ合計の表示のみ追加した。
- **F-1 で App.tsx の静的 import を断念**: `scripts/check-initial-bundle.mjs` が `questions` を FORBIDDEN チャンクとして持っているため、`content/questions` などは動的 import にし、カード/ドメインは既に eager な軽量スパイン `cardIndex` / `domainIndex` を使った。
- **F-1 のクリップボード書き込みを事前計算に変更**: `await import()` を挟むと Safari / iOS でユーザー操作の有効期間を使い切って `writeText` が失敗する。進捗ビューが開いている間に要約を先に組み立て、クリックは同期的に書き込むだけにした。
- **F-8 の hash 反映を「既に hash がある場合のみ」に限定**: 通常のビュー切り替えでも `replaceState` すると、リロードで Today に戻るという既存の E2E 契約（`chunk-failure.spec.ts` / `mock-exam.spec.ts`）が壊れた。ディープリンクで入ったセッションだけ URL を同期する。
- **F-8 でハンズオンのステップ ID を分離**: 指定された id テンプレートは既存のチェックボックスの id と衝突し、`tabIndex={-1}` をチェックボックスに付けるとキーボード操作から外れてしまうため、ステップの外側 div に別 id を付けた。
- **F-2 のマージ規則をメモから逸脱**: 単純加算は冪等でないため、回数は最大値・レビューは実レビュー時刻の新しい方・ステップは和集合・attempt は id の和集合にした（上の「メモからの意図的な逸脱」節）。
- **F-2 で Playwright 3件を機械的に修正**: `window.confirm` を廃止したため、`page.on('dialog')` を新ダイアログの「置き換える」ボタンのクリックに置き換えた（テストの意図＝完全置換は保持）。
- **`importConfirm` の文言を削除**: `window.confirm` の廃止で参照ゼロになったため（grep 確認済み）。

## Review

F-1〜F-8 をすべて実装。設計の記録は `DESIGN.md` §Study companion affordances、経緯は `tasks/agent-study-feedback.md` の各状態行。

### レビュー指摘とその対応（reviewer / opus・フレッシュコンテキスト）

Critical / High: **ゼロ**。ストレージ互換性契約・マージの冪等性・`reviewedAtMs` の逆算・ディープリンクの入力検証・
外部送信ゼロ・合否非示唆は、いずれも検証済みで問題なしと判定された。

| # | 指摘 | 対応 |
| --- | --- | --- |
| M1 | `ImportChoiceDialog` が `aria-modal="true"` を名乗るのに実際はモーダルでない。背後で Quiz に回答してから「置き換える」を押すと、その回答が黙って消える | ネイティブ `<dialog>` + `showModal()` に変更。フォーカストラップ・inert な背景・Escape をプラットフォームから得る |
| M2 | 確信度ボタンが押下と同時にアンマウントされ、キーボードフォーカスが `<body>` に落ちる。記録も読み上げられない | ボタンを出したまま `aria-pressed` で押下状態を示し、再押下は無視。確認文は既存の live region（`quiz-feedback`）内に置く |
| M3 | 「リンクをコピー」ボタンが全て同一のアクセシブル名で数十個並ぶ。失敗時に何も起きない | `label` プロップで sr-only の文脈（カード ID・ガイド名・ステップ名・セクション名）を付与。成功/失敗を隣接 `role="status"` で通知し、`copyFailed` 文言を追加 |
| L1 | `todo.md` の記述が実装位置とずれていた | 記述を修正（未消化分数はガイド側。今日ビューに置くと `content/study-guide` が初期バンドルに入る） |
| L2 | 「60問のうちN問」の分母を定数から取っており、将来バンクを拡張すると文が破綻する | 数えた母集合（`questions.length`）を `answeredTotal` として渡し、文が常に自己整合するようにした |
| L3 | reset が受験予定日を残すが、確認文は「すべて削除」と言っている | reset で受験予定日も消すようにし、`DESIGN.md` に明記 |
| L4 | 進捗ビューを離れて戻った直後、古い要約がコピーされうる | ビュー遷移時に `summaryText` を null にし、その瞬間は「コピーできませんでした」を出す |
| L5 | `DESIGN.md` と `stageMinutesNote` の記述が不正確（`start` の記載漏れ、模試の120分はコンテンツ合計ではなく試験時間） | 両方を修正 |

### 検証（すべて exit 0）

| コマンド | 結果 |
| --- | --- |
| `pnpm test` | 29ファイル / 614テスト passed |
| `pnpm build` | 0 errors |
| `pnpm test:e2e` | 131 passed（初回 1件 timeout フレーク → 単独再実行で成功、修正後の全体再実行で 131/131） |
| `pnpm test:styles` | OK |
| `pnpm test:bundle` | OK（14 eager chunks, none forbidden） |
| `pnpm test:no-analytics` | OK |
