# WebMCP 対応 — 設計と Phase 1 実装（2026-09-02・PR #88）

ページ内でエージェント向けツールを公開する WebMCP（`document.modelContext`）対応の設計。
実装時は本計画を Phase ごとに消化し、仕様確定後に `DESIGN.md` を同じ PR で更新する。

## 決定事項（2026-09-02 トシ回答）

1. **ツール範囲**: 読み取り + 画面遷移を Phase 1。書き込み（復習評価の記録等）は Phase 2 として設計のみ。模試（mock exam）操作ツールは恒久除外。
2. **チャネル**: native `document.modelContext` 優先 + `@mcp-b/global` polyfill 同梱（自己ホスト・遅延ロード）。Claude 拡張/ローカルリレー経由で今すぐ使えるようにする。依存追加はトシ承認済み。
3. **有効化**: 常時登録（ページを開けば登録。データが流れるのはユーザー自身のエージェントがツールを呼んだ時だけ、という整理）。

## Cloudflare 調査結論（採用しない）

- Cloudflare の WebMCP 機能（`agents/experimental/webmcp` の `registerWebMcp()` / ゼロコード注入）は「**既存リモート MCP サーバー**のツールをページの `modelContext` に映すブリッジ」。実行はリモート側。
- このサイトは (a) 配信が Vercel（Cloudflare は DNS のみ、`DESIGN.md:182`）、(b) サーバーなしが設計原則、(c) 価値の中心が localStorage の進捗＝リモート実行では見えない、の3点で適用外。
- Cloudflare 自身の配置指針も「ローカル UI 状態・localStorage → ページ内で直接登録」としており、第一者実装が正攻法。将来 Workers Static Assets へ移しても MCP サーバーを持たない限り不要。

## API 前提（spec commit 41d12f0・W3C CG-DRAFT）

- 正式エントリポイントは `document.modelContext`（`navigator.modelContext` は旧名）。
- `registerTool({name, description, inputSchema, execute, annotations}, {signal})`。`inputSchema` は JSON Schema。`execute` の戻り値は任意の JSON 直列化可能値。
- **unregister は存在しない**。解除は `AbortSignal` の abort のみ。同名再登録は `InvalidStateError`。
- 文字数予算（Chrome 指針）: name ≤30 / description ≤500 / param description ≤150 / 出力 ≤1.5K 文字。
- 仕様は CG ドラフトで破壊的変更あり得る前提。アダプタ層を薄く1ファイルに閉じ込め、ツール本体（純関数）を仕様から独立させる。

## アーキテクチャ

- **新モジュール `src/lib/webmcp/`**:
  - `tools.ts` — ツール定義本体。`(input, ctx) => result` の純関数群。`ctx` は `{ getData(): StudyData, locale, navigate }` を注入（テスト容易性のため DOM 非依存）
  - `register.ts` — `document.modelContext` への登録アダプタ。`@mcp-b/global` は **native の有無によらず常に**遅延ロードする（Claude 到達性を担うのは polyfill 部ではなく同梱の MCP bridge のため。polyfill 部は native 存在時には native に譲る設計で共存前提）
- **登録場所**: `App.tsx`（Preact island）のマウント後。Astro SSR / ビルド時コードは `document.modelContext` に一切触れない。
- **状態経路（最重要制約）**: ツールは localStorage を直接読み書きしない。読み取りは App の現在 state（ref 経由の最新スナップショット）、Phase 2 の書き込みは UI と同じ update 関数（`scheduleReview` → commit 経路）を必ず通す。並行ライターを作らない。
- **ライフサイクル**: マウントごとに `AbortController` を1つ生成し unmount で abort。再マウント時の同名 `InvalidStateError` を防ぐ。
- **ロード戦略**: 初期バンドルに含めない。idle 後（`requestIdleCallback` 相当）に dynamic import。`@mcp-b/global` も同経路でのみロード。
- **出力形式**: 構造ラベル・キー名は安定英語（`buildStudySummary()` と同じ方針）、コンテンツ文字列はページ locale。ID（cardId / questionId / sectionId）を常に併記し deep link に使えるようにする。

## ツールカタログ

### Phase 1（読み取り: `annotations.readOnlyHint: true`）

| name | 概要 | 実装の芯 |
| --- | --- | --- |
| `get_study_summary` | 進捗サマリ | `buildStudySummary()` を wrap。1.5K 字に切り詰め |
| `get_due_reviews` | 復習期限が来たカード一覧 | `isDue()` を reviews に適用。id + prompt + domainId、件数上限付き |
| `get_domain_stats` | 領域別の生の正答統計 | `quizStats` を domain 集計。**生カウントのみ、導出指標なし** |
| `search_content` | カード/設問の検索 | keyword + domain/objective フィルタ。id + タイトル + deep link hash を返す |

### Phase 1（遷移: readOnlyHint なし・非破壊）

| name | 概要 | 実装の芯 |
| --- | --- | --- |
| `open_view` | 指定ビュー/コンテンツへ遷移 | 既存 `navigate(view, target)` + `deep-link.ts` の ViewTarget を再利用。入力検証は deep link と同一 |

### Phase 2（書き込み・設計のみ、実装は別 PR）

- `record_review_rating(cardId, rating)` — `scheduleReview` → UI と同一の commit 経路。実行前にページ内で確認 notice を出す（仕様は confirmation を強制しないためサイト側責務）
- `complete_guide_section(sectionId)` — `completeStudyGuideSection` 経由
- 書き込み系は revision 不一致・保存失敗を結果値で返し、黙って握りつぶさない

### 恒久除外（実装しない）

- 模試の開始・回答・提出（エージェントが解いたら模試の意味がない）
- 合否・点数・準備完了度を算出/示唆する出力（AGENTS.md 絶対的制約）
- 進捗の reset / import / export / 受験日変更（破壊的・既存 UI に明示的導線あり）

## Constraints（制約台帳）

| Constraint | Source | Verify by |
| --- | --- | --- |
| 合否・準備完了度を算出・示唆しない | AGENTS.md 絶対的制約 | ツール出力型に導出指標が無いこと + unit test で出力キーを固定 |
| 進捗を外部送信しない | AGENTS.md 絶対的制約 | `src/lib/webmcp/` に fetch/XHR/beacon なし。`pnpm test:no-analytics` |
| ストレージスキーマ互換（Phase 1 は書き込みゼロ） | AGENTS.md | `save()` 呼び出しが diff に無いこと |
| 依存追加は必要最小 | AGENTS.md（トシ承認済み） | 追加は `@mcp-b/global`（runtime）の1つのみ（`webmcp-types` は型衝突で撤回） |
| ツールが推移的にも書き込まない（ビューのマウント副作用を含む） | AGENTS.md + Phase 1 決定 | `tests/webmcp.spec.ts`: 全ルートを `open_view` で開いた後に localStorage の文書がバイト同一 |
| 初期バンドル予算 | AGENTS.md | `pnpm test:bundle`（webmcp モジュールと polyfill は遅延 import） |
| CSP 変更なし | vercel.json | inline script を足さない。`pnpm test:csp`（ハッシュ不変） |
| Permissions-Policy が `tools` を塞がない | vercel.json（現状 `tools` 記載なし = default self で許可） | vercel.json diff なし |
| UI 文言は i18n、ツール記述は安定英語 | src/AGENTS.md + buildStudySummary 前例 | 追加 JSX に文字列リテラル無し／tool description は英語固定 |
| SSR で `document.modelContext` に触れない | Astro 静的ビルド | `pnpm build` が Node 環境で成功 |
| 模試操作ツールを作らない | トシ決定（2026-09-02） | ツールカタログ diff レビュー |

## Assumptions（前提台帳）

| Assumption | Status | Evidence |
| --- | --- | --- |
| `document.modelContext` が正式名・AbortSignal で解除 | VERIFIED | spec `webmachinelearning/webmcp` index.bs @41d12f0 |
| Permissions-Policy 未指定なら `tools` は default `self` で許可 | VERIFIED | spec + vercel.json（`tools` 記載なし） |
| `@mcp-b/global` は外部 CDN/ネットワーク読み込みなしで self-bundle 可能 | VERIFIED（調査時点） | npm v5.1.0 2026-08-31、実装時に bundle 内容を再確認 |
| `@mcp-b/global` のサイズが遅延チャンクとして許容範囲 | VERIFIED（spike ビルド 2026-09-02） | 出力チャンク `dist.<hash>.js` = 284,189 bytes / gzip 73,460 bytes。App 初期チャンクは gzip 13,356 bytes のまま、`pnpm test:bundle` OK（14 eager chunks, none forbidden）。idle 後ロードなので LCP に乗らない。サイト最大チャンクである事実は記事メモに記録 |
| `webmcp-types`（spec 公式型）を dev 依存に追加できる | 撤回（2026-09-02） | `@mcp-b/global` の d.ts が `@mcp-b/webmcp-types` を参照し、両方が `Document.modelContext` を宣言して TS2717 になる。`webmcp-types` は削除し、型は `@mcp-b/global` 経由に一本化。追加依存は `@mcp-b/global` の1つのみ |
| Chrome OT 登録なしでも polyfill 経路で Claude から利用可能 | VERIFIED（調査時点） | @mcp-b 拡張/ローカルリレーのドキュメント。実装時に E2E 相当の手動確認 |
| native 登録したツールを @mcp-b bridge が外部ホストへ露出できる（global 経由登録が必須ではない） | VERIFIED | docs.mcp-b.ai/packages/global/reference: 初期化時に既存 `document.modelContext` を capture して wrap し（"replaces document.modelContext"）、"mirrors registrations down to the underlying native or polyfill context" — 双方向に同期する統合設計。ただし**登録は global の初期化後に行う**こと（`register.ts` は global の dynamic import 完了を待ってから `registerTool` する順序で実装）。実機での round-trip 確認は実装フェーズの手動確認項目として維持 |

## テスト戦略

- **vitest**: `tools.ts` を StudyData フィクスチャで直接テスト（scheduler/quiz と同型）。出力キー固定・文字数上限・導出指標なしを assert
- **Playwright**: `addInitScript` で `document.modelContext` をスタブ → 登録されたツール一覧と `execute` の round-trip を assert（Chrome フラグ・polyfill の有無に依存しない）
- 既存ゲート: `pnpm test` / `build` / `test:e2e:fast` / `test:styles` / `test:bundle` / `test:no-analytics` / `test:csp` すべて green

## 実装フェーズ（Phase 1 の todo・実装セッションで消化）

- [x] `@mcp-b/global@5.1.0` を追加（`webmcp-types` は型衝突のため撤回）。遅延チャンク `dist.*.js` gzip 73,460B、`pnpm test:bundle` OK（15 eager chunks, none forbidden）
- [x] `scripts/check-initial-bundle.mjs` の FORBIDDEN に `webmcp-register` / `webmcp-tools` / `dist` を追加（`@mcp-b` は chunk 名に現れないため実チャンク名で指定）
- [x] `src/lib/webmcp/webmcp-tools.ts` + `webmcp-tools.test.ts`（20 tests）。`pnpm test` 672 passed（32 files）
- [x] `src/lib/webmcp/webmcp-register.ts` + `src/components/app/useWebMcp.ts` + `App.tsx` 1行（AbortController / requestIdleCallback 後 dynamic import / bridge 初期化後に登録）
- [x] `tests/webmcp.spec.ts` 3本（native 形スタブ + 外部リクエスト/WebSocket ゼロ / 実 bridge 経路の JSON round-trip + 外部通信ゼロ / 全ルート `open_view` 後の localStorage バイト同一）。`pnpm test:e2e:fast` 105 passed
- [x] 全ゲート（レビュー対応後・2026-09-02）: `pnpm test` 672 passed / `pnpm build` 0 errors / `test:bundle` OK（16 eager chunks, none forbidden）/ `test:styles` OK / `test:no-analytics` OK / `test:csp` 2 hashes 一致 / `test:e2e:fast` 105 passed。`pnpm test:e2e`（full）は未実行 — PR CI のマージゲートで実行
- [x] `DESIGN.md` §Study companion affordances に「WebMCP tools」段落 + §Technical architecture に1行
- [x] `ASSETS_AND_ANALYTICS.md` §Privacy に WebMCP のデータフロー1項目。privacy ページ（`src/i18n/site.ts`）に `agentTools` 段落を ja/en 追加、最終更新日 2026-09-02。`test:no-analytics` のルート固有チェックと干渉なし
- [x] native 経路: Playwright の Chromium 151 に `--enable-experimental-web-platform-features` を渡すと native `document.modelContext`（`typeof ModelContext === 'function'`）と `navigator.modelContextTesting` が出る。`tests/webmcp-native.spec.ts` で登録と `executeTool` を固定（手動の chrome://flags 確認を機構に置換）
- [x] 拡張経路のワイヤ: `tests/webmcp.spec.ts` がページ内から `TabClientTransport` と同じ postMessage エンベロープで MCP `initialize` → `tools/list` → `tools/call` を流し、`allowedOrigins: [location.origin]` が page origin の送信者を通すことを固定
- [x] `@mcp-b/webmcp-local-relay` は不採用: CDN script + 隠し iframe + `ws://127.0.0.1:9333` を要求し、CSP（`script-src 'self'` / `frame-src 'none'` / `connect-src 'self'`）と両立しない
- [x] `pnpm test:e2e`（full）157 passed（2026-09-02）
- [ ] 任意（トシ環境）: WebMCP ブラウザ拡張を入れた Chrome で実際の Claude から round-trip。サイト側の責任範囲は上の E2E で検証済み

## Notes（作業上の判断・DESIGN.md から復元できないもの）

- **ツールは 5 → 6 に増えた**: `search_content` の結果に本文を含めると出力 1.5K を超えるため、ヒット一覧と `get_content_item`（詳細）に分割。実コンテンツに対する既定 limit の出力サイズを vitest で固定
- **`webmcp-types` は追加しなかった**: `@mcp-b/global` の d.ts が参照する `@mcp-b/webmcp-types` と `Document.modelContext` の宣言が衝突（TS2717）。型は後者に一本化
- **E2E の hash 期待を修正**: `open_view` 後に `location.hash` が付かないのは既存契約（hash なしセッションは hash を作らない）。戻り値のキーを `hash` → `deepLink` に改名し、テストは UI 効果（section open + summary focus）を見る
- **Vite のチャンク分割**: `webmcp-register` と App が `deep-link` / `scheduler` / `study-summary` 等を共有するため小さな共有チャンクに分かれ eager chunk 数が 14 → 15。合計バイトはほぼ同じ。Lighthouse 予算は CI で確認する
- **`installTestingShim` は最終的に false**: 当初は true を明示していたが、`navigator.modelContextTesting` は Chromium から削除済みのプレビュー API（polyfill docs 明記）で、bridge の transport とは独立。spec 面（`document.modelContext`）だけを公開する
- **模試ビューはツールから開けない**: `MockExamView` のマウント effect が期限切れセッションを `finalize('expire')` → `save()` するため、`open_view` の `mock-exam` は推移的な書き込み経路だった（reviewer の High 指摘）。ルートから除外し、「全ルートを開いても localStorage がバイト同一」の E2E で機構化

## Review

### 1巡目: `/code-review high`（finder 8観点）+ `reviewer` エージェント（opus・設計適合）

| 重大度 | 指摘 | 対応 |
| --- | --- | --- |
| High | `open_view` で `mock-exam` を開くと `MockExamView` のマウント effect が期限切れセッションを採点・保存する（Phase 1「書き込みゼロ」の推移的な破れ） | `mock-exam` をルートから除外。全ルート遷移後の localStorage バイト同一を E2E で固定。DESIGN.md に理由を追記 |
| Medium | `limit` 最大値で出力が 1.5K を超える（`get_due_reviews {limit:20}` 2,644 字、`search_content {limit:10}` 4,013 字）— 3観点が独立に指摘 | `fitToBudget()` で直列化サイズが収まるまで項目を削り `truncated` を返す。`search_content` は `hits` 1本に統合。実コンテンツ×最大 limit のテストを追加 |
| Medium | 外部通信ゼロの E2E が bridge 稼働時（テスト2）には無く、WebSocket も見ていない | テスト2にも `request` + `websocket` 監視を追加 |
| Medium | 初期バンドル検査の `'dist'` は bundler の命名の偶然に依存 | チャンク内容マーカー（`get_study_summary` / `[WebModelContext]`）で検査 |
| Medium | 練習セッション中にエージェントが `open_view` で離脱させるとセッションが無通知で消える | `isPracticeSessionActive()` を bridge に追加、セッション中は practice 以外への遷移を拒否 |
| Medium | `open_view` が対象なしビューへの `id` を黙って捨てつつ echo する | `ITEM_ROUTES` で拒否。戻り値は `formatDeepLink(link)` |
| Low | `get_study_summary` が飽和した学習記録で id リストごと切れる | `idLimit` を 20→10→5→3→1 と段階的に下げて収める（`buildStudySummary` に任意の `idLimit` を追加）。飽和記録のテストを追加 |
| Low | unmount 時に `cleanupWebModelContext()` 未呼び出し | abort シグナルに紐付け |
| Low | `requestIdleCallback` に timeout なし | `{ timeout: 2000 }` |
| Low | `clip()` がサロゲートペアを分断し得る | コードポイント単位に変更 + emoji テスト |
| Low | `localize()` ヘルパー未使用 / `NO_SCORE_NOTE` の重複定義 | `localize` を使用。`NO_SCORE_NOTE` を `study-summary.ts` から export して共有 |
| Low | `webmcp-types` の残骸（台帳の制約行）・`DESIGN.md` の Last reviewed 未更新・未使用の `title` Pick・E2E の重複キャスト・戻り値型の未使用 | すべて修正 |
| Low | `allowedOrigins` は受信側のみの制限。docs の「このオリジンに制限」は不正確 | docs と register のコメントを「このオリジンからの受信のみ受け付ける」に修正 |
| 対応せず | `describeMissingId` の存在確認がビュー側の寛容な解決と非対称 | エージェントには明確なエラー、URL は寛容に、という意図的な非対称。設計に記録済み |
| 対応せず | 入力検証の `readX` + `isInvalid` ボイラープレート | 例外を制御フローに使わない現行スタイルを維持 |
| 対応せず | プライバシー説明の3箇所重複（DESIGN / ASSETS / site.ts） | 既存パターンの延長。正典は ASSETS_AND_ANALYTICS.md（AGENTS.md の表どおり） |

### PR #88 CI（2026-09-02）

`lighthouse`（バンドル・Lighthouse・トークン予算）pass 1m38s / `playwright` pass 4m22s / Vercel preview deploy pass。`mergeable: MERGEABLE`、`mergeStateStatus: CLEAN`。

## Open items

- Chrome origin trial 登録（外部アカウント作業・`<meta http-equiv="origin-trial">` を LocalizedLayout に追加するだけで CSP 影響なし）: polyfill で当面カバーできるため保留。native 安定版が近づいたら判断
- Phase 2 書き込みツールの確認 UI 仕様（notice か dialog か）

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
