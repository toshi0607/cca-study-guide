# WebMCP 記事用メモ（遡って確認しづらいことの記録）

目的: 「このサイトを WebMCP 対応する」過程で得た、後から再現・再確認しにくい事実と判断を、
記事執筆時に引けるよう時系列で残す。仕様や一次情報は日付と URL 付きで書く（WebMCP は
CG ドラフト段階で API が動くため、「いつの時点の事実か」が記事の正確性を左右する）。

記事の想定章立て（暫定・後で技術記事らしく再構成する）:
1. WebMCP の概要 / 2. メリット・デメリット / 3. アーキテクチャ（コンポーネントと役割、サイトとのやりとり）
/ 4. 制約 / 5. 実装で出てくる概念（polyfill・bridge・ライブラリ）と実装手順 / 6. ベンチマーク（WebMCP あり/なし）
/ 7. 通常の MCP サーバーとの違い / 8. Cloudflare の WebMCP

---

## 2026-09-02 調査フェーズ

### 仕様の一次情報（この日時点）

- spec リポジトリ: https://github.com/webmachinelearning/webmcp — 参照 commit `41d12f0`
- ステータス: **W3C Web Machine Learning Community Group の CG-DRAFT**（`index.bs` の `Status: CG-DRAFT`、`w3c.json` は `repo-type: cg-report`）。Recommendation トラックではない。WG の Working Draft もまだ無い
- 正式エントリポイントは **`document.modelContext`**。`navigator.modelContext` は旧名（polyfill は deprecated 警告付きで両対応）。ブログ記事の多くが `navigator.` 表記のままなので、記事では「名前が変わった」ことを明記する
- `provideContext()` は現行仕様に存在しない（grep でゼロ件）。古い記事に出てくるのは 2025 年の初期 API
- IDL 要点:
  - `registerTool(ModelContextTool tool, {signal?, exposedTo?})` → `Promise<undefined>`。**戻り値にハンドルは無い**
  - `getTools({fromOrigins?})`、`executeTool(tool, input, {signal?})`、`ontoolchange` イベント
  - `ModelContextTool = {name(必須), title?, description(必須), inputSchema?(JSON Schema), execute(必須), annotations?: {readOnlyHint, untrustedContentHint}}`
  - `execute` の戻り値は `Promise<any>`（JSON 直列化できれば何でも。MCP の `{content:[...]}` 封筒は**必須ではない**。explainer 内でも両方の例が混在）
  - **unregister / update メソッドは無い**。解除は `AbortSignal`、更新は abort → 再登録。同名の二重登録は `InvalidStateError`
  - エラー種別: `InvalidStateError`（非アクティブ document / 同名 / 名前・説明不正）、`NotAllowedError`（Permissions-Policy `tools` で拒否）、`SecurityError`（`exposedTo` に非信頼 origin）、`TypeError`（schema の JSON 化失敗）
- 宣言的 API（`<form toolname tooldescription toolautosubmit>` + `toolparamdescription`）も別 explainer にあるが、入力スキーマ合成アルゴリズムは spec 上 TODO。Chromium は「緩い版」を試験実装
- Chrome 公式ガイドの文字数予算（"subject to change" 明記）: name ≤30 / description ≤500 / param description ≤150 / tool 出力 ≤1.5K 文字
- セキュリティ質問票の要点: 「機微・高権限操作の誤用に対する規範的ガイダンスは仕様に**無い**」（Q4）。consequential-action ヒントは issue #176 で未実装。つまり**確認 UI はサイト側責務**
- 未解決の設計論点（記事の「制約」章の材料）: マルチモーダル I/O、cross-document のツール応答、ストリーミング、`outputSchema`、`exposedTo` の組み込みエージェント向けキーワード（issue #179）、cross-top-level-document 実行（issue #227）

### 実装状況（この日時点）

- Chrome: Chrome 149 で **Origin Trial** 開始（chromestatus feature 5117755740913664）。手元検証は `chrome://flags/#enable-webmcp-testing`。OT トークンは `<meta http-equiv="origin-trial">` か `Origin-Trial` ヘッダ
- Edge: Edge 150 から OT（spec の implementation-status.md）。検索スニペットの「Edge 147 ネイティブ対応」は一次情報と矛盾するので採用しない
- Firefox / Safari: standards-positions の issue があるだけ（mozilla #1412、WebKit #670）。コミットなし
- 他: ChatGPT Desktop が WebMCP 対応、Brave Leo が実験的対応（implementation-status.md）
- **未検証**: 「OT は Chrome 149→156」「navigator. 名は Chromium 150 で deprecated」はブログ由来。記事に書くなら chromestatus を再確認する
- サイト側要件（Chrome docs）: Origin-Agent-Cluster を無効化しない、Permissions-Policy の `tools` 機能（default `self`）

### エコシステム（npm・この日時点）

| パッケージ | 役割 | 版・日付 |
| --- | --- | --- |
| `webmcp-types` | spec 公式の TS 型（spec README からリンク） | v0.1.5 / 2026-08-20 |
| `@mcp-b/webmcp-polyfill` | `document.modelContext` の API シム。**単体では外部ホストから届かない**（single document only） | 5.1.0 |
| `@mcp-b/global` | polyfill + **MCP bridge**（外部 MCP ホスト＝Claude/ChatGPT/Gemini から到達させる本体） | v5.1.0 / 2026-08-31、unpacked 324KB、依存: `@modelcontextprotocol/server` 2.0.0、`@mcp-b/transports`、`@mcp-b/webmcp-polyfill`、`@mcp-b/webmcp-types`、`@mcp-b/webmcp-ts-sdk` |
| `@mcp-b/transports` | postMessage / iframe / Chrome 拡張 transport | 5.1.0 |
| `@mcp-b/webmcp-extension` | MV3 拡張のテンプレ | — |
| `@mcp-b/webmcp-local-relay` | 拡張なしで Claude Desktop / Cursor へ中継する localhost リレー | — |
| `@mcp-b/react-webmcp`, `usewebmcp` | React バインディング | — |

- WebMCP-org/npm-packages: 81 stars / 614 commits / CI・Playwright・OpenSSF Scorecard あり。小規模だが活発
- `@mcp-b/global` の docs（docs.mcp-b.ai/packages/global/reference）: 初期化時に既存の `document.modelContext` を capture して wrap（"replaces document.modelContext"）し、"mirrors registrations down to the underlying native or polyfill context"。→ **登録は global 初期化後に行う**必要がある

### polyfill と bridge は別物（設計でハマりかけた点・記事の要）

- 「native があれば `@mcp-b/global` は不要」と最初は設計した。**これは誤り**。Claude 等の外部ホストへ届けるのは bridge であり、polyfill ではない。native 対応ブラウザでちょうど Claude から使えなくなる分岐だった
- 正しい整理: polyfill = API の穴埋め（ブラウザが `document.modelContext` を持たない時だけ意味がある）、bridge = ページ内ツールを MCP プロトコルとして外部ホストへ露出する transport。native が普及しても、ブラウザ組み込みエージェント以外（拡張経由の Claude 等）に届けるには bridge が要る
- 記事の「アーキテクチャ」章はこの3層（ページのツール / `document.modelContext`（native or polyfill）/ bridge → 外部ホスト）で描くとよい

### Cloudflare の WebMCP（3つの別物）

1. **`agents/experimental/webmcp` の `registerWebMcp()`**（https://github.com/cloudflare/agents/blob/main/experimental/webmcp.md）
   - 仕組み: ページ側 JS が MCP Client として SSE でリモート MCP サーバー（`McpAgent`、例 `/mcp`）に接続 → `tools/list` で列挙 → 各ツールを `ModelContextTool` として `navigator.modelContext` に**シムとして再登録** → 実行時はリモートへ中継
   - 前提: リモート MCP エンドポイント、native `navigator.modelContext` 対応ブラウザ（それ以外は no-op）。Cloudflare 自体は必須ではなく、HTTP/SSE の MCP サーバーなら理屈上動く
   - オプション: `url`（必須）、`headers`/`getHeaders`、`watch`（SSE でツール変更監視、GET 405 なら自動無効）、`prefix`（名前空間衝突回避）、`timeoutMs`、`onSync`/`onError`
   - 既知制限（docs 明記）: 同名衝突は無音（`prefix` 必須）、MCP `content[]` を文字列に平坦化（画像は data URL 化）、ストリーミング未対応、SSR/Worker で import 不可、ツールのフィルタ・説明書き換え機構なし、グローバルなハング検出タイムアウトなし。"Status: experimental… Pin your agents version and expect to rewrite calls"
   - 配置指針の表（記事で引用価値あり）: DOM 操作・ローカル UI 状態（Zustand/IndexedDB）・Web API（位置情報等）→ **ページ内で直接登録**。KV/R2/D1 等の永続データ・秘密付き API・タブ寿命を超える処理 → リモート MCP
2. **ゼロコード注入**（2026-08-06 発表）: Cloudflare がプロキシ配信する HTML に same-origin のブリッジスクリプトを注入し、既存 MCP サーバーと WebMCP を接続。※一次情報（Cloudflare blog）は未取得。記事執筆時に blog URL を取ってくる
3. **Browser Run の WebMCP 対応**（changelog 2026-04-15、https://developers.cloudflare.com/changelog/post/2026-04-15-br-webmcp/）: エージェント開発者側。Chrome beta の実験プールで `navigator.modelContextTesting.listTools()` によりサイトのツールを発見・実行できる。サイト側の対応手段ではない

**このサイトに適用できなかった理由**（3点）:
- 配信は Vercel（`vercel.json` で CSP 配信）。Cloudflare は `cca.toshi0607.com` の DNS ゾーンのみ（`DESIGN.md:182`）。注入方式はプロキシ配信が前提
- サーバーなしが設計原則で、映す元の MCP サーバーが無い
- 価値の中心が localStorage の学習進捗＝リモート実行では原理的に見えない。Cloudflare 自身の配置指針でも「ローカル状態はページ内で直接登録」

将来 Workers Static Assets に移しても MCP サーバーを持たない限り不要。→ Cloudflare 方式を試すなら「サーバー側に状態がある」別サービスが適切（候補は下記「Cloudflare 実験候補」）

### MCP サーバー vs WebMCP（初回の整理・記事 7 章の骨子）

| 観点 | MCP サーバー | WebMCP |
| --- | --- | --- |
| 動作場所 | 別プロセス（stdio / リモート HTTP） | ページ内 JS |
| 接続できるエージェント | 任意の MCP ホスト（Claude Code / Desktop 等） | ブラウザ内エージェント（組み込み or 拡張）、ページを開いている間だけ |
| ユーザー状態（localStorage / UI）へのアクセス | 不可 | 可 |
| 導入 | ユーザーが設定・インストール | ゼロインストール（対応ブラウザ + エージェント前提） |
| 成熟度 | 安定・普及 | CG ドラフト、Chrome 149 OT |
| このサイトでの意味 | コンテンツ提供のみ、進捗に触れない | 進捗に基づく操作が可能、静的サイト原則を崩さない |

両者は排他ではない。ツールのスキーマ設計は共通化できる。

### このサイト固有の事実（設計判断の根拠）

- `buildStudySummary()`（`src/lib/study-summary.ts`）は既に「エージェント companion 向けの安定英語ラベル + ID」で進捗をテキスト化しており、クリップボード経由で渡す導線が存在した。WebMCP はこの導線の API 化と位置づけた
- CSP は `script-src 'self' + sha256 ×2`。自己ホストの bundle は `'self'` で通るので **CSP 変更ゼロ**。inline script を足すとハッシュ検証（`check-csp-hashes.mjs`）で落ちる
- `Permissions-Policy` は device 系のみ無効化、`tools` の記載なし → default `self` で許可。`Origin-Agent-Cluster` 未設定 → 問題なし
- 初期バンドル予算: `scripts/check-initial-bundle.mjs` が App.js の**静的** import 閉包に FORBIDDEN チャンクが無いことを検査。dynamic import 先は対象外 → WebMCP モジュールと `@mcp-b/global` は dynamic import で切る + FORBIDDEN に `@mcp-b` を追加して機構化
- 状態経路: `App.tsx` の `commitData` は毎回 `studyStore.load()` で canonical を再読込してから書く（別タブ対策）。ツールが localStorage を直接触ると UI と desync + 検証バイパスになるので、**ツールは App の state/関数経由のみ**
- `navigator.modelContext` 系は SSR で存在しない。Astro 静的ビルド中に触ると build が落ちる → island の effect 内・dynamic import 後にのみ触る
- 決定（2026-09-02）: Phase 1 = 読み取り + 画面遷移、Phase 2 = 書き込み。模試操作は恒久除外（エージェントが解いたら模試の意味がない）。チャネル = native + `@mcp-b/global` 常時遅延ロード。有効化 = 常時登録
- 法的ガードレール: ツール出力に合否・準備完了度の導出指標を含めない（生カウントのみ）。仕様側の readOnlyHint 等とは別軸の、このサイト固有の制約

### Cloudflare 実験候補（別サービスで試す場合）

`workers_list`（2026-09-02）: `foreveryou2026`（2026-08-08 作成・08-29 更新）、`kusakuzushi-ogp`（OGP 生成、2026-07-25 作成）、
それ以外は 2023 年のテスト用（`todowrangler` / `todolist` / `kamedatest`）。
- どれも MCP サーバー（`McpAgent`）を持たない。Cloudflare 方式を試すには「Worker 側に状態と MCP エンドポイントを持つサービス」が必要なので、
  候補にするなら `foreveryou2026` か `kusakuzushi-ogp` に `McpAgent` を足す形になる（= 「ゼロコード」ではなく「MCP サーバーを作ればブラウザ側はゼロコード」が正確）
- 記事的に面白いのは「サーバー状態あり（Cloudflare 方式が活きる）」vs「ブラウザ状態のみ（cca-study-guide、第一者実装）」の対比

---

### 2026-09-02 残り検証（native 経路 / Claude 到達経路）

- **Playwright 同梱の Chromium 151（HeadlessChrome/151.0.7922.34）で native WebMCP が使える**: `--enable-experimental-web-platform-features` を付けると `document.modelContext` が native（`typeof ModelContext === 'function'`）になり、`navigator.modelContextTesting` に `listTools` / `executeTool(name, inputJson)` / `getCrossDocumentScriptToolResult` / `ontoolchange` が生える。`--enable-features=WebMCP` 単体では出ない（`WebMCPTesting` を足すと `modelContextTesting` だけ出る）。→ 「chrome://flags を立てて手で確認」は E2E に置き換えられた
  - この環境では `@mcp-b/global` が native を wrap し、wrap 経由で登録したツールが native の `listTools()` にも見える（bridge の "mirrors registrations down to the underlying native context" を実機で確認）
  - `installTestingShim: false` にした判断の補足: Chromium 151 の native には `modelContextTesting` が**存在する**（polyfill docs の "removed" は古い記述の可能性）。ただし native があるなら shim は不要で、無い環境（Firefox/Safari）向けに shim を生やす意味も薄い。判断は維持
- **`@mcp-b/webmcp-local-relay` はこのサイトの CSP と両立しない**: 仕組みは「CDN の `embed.js` を script タグで読み込み → 隠し blob iframe（`widget.html`）を注入 → iframe から `ws://127.0.0.1:9333` に WebSocket 接続」。`script-src 'self'`・`frame-src 'none'`・`connect-src 'self'` の3つ全部に引っかかる。CSP を緩めてまで対応する価値はない（「進捗を外部送信しない」原則の機構そのものを弱める）ので、**Claude への到達経路は WebMCP ブラウザ拡張（content script → 同一 window の postMessage）のみ**。記事の「制約」章: 厳格 CSP のサイトでは、拡張なしの到達手段（relay / Cloudflare 注入）はどれも外部スクリプト or 外部接続を要求する

- **拡張経路のワイヤ形式**（`@mcp-b/transports` の `TabClientTransport` / `TabServerTransport` を読んだ事実）: 同一 window の `postMessage` で `{ channel: 'mcp-default', type: 'mcp', direction: 'client-to-server' | 'server-to-client', payload }` を投げ合う。payload は MCP の JSON-RPC メッセージそのもの（`initialize` → `notifications/initialized` → `tools/list` → `tools/call`）か、制御文字列 `mcp-check-ready` / `mcp-server-ready` / `mcp-server-stopped`。サーバは受信時に `event.origin` を `allowedOrigins` と照合し、送信は `'*'` 宛。→ E2E でこのプロトコルをページ内から直接話し、`tools/call` の `content[0].text` に JSON が返ることを固定した。拡張の content script は page origin で postMessage するので、`allowedOrigins: [location.origin]` で通る

## ベンチマーク計画（実装後に埋める）

- 比較対象: 同一タスクを (A) WebMCP ツール経由 / (B) DOM・スクリーンショット操作（Claude in Chrome 等）で実行
- 比較できるのは「ツールが存在するタスク」のみ、というのは正しい。ただし**ネガティブケース**（ツールが無いタスク＝模試の実施など）も「エージェントが正しく UI 操作へフォールバックするか / 存在しないツールを幻覚しないか」という軸で計測できる。これは記事で「WebMCP を使わないと決めた機能の振る舞い」を示す材料になる
- 計測軸: ステップ数（ツール呼び出し / クリック数）、トークン数、所要時間、成功率、抽出データの正確さ
- 改善事例の記録欄: （検証で見つかった改善点をここに追記）

## 実装中の記録（追記していく）

### 2026-09-02 spike ビルド（依存追加直後）

- `pnpm add @mcp-b/global@5.1.0` → Astro 7 / Vite で **そのまま束ねられた**（`astro check` 0 errors）。`@modelcontextprotocol/server` 2.0.0 を引き連れるがブラウザ向けに解決できる。pnpm が `esbuild@0.28.2` の build script を無視した警告を出すが、Vite 側の esbuild とは別物でビルドに影響なし
- 出力チャンク: `dist.<hash>.js`（`@mcp-b/global/dist/index.js` 由来の名前）**284,189 bytes / gzip 73,460 bytes**。サイト最大チャンク（次点は問題バンク `questions` の gzip 41.7KB）。App の初期チャンクは gzip 13.4KB のまま
  - 内訳の推定: `@mcp-b/global` 自体は ESM 5KB。重いのは `@modelcontextprotocol/server` + `@mcp-b/transports` + `webmcp-ts-sdk`（= MCP プロトコル実装を丸ごとブラウザに持ち込む）。記事の「デメリット」章の定量材料
  - 対策: `requestIdleCallback` 後の dynamic import。`check-initial-bundle.mjs` の FORBIDDEN に `webmcp-register` を追加し、静的 import 経路に入ったら CI で落ちるようにした
- `@mcp-b/global` の挙動（ソース `dist/index.js` を読んだ事実）:
  - **import した時点で自動初期化**（`window.__webModelContextOptions.autoInitialize === false` で抑止）。静的 import だと options を渡す前に評価されるので、dynamic import の直前に options を置く必要がある
  - 初期化手順: polyfill 導入（native が無い時）→ 既存 `document.modelContext` を `BrowserMcpServer` で wrap → `document.modelContext` と `navigator.modelContext` を両方置換 → `syncNativeTools()` で既存 native ツールを取り込み → transport 接続。`Object.defineProperty` で置換するため、**既存 descriptor が `configurable: false` だと何もせず return**（E2E のスタブはこれを利用して bridge を排除できる）
  - transport の既定は `tabServer: { allowedOrigins: ['*'] }`。このサイトでは `[window.location.origin]` + `iframeServer: false`（CSP `frame-ancestors 'none'` と整合）に絞った
  - `installTestingShim` 既定 true → `navigator.modelContextTesting` を生やす（Browser Run の changelog が `listTools()` に使うと書いている API）。→ 既定のまま採用し、明示的に記録
  - `isSecureContext === false` では何もしない（http の LAN 検証は不可、localhost は secure）
- E2E で確認した bridge の実挙動（Playwright Chromium = native なし）: `document.modelContext` は `BrowserMcpServer`（`syncNativeTools` を持つ）に置き換わる。`getTools()` は `RegisteredTool[]`、`executeTool(tool, inputArgsJson: string)` は **JSON 文字列を受け取り JSON 文字列を返す**（Chrome の `modelContextTesting` 流儀）。spec の `executeTool(tool, inputObject)` とはシグネチャが異なるので、記事では「spec の形」と「bridge の形」を区別する
- Vite のチャンク分割の副作用: `webmcp-register`（遅延）と `App`（eager）が `deep-link` / `scheduler` / `study-summary` 等を共有するため、それらが小さな共有チャンクに分割され eager チャンク数が 14→15 に増えた（合計バイト数はほぼ同じ）。Lighthouse 予算は CI で確認
- ツール設計で決めたこと（記事の「実装で出てくる概念」章向け）:
  - ツール数は 6（read 5 + navigate 1）。`search_content` は軽量ヒット一覧、`get_content_item` で詳細、という **list/get の2段構成**にした。理由: 検索結果に本文を含めると Chrome 指針の出力 1.5K 文字をすぐ超える（日本語の解答文 ×5 件で 2K 超）。実コンテンツで既定 limit の出力が 1.5K 以内に収まることを vitest で固定
  - 設問は **正解選択肢と解説を返さない**（カードは自己採点なので解答まで返す）。エージェントが答えを流し込むと `quizStats` の意味が壊れるため。この非対称は記事で説明価値あり
  - `open_view` はツール入力から hash 文字列を組み立てて `parseDeepLink` に通す。既存の URL 入力検証をそのまま流用できるので、ツール経由でも address bar 経由でも到達できる場所が同一になる
  - 戻り値の `deepLink` はアドレスバーに反映されない: このアプリは「hash なしで始まったセッションには hash を作らない」契約（reload で Today に戻るため）。最初 E2E で `location.hash` を期待して落ちた。**製品の既存契約とエージェント向け API の期待がズレる例**として記事ネタ
  - コンテンツ（カード・設問）はツール登録時ではなく**最初のツール呼び出し時**に dynamic import。エージェントを使わない学習者はそのぶんダウンロードしない
  - `domainId` の enum は eager な軽量 spine（`domainIndex`）から組む。最初 `domainIdSchema([])` と書いて空 enum になるバグを自分で仕込んだ（lazy content と schema 構築時点のズレ）
- **設計適合レビューの High**: `open_view({view:'mock-exam'})` → `MockExamView` のマウント時 effect が「期限切れの模試セッション」を自動採点して `save()` する → **ナビゲーションだけのツールが推移的に書き込みを起こす**。「`save()` 呼び出しが diff に無いこと」という検証条件では原理的に捕まえられなかった。対策: 模試ビューをツールから開けなくし、「全ルートを `open_view` で開いた後に localStorage の文書がバイト同一」を E2E で固定。記事では「WebMCP のツールは read-only と宣言しても、ビューの副作用まで含めて read-only かは別問題。**readOnlyHint は自己申告であり、機構で証明する必要がある**」という論点にできる。付随する教訓: マウント副作用を検証する E2E は「マウントが終わるまで待つ」必要がある（既に見えている見出しで満たされる待ち条件だと偽陽性で通る）。`main h2` のテキストが前のビューから変わるまで poll する形にした
- レビュー（8観点の finder + 設計適合 reviewer）で直したこと — 記事の「実装で気をつけること」章の材料:
  - **出力予算は「定数を守る」ではなく「機構で収める」**: 一覧系ツールは `fitToBudget()` で、直列化サイズが 1.5K に収まるまで末尾の項目を削り `truncated: true` を返す。3観点が独立に「max limit で予算超過」を指摘した。`search_content` はカード/設問を別配列にすると実質 2×limit になるので、`hits` 1本に統合
  - **エージェント起点の遷移は UI 起点と同じ副作用を持つ**: `App.navigate()` は practice を離れると復習セッションを消す。人がボタンを押す分には自然だが、バックグラウンドのエージェントが `open_view` で飛ばすと通知なしに消える。ツール側で「セッション中は practice 以外へ遷移しない」ガードを入れた。**WebMCP でツールを公開するとき、既存の UI 遷移がもつ暗黙の前提（ユーザーの意思で起きる）が崩れる**、という一般則
  - `open_view` は対象を持たないビュー（today/progress 等）に `id` を渡されると `parseDeepLink` が黙って捨てるのに、戻り値に捨てた id 入りの hash を返していた。「入力をそのまま echo しない、正規化後の値を返す」
  - `installTestingShim` は **false** に変更: `navigator.modelContextTesting` は Chromium から削除済みのプレビュー API（polyfill の docs にも "removed Chromium preview API" と明記）。spec 面だけを公開する
  - unmount 時に `cleanupWebModelContext()` を abort シグナルに紐付けた（ツール解除だけでは bridge の置換と transport の listener が残る）
  - `requestIdleCallback` に `timeout: 2000` を付与（忙しいタブで登録が無期限に遅れるのを防ぐ）
  - `clip()` はコードポイント単位に（サロゲートペア分断防止）
  - 初期バンドル検査はチャンク**名**ではなく**内容マーカー**（`get_study_summary` / `[WebModelContext]`）で bridge の eager 混入を検出するように変更。vendor チャンク名（`dist.*.js`）は bundler の都合で変わり得るため
  - `allowedOrigins` は**受信側**の制限のみ。送信は同じ window に `'*'` で postMessage する（`@mcp-b/transports` の `TabServerTransport.send`）。「このオリジンに制限」という表現は不正確なので docs を「このオリジンからの受信のみ受け付ける」に修正
  - bridge は `navigator.modelContext`（旧名）にも同じオブジェクトを鏡映する。docs に明記
- privacy ページ（`src/i18n/site.ts`）に「ブラウザ内エージェント向けツール」の段落を ja/en で追加し、最終更新日を 2026-09-02 に。「外部に送信しない」は依然として真だが、「エージェントが呼べば進捗が渡る」データフローは明示すべきと判断
- 型: `webmcp-types`（spec 公式）と `@mcp-b/webmcp-types`（`@mcp-b/global` の d.ts が `/// <reference types>` で引く）が両方 `Document.modelContext` を宣言し、型が同一でないと TS2717 になる。→ `webmcp-types` は**外した**。型は `@mcp-b/global` 経由のものに一本化
