# 伴走学習フィードバック F-1〜F-8 の実装（完了・PR #72）

出典は `tasks/agent-study-feedback.md`（実際の伴走学習で踏んだ摩擦の記録）。
**何をどう作ったかの唯一の正は `DESIGN.md` §Study companion affordances。**
このファイルに残すのは、そこから復元できない「作業上の判断」だけにしてある。

実装順は「学習者価値 ÷ コスト ÷ リスク」: F-7 → F-6-1 → F-1 → F-4/F-5 → F-3 → F-8 → F-2。
表示のみで最も安いものから、最もデータ破壊リスクの高い import マージを最後に置いた。

## Constraints（制約台帳）

| Constraint | Source | Verify by |
| --- | --- | --- |
| 合否・準備完了度・点数を示唆しない | AGENTS.md 絶対的制約 | 追加文言を grep |
| 学習内容・進捗を外部送信しない | AGENTS.md 絶対的制約 | 追加コードに fetch/XHR/beacon が無いこと |
| 永続化 content ID とストレージスキーマは互換性契約 | AGENTS.md | v3 のまま。新規は任意フィールド or 別キー |
| 依存追加は既存スタックで満たせない場合のみ | AGENTS.md | package.json 差分ゼロ |
| 文言は `src/i18n/ui.ts` に ja/en 両方。JSX 直書き禁止 | src/AGENTS.md | 追加 JSX に文字列リテラルが無いこと |
| 色/font-size/`!important` の生値禁止・共有クラスから組む | src/AGENTS.md | `pnpm test:styles` |
| 初期バンドル予算を超えない | AGENTS.md | `pnpm test:bundle` |
| 仕様変更は同じ PR で `DESIGN.md` を更新 | AGENTS.md | DESIGN.md 差分あり |

## Assumptions（前提台帳・すべて VERIFIED）

| Assumption | Evidence |
| --- | --- |
| 模試は quiz と同じ `src/content/questions.ts` から出題する | `MockExamView.tsx` が `content/questions` を import |
| 模試は `quizStats` を書かない（書くのは quiz 回答のみ） | `quizStats` への書き込みは `App.tsx` の1箇所 |
| `parseStudyDataV3` は既知フィールドから組み直すので、StudyData 直下の任意フィールドは load 往復で消える | `storage-schema.ts` の `parseStudyDataV3` |
| `strictRecord` は値を参照のまま代入するので `QuizStat` の任意フィールドは parse を通過する | `storage-schema.ts` の `strictRecord` |
| ハンズオン合計480分 / 学習ガイド合計360分 | `hands-on.ts` / `study-guide.ts` の `estimatedMinutes` |

## Notes（作業上の判断・DESIGN.md から復元できないもの）

- **F-7 の項目2は実装不要だった**: ハンズオン一覧の所要時間表示は既に存在していた。ステージ合計のみ追加。
- **F-1 で App.tsx の静的 import を断念**: `check-initial-bundle.mjs` が `questions` を FORBIDDEN に持つ。
  content は動的 import にし、カード/ドメインは既に eager な軽量スパイン `cardIndex` / `domainIndex` を使った。
- **F-8 でハンズオンのステップ用 id を分離**: 素直な id はチェックボックスの id と衝突し、
  `tabIndex={-1}` をチェックボックスに付けるとキーボード操作から外れるため、外側 div に別 id を付けた。
- **F-2 で Playwright 3件を機械的に修正**: `window.confirm` 廃止に伴い `page.on('dialog')` を
  新ダイアログの「置き換える」クリックに置換（テストの意図＝完全置換は保持）。
- **未参照になった文言を削除**: `importConfirm`（confirm 廃止）、`examDateSaved`（成功時に通知しない設計へ変更）。

## Review

### 1巡目: `reviewer` エージェント（opus・フレッシュコンテキスト）

Critical / High **ゼロ**。ストレージ互換性契約・マージの冪等性・`reviewedAtMs` の逆算・
ディープリンクの入力検証・外部送信ゼロ・合否非示唆は、いずれも検証済みで問題なしと判定。

Medium 3（モーダルでない `aria-modal` → ネイティブ `<dialog>`、確信度ボタンのフォーカス消失 → `aria-pressed` で
出したまま、コピーボタンの同名量産 → sr-only 文脈ラベル + live region）と Low 5 をすべて修正。

### 2巡目: PR #72 への外部レビュー2件

| 指摘 | 対応 |
| --- | --- |
| ディープリンクがロード直後にターゲットを失う | 同一ビューにいる間は hash を保持。別ビューへ移ったときだけ更新 |
| Hands-on の guideId / stepId が別 state | 単一の atomic target に統合。guide 一致後にのみ step をフォーカス・消費 |
| 進捗マージが revision を見ていない | `prefersIncoming` で revision 優先、同 revision のみ `updatedAt` 比較 |
| `mergeMockExamAttempts` の sort が冪等性を壊す | sort を削除（表示側で既にソート済み） |
| 要約が `now` に追従しない | App の `now` に依存させ、1分ごとに再生成 |
| reset の examDate 削除失敗を無視 | 戻り値を見て `resetDonePartial` を通知 |
| 受験予定日の入力中にフォーカスが奪われる | 成功時に通知もフォーカス移動もしない。空文字では消さない |
| `parseDeepLink` の余剰セグメント処理が非対称 | ルートごとに `maxSegments` を持たせ、超過は null に統一 |
| `reviewedAtMs` が scheduler の定数を複製 | `DAY` / `AGAIN_DELAY_MS` を `scheduler.ts` から export して共有 |
| App の scrollTo と step の scrollIntoView が競合 | step ターゲット時は App 側の scrollTo を省略 |
| 確信度のリセットが `useEffect` で1フレーム遅れる | `{ index, value }` の derived state 化で effect ごと削除 |
| 新規インタラクション面に E2E が無い | 10件追加（マージ経路・ディープリンク5種・確信度2件・受験予定日） |
| App.tsx が肥大（655行） | 4 hook へ分離 + target を discriminated union 化 + dead `dataRef` 削除（450行） |
| コメント・テストが冗長 | 動機の物語を DESIGN.md へ一元化。テスト3ファイルを `it.each` で 1,107 → 644行 |

**対応しなかった指摘**: なし（Nit 含めすべて対応）。

### 3巡目: 再レビュー2件

| 指摘 | 対応 |
| --- | --- |
| 遅延ビューが target を消費する前に遷移すると古い target が残る | `navigate(view, target, scroll)` に統合し、ターゲット無し遷移では必ず null にする。`setTarget` → `navigate` の順序を全廃 |
| 同一 QuizView 内の deep link 切替で確信度が前問から残る | index ではなく `currentResult` のオブジェクト identity に紐付け |
| import の保存失敗で解析済みデータを破棄していた | 成功時とキャンセル時のみ破棄。失敗はダイアログ内に表示し、再試行できる |
| `<dialog>` の fallback が実際には表示されない | `showModal` が無い/throw した場合に `dialog.open = true` で表示 |
| CopyLinkButton の同じ結果が2回目以降アナウンスされない | クリックごとに live region を空にしてから結果を出す（`writeText` は user gesture 中に同期呼び出しのまま） |
| revision-aware マージで敗者の完了履歴が消える | 敗者の `completedAt` を勝者の `previousCompletedAt` へ引き継ぐ（`isHandsOnProgress` の制約を満たす場合のみ） |
| `useStudySummary` が data 変更時に無効化しない | 前回の data を ref で保持し、data が変わったときだけ無効化。`now` の tick では維持 |

**方針が衝突した1点**: 1人目は「`navigate` で target をクリアする」、2人目は「`navigate` ではクリアするな（`setTarget` → `navigate` の順序が壊れる）」。
1人目の atomic な `navigate(view, target)` 設計を採用した。その設計では `setTarget` → `navigate` の順序自体が消えるため、2人目の懸念は発生しない。

### 4巡目: 再々レビュー

| 指摘 | 対応 |
| --- | --- |
| 新しい回答に前回の `lastConfidence` が引き継がれる | `recordQuizAnswer` で引き継ぎをやめキーごと省略。`guessedCorrect` は累積カウンタなので維持 |
| `previousCompletedAt` が revision を2段階以上またぐと消える | 敗者が `in_progress` の場合はその `previousCompletedAt` も候補にする。`reconfirmHandsOnGuide` の契約に揃えた |
| 確信度の同期二重発火を state だけでは防げない | `currentResult` の identity をキーにした `useRef` の同期ガードを追加（回答側の `answeredIdRef` と同じ考え方）。保存失敗時は ref を戻して再試行可能 |
| `useStudySummary` の無効化に1 render の遅延がある | state を `{ data, text }` にし、`built.data === data` のときだけ text を返す。data が変わった render で即座に null になり、`now` の tick ではチラつかない |

### 検証（最終・すべて exit 0）

| コマンド | 結果 |
| --- | --- |
| `pnpm test` | 626 passed |
| `pnpm build` | 0 errors / 0 warnings |
| `pnpm test:e2e` | 147 passed |
| `pnpm test:styles` / `test:bundle` / `test:no-analytics` | OK |

### 委譲についての記録

4巡目の一部を `codex-luna`（GPT-5.6 Luna / `codex exec`）へ委譲した。トークンは節約できたが、
**2回のインシデントが起きたので、委譲後の diff 検証は省略できない**:

1. 1回目: 範囲外のファイル（`tasks/todo.md` 末尾・`notes.md`・`task_plan.md`）へ作業ログを書き込んだ → `git checkout` で復元
2. 2回目: **直前のバッチで入れた修正2件を巻き戻した**（`mergeHandsOnRecord` の multi-revision 対応と
   `useStudySummary` の identity 化が消え、テストが 628 → 623 に減っていた）→ 手作業で再適用
   （報告のテスト件数が前回より減っていたことで検知した）
