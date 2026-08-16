# PRD: CCA Field Notes MCP Server

Status: Draft v0.1（本人レビュー待ち） / 2026-08-16
作業台帳: `tasks/todo.md`（Constraints / Assumptions はそちらが正）

## 1. 背景と目的

CCA Field Notes は静的サイトで、AI との study session では現状 `src/content/*.ts` を
会話のたびに直読みし、出題・採点・復習期日の判定を会話内で再現している。これは
(a) トークン消費が大きく、(b) アプリ実装（scheduler / quiz の重み付け抽選）と挙動が
乖離しうる。

本プロジェクトの目的は二層:

1. **学習**: MCP 仕様 (2026-07-28 revision) をサーバー自作を通じて理解する。
   FDE 論点リスト B3（3 プリミティブ）・B4（サーバ自作）、CCA Domain 2
   「ツール設計とMCP統合」（出題比重 18%、objectives 2.1–2.5）に対応する。
2. **実用**: study session の出題・採点・復習判定をアプリと同一のロジック
   （`src/lib/`）で提供し、トークン効率と正確性を上げる。

学習が目的の半分であるため、**設計判断の過程そのものが成果物**である。各フェーズの
判断は学習ノート（Phase 5）で CCA / FDE 論点に対応づけて記録する。

## 2. ユーザーとユースケース

ユーザーは toshi0607 本人のみ。ローカル・シングルユーザー・stdio。

- **UC1 復習セッション（PC / Claude Code）**: 期日が来たカードを scheduler 準拠で
  取得 → 出題 → again/hard/good 評価 → アプリに取り込める import JSON を生成
- **UC2 クイズ演習**: ドメイン重み付け抽選（`pickQuizQuestions`）→ 解答判定
  （`classifyAnswer`）→ 結果記録
- **UC3 コンテンツ参照**: カード・設問・シナリオ・学習ガイドを ID / ドメイン /
  スキル軸で取得（resources 中心）
- **UC4 弱点サマリ**: export JSON を入力に学習状況ダイジェストを返す
  （`study-summary` 相当）

### 運用ループ（v1 で意識的に受け入れる手動手順）

進捗の正は localStorage なので、UC1/UC4 の 1 セッションは必ずこのループになる:

1. ブラウザ（PC）でアプリから進捗 JSON をエクスポートする（手動）
2. MCP セッションを実行する（サーバーはその JSON を読み、終了時に import 用 JSON を生成）
3. ブラウザでその JSON をインポートする（手動）

つまり **セッションごとに手動のエクスポート/インポートが 1 回ずつ発生する**。
merge は「新しい復習が勝つ」設計（`src/lib/study-data-merge.ts`）なので取り込みは
安全だが、手数はゼロにならない。この摩擦の低減（ファイル監視・固定パス運用など）は
設計 doc の論点とし、抜本策は §8 Roadmap。

### デバイス実態という制約

study session は PC、カード練習はスマホで行われ、進捗は端末ごとの localStorage に
分断している。**v1 は「PC の export JSON を進捗の入力とする」運用を前提**とし、
スマホ側進捗の橋渡しは §8 Roadmap で扱う（v1 の non-goal）。

## 3. スコープ (v1)

- `mcp/` 独立パッケージ（`video/` と同型: 自前の package.json + lockfile、pnpm
  workspace 不使用。アプリのビルド・CI から隔離）
- TypeScript SDK v2（`@modelcontextprotocol/server` 2.0.0、spec 2026-07-28 準拠）
- トランスポートは **stdio のみ**（ローカル利用・OAuth 不要・外部送信なし）
- サーバープリミティブ 3 種をすべて使う（学習目的のため意図的に全種採用）:
  - **Tools**: 出題・判定・復習スケジュール・サマリ（契約は設計 doc で定義）
  - **Resources**: コンテンツの URI 公開（`cca://` スキーム、Resource Template 含む）
  - **Prompts**: セッション開始テンプレート（復習 / 弱点特訓など）
- 進捗はアプリの export JSON（StudyDataV3）を読み、書き戻しは **既存スキーマ準拠の
  import 用 JSON を生成**する（merge import がべき等であることに依拠）
- 検証: MCP Inspector + Claude Code（`claude mcp add`、scope は project を想定）

## 4. Non-goals (v1)

- Streamable HTTP / OAuth 2.1（実装しない。設計論点として学習ノートで扱う —
  FDE E 領域の権限設計・observability の素材）
- サーバー独自の進捗永続化（アプリと二重管理になるため。localStorage が唯一の正）
- デバイス間同期・スマホ進捗の自動取り込み（§8）
- 実試験問題・公式スコア・合否示唆に関わる一切（アプリ本体と同じガードレール）
- アプリ本体のコード・ビルド・CI への変更（例外: AGENTS.md 地図の更新と、
  `claude mcp add --scope project` が書くリポジトリ直下の `.mcp.json` — Domain 2.4
  のスコープ選定判断として明示的に許容）

## 5. 成功基準

1. Claude Code から接続し UC1–UC4 が実行できる（v2 SDK の接続性は Assumption。
   棄却時は v1 SDK にフォールバックし、その差分自体を学習ノートに記録する）
2. 復習セッション 1 回あたりの入力トークンが「content TS 直読み」比で減ることを
   実測して記録する（目安: カード取得系で 1/10 以下）
3. 学習ノートに CCA Domain 2 objectives 2.1–2.5 / FDE B3・B4・E の各論点と
   「実装のどこでそれを学んだか」の対応表が埋まっている
4. `pnpm build` と既存 CI が無変更で green（隔離の証明）

## 6. 制約

`tasks/todo.md` の Constraints 表が正。要点: 非公式表記の維持、外部送信なし、
content ID / storage schema 互換性契約の遵守、依存は `mcp/` に隔離。

## 7. 学習マッピング（何をどこで学ぶか）

| 論点 | 本プロジェクトでの学び場 |
| --- | --- |
| CCA 2.1 ツール境界 / FDE B3 | ツール契約設計（何を 1 ツールにするか、引数粒度） |
| CCA 2.2 構造化エラー | エラー設計（`isError` と JSON-RPC エラーの使い分け） |
| CCA 2.3 ツール数と選択 | ツール数の抑制判断、Claude Code の Tool Search との関係 |
| CCA 2.4 スコープと資格情報 | `claude mcp add` の local/project/user スコープ選定 |
| CCA 2.5 組み込みツール責任 | 「Read で足りるものをツール化しない」判断 |
| FDE B4 サーバ自作 | scaffold〜実装〜Inspector/Claude Code 検証の全工程 |
| FDE E 領域（権限・observability） | HTTP+OAuth を「実装しない理由」の設計判断、stderr ログ設計 |
| spec 2026-07-28 ステートレス化 | セッション状態を持たない設計（進捗を JSON 入出力で扱う構造はこれと整合） |

## 8. Roadmap（v1 後の候補、着手判断は別途）

- スマホ進捗の橋渡し: 候補 (a) クラウドドライブ経由で export JSON を受け渡し
  (b) アプリに「共有」導線を足す (c) PC に運用を寄せる — ペインの実態を見て選ぶ
- Streamable HTTP + OAuth 2.1 化（E 領域の実地学習として）
- ツール呼び出しの eval / observability（呼び出しログ→振り返り）

## 9. Open questions

- OQ1: 書き戻し（import JSON 生成）の契約 — セッション評価を 1 カードずつ受けるか、
  セッション末にまとめて受けるか（設計 doc で決める）
- OQ2: サーバー名 / パッケージ名（`cca-field-notes-mcp` 仮）
- OQ3: 学習ノートの置き場（`mcp/LEARNING.md` 仮）
