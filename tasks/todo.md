# MCP サーバー構築 (mcp/) — 作業計画

目的は二層: (1) MCP 仕様 2026-07-28 の理解 — FDE 論点 B3/B4・CCA Domain 2、
(2) タチコマ study session の効率化。経緯はこのファイルと `mcp/PRD.md` が正。

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| Anthropic 非公式表記を消さない・弱めない | AGENTS.md | 変更ファイルに該当表記なしを確認 |
| 実試験問題・公式スコア・合否示唆を出さない | AGENTS.md | ツール契約レビュー（正答数報告のみ） |
| 学習内容・進捗を外部送信しない（stdio ローカルのみ） | AGENTS.md | ネットワーク呼び出しゼロを grep で確認 |
| content ID・storage schema (StudyDataV3) は互換性契約 | AGENTS.md | mcp/ は読み取り + 既存スキーマ準拠の import JSON 生成のみ |
| 依存追加は既存スタックで満たせない場合のみ → MCP SDK は mcp/ に隔離 | AGENTS.md | ルート package.json 無変更、`pnpm test:bundle` green |
| アプリのビルド・CI に影響させない（video/ と同型） | user 方針 | `pnpm build` / 既存 CI 無変更で green |
| 進捗の正は localStorage。サーバーは export JSON 経由でのみ読み書き | user 回答 (2026-08-16) | サーバーに独自進捗ストアがないこと |
| SDK は v2 系 (@modelcontextprotocol/server 2.0.0, spec 2026-07-28) | user 回答 (2026-08-16) | package.json + 接続検証 |
| 各フェーズで CCA Domain 2 / FDE 論点との対応を学習ノートに残す | user 依頼 | 学習ノートのマッピング表 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| Claude Code は spec 2026-07-28 (v2 SDK) サーバーに接続できる | UNVERIFIED-ACCEPTED (2026-08-16) | 外形からは検証不能（検証行為そのものが Phase 3 の最小サーバー + `claude mcp add`）。受容が安全な理由: Phase 3 より前に本仮定へ依存する成果物はなく（Phase 2 のツール契約は SDK 非依存の粒度で書く）、棄却時は v1 SDK (1.30.0) フォールバックを計画済みで差分は学習ノート化する |
| MCP サーバーが必要とする src モジュールは DOM 非依存で Node から import 可能 | VERIFIED | grep: `window`/`document` 使用は use-mock-exam.ts（Preact フック、サーバー不要）のみ。storage.ts は StorageLike 注入式。vitest.config.ts:5 が environment: 'node' で全 unit テストが Node 実行 |
| mcp/ を video/ 方式（独立パッケージ）にしても ../src の TS を import してビルドできる | VERIFIED | scratchpad から tsx 経由で scheduler/quiz/study-data-merge/cards/questions を import 実行し成功（cards 51・questions 60、scheduleReview('good')→+3日）。ただし素の Node type-stripping は不可（拡張子なし相対 import のため）→ mcp/ は tsx 等のローダー必須。対象モジュールの外部 npm 依存はゼロ（zod は validate.ts のみ、preact は UI フックのみ） |
| export JSON は StudyDataV3 スキーマ | VERIFIED | src/lib/storage.ts（buildStudyDataExport）、src/lib/storage-schema.ts |
| import merge では新しいセッション結果が既存進捗に勝つ（UC1 の書き戻しが no-op にならない） | VERIFIED | src/lib/study-data-merge.ts:33-43（reviewedAtMs が新しい側を採用）、同:50-65（quizStats は max + 新しい側の last*） |
| MCP の 3 プリミティブ tools/resources/prompts、client 側は deprecated | VERIFIED | modelcontextprotocol.io spec 2026-07-28 changelog（調査エージェント報告） |

## Phases

- [x] Phase 0: 調査（repo コンテンツ / MCP spec / FDE 論点リスト）— 3 エージェント報告受領 (2026-08-16)
- [x] Phase 1a: PRD ドラフト作成 — `mcp/PRD.md` (2026-08-16)
- [ ] Phase 1b: PRD 本人レビュー → 反映して確定
- [ ] Phase 2: 設計 doc — プリミティブ割当・ツール契約（名前/引数/エラー設計）・URI 設計。
      検証: 本人レビュー + Domain 2 objectives 2.1–2.5 との対応表が埋まる
- [ ] Phase 3: scaffold + 最小サーバー — mcp/ パッケージ、greet 級ツール1つ。
      検証: MCP Inspector で呼べる + `claude mcp add` で Claude Code から呼べる（Assumption A1 判定）
- [ ] Phase 4: 本実装 — tools / resources / prompts + vitest。
      検証: `pnpm --dir mcp test` green + UC1–UC4 を Claude Code から実走
- [ ] Phase 5: 学習ノート + AGENTS.md 地図更新 + PR。
      検証: 既存 CI green、PR 作成

## Notes

- 2026-08-16: スマホ（練習カード）と PC（study session）で localStorage が分断している
  ペインを本人が報告。v1 は PC の export JSON を正とし、スマホ橋渡しは PRD の Roadmap 扱い。
- 2026-08-16: HTTP + OAuth 2.1 は実装せず学習ノートの論点に（FDE E 領域素材）。
- 2026-08-16: 設計制約 — サーバーが生成する import JSON の ReviewState は必ず
  src/lib/scheduler.ts の scheduleReview 実ロジックで作る。merge の勝敗判定
  （study-data-merge.ts の reviewedAtMs）が scheduleReview の遅延を逆算する前提のため、
  手組みの dueAt では衝突解決が壊れる。
- 2026-08-16: `claude mcp add --scope project` はリポジトリ直下に `.mcp.json` を書く。
  「アプリ本体への変更なし」制約の例外として明示的に許容（Domain 2.4 スコープ選定の
  学習素材でもある）。
- 2026-08-16: video/ の隔離方式を確認 — pnpm workspace ではなく独立 package.json +
  自前 pnpm-lock.yaml。mcp/ も同型を採用。
- 2026-08-16: import 実験の副産物 — src は拡張子なし相対 import のため素の Node
  （type stripping）では動かず、mcp/ の実行は tsx 等のローダー前提になる。Phase 3 の
  scaffold 判断（tsx を devDependency に）に直結。

## Review

（フェーズゲートの指摘と対応をここに記録）

---

# PR #73 レビュー指摘対応

2026-08-13 のレビュー指摘2件を、既存のsecurity boundaryを変えずに修正する。

## Plan

- [x] READMEのHyperFrames引数転送を再現する回帰テストを先に失敗させ、裸の`--`を除去する
- [x] CSP directive選択をexact matchにし、`script-src-elem`/`script-src-attr`を明示拒否するテストを追加する
- [x] GSAP SRI再計算手順とGoogle Fontsの残余ネットワーク依存を翻訳ノートに記録する
- [x] focused tests → `pnpm test` → `pnpm build` → `pnpm test:csp` → `pnpm test:no-analytics`を検証する
- [x] 独立reviewとsource-to-sink再追跡後、Review/decision logを記録する

## Decision log

- verifierのbounded concurrency化は現状の規模で実害がなく、失敗集計とrequest timingを変えるため今回のレビュー修正には含めない。
- Google Fontsは実行可能コードではなく、HyperFrames compile時の可用性/再現性リスクとして既知化する。セルフホスト化は別タスクとする。

## Review

- 修正前のfocused testは4件失敗し、READMEの裸`--`とCSPのprefix誤認を再現した。修正後はfocused 12件が成功。
- README記載コマンドへ`--help`を足して実行し、pnpm 10.30.3が`hyperframes render --quality high --output out/promo.mp4 --help`へ展開し、CLIが両flagを受理することを確認した。
- `script-src`はdirective名のcase-insensitive exact matchで取得し、`script-src-elem`/`script-src-attr`が存在すれば順序に関係なくfail closedする。
- CDN実レスポンスからGSAP SHA-384を再計算し、`index.html`のSRIと一致することを確認した。Google Fontsは非実行コンテンツの外部依存として既知化した。
- 検証: `pnpm test` 473件、`pnpm build`、`pnpm test:csp`、`pnpm test:no-analytics`、`git diff --check`が成功。独立reviewerは追加findingなし、push可と判定。

## main 統合（2026-08-13）

- [x] GitHub APIの `DIRTY`を remote OID で再検証し、`main` が PR #72 の merge まで進んだ実コンフリクトと確認
- [x] `origin/main` を merge し、PR #72 の受験予定日・要約コピー・import改善を保持しつつ Analytics 撤去を維持
- [x] `tasks/todo.md` に PR #72、セキュリティ対応、旧動画作業の全履歴を保存
- [x] 統合後の unit/build/CSP/no-analytics/styles/bundle/Playwright と独立reviewを完了
- [x] merge commit を push し、GitHub API で PR の conflict 解消を再確認

Decision: 既存PRへ force-push する rebase ではなく、最新 `main` の merge commit を作る。公開済みブランチ履歴を書き換えず、コンフリクト解決を1つの監査可能なコミットに限定するため。

Review: 統合後は `pnpm test` 625件、`pnpm build`、`pnpm test:csp`、`pnpm test:no-analytics`、`pnpm test:styles`、`pnpm test:bundle`、`pnpm test:e2e` 148件が成功。独立reviewerは履歴復元後にfindingなしと判定した。merge commit `c6c647b` push後、GitHub APIは base `5225765`、head `c6c647b`を認識し `mergeable: MERGEABLE`を返した。`mergeStateStatus: BLOCKED`は新しい CI と Vercel の pending による。

---

# Codex Security 指摘5件の修正

2026-08-09 の標準スキャン（5 low）を、共通原因ごとに3パッチへまとめて修正する。
設計と最終統合は root、実装は下位モデル worker が担当する。

## Patch contract

| Boundary | Broken control | Invariant / preserved behavior | Proof |
| --- | --- | --- | --- |
| Analytics | 外部 `gtag.js` が学習データと同一 origin で実行される。GA ID はデプロイ同一性から除外される | 学習データを外部コードから隔離する。静的サイト・サーバー秘密なしを維持 | analytics loader/egress が build から消えること、no-analytics/CSP テスト |
| Production verifier | production 自身の manifest を全ファイルの証明として信頼し、redirect を送信後に検査する | 実配信 byte をローカル manifest に照合し、各 redirect hop を送信前に HTTPS/host 検査する。正当な same-host redirect は維持 | 改ざん secondary asset と off-host redirect の失敗テスト、same-host redirect の成功テスト |
| `video-hf` dependencies | `npx --yes` と SRI なし CDN script が repository-bound integrity を持たない | 通常コマンドは frozen lockfile の local CLI を使い、CDN script byte を SRI で固定。動画本体と本番アプリの分離を維持 | lockfile、script 静的テスト、`hyperframes check` |

## Plan

- [x] 設計レビューで3パッチの境界・互換性・最小実装を確定
- [x] Analytics を撤去し、CSP・privacy/docs・関連テストを整合
- [x] Production verifier を実 byte 検証＋manual redirect に変更し、回帰テストを追加
- [x] `video-hf` を local pinned CLI＋lockfile＋GSAP SRI に変更し、機械チェックを追加
- [x] 変更を統合レビューし、指摘ごとの source-to-sink が閉じたことを再追跡
- [x] focused tests → unit/build/CSP/no-analytics → E2E fast の順に検証
- [x] Review・decision log・残余リスクを本ファイルへ記録

## Decision log

- Analytics は direct third-party script を残したまま localStorage を隔離できず、Measurement Protocol はサーバー秘密を要求して静的サイト制約に反するため、外部 analytics 実行を完全撤去した。
- verifier は production manifest を inventory としては使えるが、integrity の根拠にはしない。信頼する hash はローカル build manifest のみとする。
- `video-hf` の GSAP は vendoring ではなく exact-version CDN + SRI を使い、変更量を抑えつつ response byte を固定する。
- HTTP だけでは未知の追加公開パスを列挙できないため、verifier の `MATCH` は trusted local manifest inventory 全件の一致に限定して表現する。

## Review

- Codex Security の5 findingを3境界へ統合して修正。GA loader/egress/設定経路を撤去し、production verifierはlocal manifest全keyの実配信byteを検証、`video-hf`はexact local CLI・独立pnpm lock・GSAP SRIへ移行した。
- 独立reviewerはCritical/High/Mediumを検出せず。READMEに残った`npx`案内と、CSP guardがsha256以外の余剰能力を見逃すLow 2件を指摘し、いずれも機械テスト付きで修正した。
- 検証: focused security 21件、`pnpm test` 470件、`pnpm build`、CSP exact check、hostile legacy GA env付きno-analytics、`pnpm test:e2e:fast` 80件、styles、bundle、`video-hf` frozen install + `hyperframes check` が成功。
- 残余リスク: HTTP検証は未知の追加公開パスを証明できない。GSAP SRIは改ざんをfail closedにするがCDN可用性までは保証しない。full E2EはPR CI、Vercel edge headerとproduction smokeはdeploy後に確認する。

---

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

### 5巡目: 追加指摘

| 指摘 | 対応 |
| --- | --- |
| 別タブの新しい回答へ古い UI の確信度を誤って紐付ける | 回答トークン（保存時の `lastAnsweredAt`）を `QuizResult` に持たせ、`recordQuizConfidence` は canonical storage 再読込後にトークンが一致した場合だけ書く。不一致なら stat を一切変更せず `'stale'` を返し、UI が「別のタブで更新されていたため記録しませんでした」と通知する（再試行はさせない） |

`commitData` は「変更なし」と「保存失敗」を戻り値で区別できないため、stale の判定は
`commitData` の外のローカル変数で行い、`'saved' | 'stale' | 'failed'` の3値を返す形にした。
スキーマは変更していない（任意の answer id 新設は後方互換・validator・import/merge 規則へ波及するため見送り）。

### 検証（最終・すべて exit 0）

| コマンド | 結果 |
| --- | --- |
| `pnpm test` | 626 passed |
| `pnpm build` | 0 errors / 0 warnings |
| `pnpm test:e2e` | 148 passed |
| `pnpm test:styles` / `test:bundle` / `test:no-analytics` | OK |

### 委譲についての記録

4巡目の一部を `codex-luna`（GPT-5.6 Luna / `codex exec`）へ委譲した。トークンは節約できたが、
**2回のインシデントが起きたので、委譲後の diff 検証は省略できない**:

1. 1回目: 範囲外のファイル（`tasks/todo.md` 末尾・`notes.md`・`task_plan.md`）へ作業ログを書き込んだ → `git checkout` で復元
2. 2回目: **直前のバッチで入れた修正2件を巻き戻した**（`mergeHandsOnRecord` の multi-revision 対応と
   `useStudySummary` の identity 化が消え、テストが 628 → 623 に減っていた）→ 手作業で再適用
   （報告のテスト件数が前回より減っていたことで検知した）

---

# 告知動画の現行仕様更新（Remotion → HyperFrames 移植）

現行仕様を反映した告知動画を、既存 Remotion コンポジションを更新 → `remotion-to-hyperframes` スキルで HyperFrames HTML へ移植 → レンダリングして作る。

## Constraints（制約台帳）

| Constraint | Source | Verify by |
|------------|--------|-----------|
| video/ はアプリ本体のビルド・デプロイに影響させない | video/README.md | ルート package.json / src を変更しない |
| 「非公式・非提携」表記を維持 | README 方針・既存動画 | UnofficialBadge / クロージング文言が残る |
| 実試験問題・スコア・合否・準備完了度を出さない | README 方針 | 文言に点数/合否/pass を入れない |
| スクショは 1600×1000 viewport・2x | video/README.md | Playwright viewport 1600×1000 / DSF 2 |
| Remotion 元ソースは lint blocker を出さない | skill SKILL.md | scripts/lint_source.py がクリーン |
| 数値は現行仕様に一致（カード51・演習60・Mock 60問/120分・配点27/18/20/20/15） | src/content, src/lib | grep 済み（下記 Assumptions） |
| コミット/PR はユーザー指示があるまでしない | system default | 実施しない |

## Assumptions（前提台帳）

| Assumption | Status | Evidence |
|------------|--------|----------|
| 領域配点 27/18/20/20/15 は現行 | VERIFIED | src/content/card-index.ts:10 |
| 想起カード 51 枚 | VERIFIED | grep -c '^  card(' cards.ts = 51 |
| 演習/バンク 60 問 | VERIFIED | questions.ts = 60 |
| Mock Exam 60問/120分・配分16/11/12/12/9 | VERIFIED | mock-exam-blueprint.ts, mock-exam.test.ts:32 |
| ビューは React 状態切替（URLルーティング無し） | VERIFIED | App.tsx:47,205 |
| seedStorage + fullAttempt で analysis ビューに到達可 | VERIFIED | tests/mock-exam-analysis.spec.ts |
| 既存Remotion源に useState/useEffect(deps)/useReducer 無し（blocker無し） | VERIFIED | Promo/components.tsx 目視 |
| npx hyperframes render がこの環境で動く | VERIFIED | out/promo.mp4 生成成功（要 system ffmpeg: brew で導入。Playwright同梱版は ffprobe 無く不可）|

## 動画構成（現行仕様反映後）

1. Hook（維持）
2. Guide 5領域30タスク（維持・配点チップ維持）
3. 想起カード 51（維持）
4. 演習＋シナリオ（維持）
5. **★NEW: 60問 Mock Exam（120分・resume/履歴/復習）** ← 追加
6. **Learning analysis（模試結果から復習領域を提示・根拠十分度）** ← 旧「苦手」を刷新
7. Closing（無料/登録不要/ローカル保存・JSON移行、URL）

## タスク

### Phase 0: 準備
- [x] hyperframes プラグイン導入（remotion-to-hyperframes 取得）
- [x] 現行仕様の数値取得
- [x] `npx hyperframes skills update remotion-to-hyperframes`（exit 0）

### Phase 1: スクショ撮影（Mock Exam / Learning analysis）
- [x] Playwright 撮影スペック tests/_capture-video.spec.ts（viewport 1600×1000 / DSF 2、seedStorage 利用）
- [x] video/assets/mock-exam.png（3200×2000・1/60・残り時間120:00・複数選択）
- [x] video/assets/analysis.png（3200×2000・模試結果を分析する・領域別）
- 完了条件: 2ファイル存在・対象ビュー確認済み ✓

### Phase 2: Remotion 更新（現行仕様）
- [x] Promo.tsx にシーン5(Mock Exam)追加、シーン6を Learning analysis に刷新
- [x] SCENES / TOTAL_DURATION 再配分（7シーン・1015frames≈33.8s）
- [x] `pnpm lint`（eslint+tsc）exit 0
- [x] 静止画 still で新2シーン確認済み

### Phase 3: HyperFrames 移植（skill）
- [x] lint_source.py 実行（0 blocker）
- [x] 必要リファレンス読込（api-map/timing/sequencing/media/fonts + core contract）
- [x] video-hf/ scaffold（hyperframes init blank）+ assets コピー
- [x] index.html 生成（7 clip + 永続 grid bg + 単一 paused GSAP timeline）
- [x] `npx hyperframes check` ok:true（error 0 / warning 3=助言のみ）
- [x] snapshot 7 シーン目視 OK（quiz→scenario クロスフェード含む）
- [x] `npx hyperframes render --quality high` → video-hf/out/promo.mp4（17.7MB・1920×1080・30fps・33.8s）
- [x] TRANSLATION_NOTES.md
- 完了条件: HyperFrames mp4 出力 ✓

### Phase 4: 成果物提示
- [x] 最終 mp4 の実フレーム（t=22 Mock / t=27 Analysis）を抽出・目視で最終確認
- [x] Remotion フォールバック video/out/promo-remotion.mp4（18.2MB）も生成
- [x] 一時ファイル（撮影spec・検証png）を削除

## Notes（逸脱ログ）
- 既存コピー数値（51枚・配点）は現行仕様と一致 → 変更不要。追加は Mock Exam / Learning analysis の2シーン。

## Review

完了。現行仕様を反映した告知動画を Remotion で更新し、`remotion-to-hyperframes` スキルで HyperFrames HTML に移植、レンダリングまで実施。

**成果物**
- `video-hf/out/promo.mp4` — HyperFrames 版（本命・17.7MB・1920×1080・30fps・33.8s）
- `video-hf/index.html` + `TRANSLATION_NOTES.md` — 移植ソースと翻訳ノート
- `video/out/promo-remotion.mp4` — Remotion 版（フォールバック/SSIMベースライン・18.2MB）
- `video/src/Promo.tsx` — 現行仕様に更新（Mock Exam 追加・Learning analysis 刷新）
- `video/assets/mock-exam.png`, `analysis.png` — 実アプリから撮影した新スクショ

**現行仕様の反映（新規2シーン）**
- 60問120分 Mock Exam（中断再開・履歴・設問別復習）
- Learning analysis（模試結果を領域別に分析。合否・点数は出さないガードレール文言も画面に表示）
- 既存4シーン（Guide/カード/演習+シナリオ）と数値（カード51・配点27/18/20/20/15）は現行仕様と一致のため踏襲

**検証エビデンス**
- Remotion: `pnpm lint`（eslint+tsc）exit 0、still 2枚で新シーン確認
- 移植: `lint_source.py` 0 blocker、`hyperframes check` ok（error 0 / warning 3=助言のみ）
- HF: 7シーン contact-sheet 目視 + 最終mp4の実フレーム抽出で確認（フォント・レイアウト・quiz→scenario クロスフェード一致）

**自己クイズ**
- 最リスク: spring→ease 近似と @remotion/google-fonts→`<link>` のフォント差。damping200 は過減衰で overshoot 無し→power3.out で視覚一致、フォントは同一ファミリ/ウェイトで noise-floor 内（TRANSLATION_NOTES 記載）。
- 未実施: SSIM 数値比較（両mp4は生成済みだが数値diff未算出）。視覚一致は contact-sheet と実フレームで確認済みのため許容。
- 逸脱: `<br>` 排除・永続grid背景の追加（HF契約準拠、TRANSLATION_NOTES に理由記載）。

**未コミット**: 変更は未コミット（ユーザー指示待ち）。video-hf/ は新規、video/assets に png 2枚追加、video/src/Promo.tsx と tasks/todo.md を変更。
