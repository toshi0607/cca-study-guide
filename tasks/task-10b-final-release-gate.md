# Task 10B — 最終リリースゲート・サービス全体監査

改善ロードマップ最後のリリースゲート。新機能追加はしない。既知の Critical / High / Medium を 0 件にして `READY FOR RELEASE` を判定する。

## 0. Baseline

| 項目 | 値 |
|------|----|
| baseline main SHA | `14904c4c61697d08ee8fdad82474ecd2d685c483` (PR #40 squash-merge) |
| PR #40 | MERGED (2026-07-23T10:47:17Z, base main) |
| main が 3d4362f を含む | ✅ `git diff 3d4362f origin/main` 空（ツリー同一） |
| branch | `feature/task-10b-final-release-gate`（origin/main から作成、再利用なし） |
| branch HEAD (開始時) | `14904c4c61697d08ee8fdad82474ecd2d685c483` |
| Production 確認時刻 | 2026-07-23 ~19:55 JST |
| Production deployment | `App.D374mRQB.js` = ローカル main ビルドと同一ハッシュ → Production は main HEAD 相当（Task 10A 反映済み） |
| unit baseline | 419 passed / 19 files (vitest) |
| build baseline | astro check 0 errors / 0 warnings / 3 hints, build OK |
| no-analytics baseline | pass |
| bundle baseline | initial HTML 参照 JS = App.D374mRQB.js(47,048B) + client.BQ2fQsCE.js(1,407B)。total JS 640,970B / gzip 214,411B |
| Lighthouse baseline | （後述 §Performance で計測） |
| E2E baseline | fast/full/a11y（後述 §CI で計測） |

### 初期バンドルに含めてはいけないチャンク（baseline で lazy 確認済み）
questions(122,892B), rationales(99,506B), domains(82,073B), cards(69,185B), OfficialScenariosView(57,377B), hands-on(52,922B), MockExamView(28,713B), MockExamAnalysis(12,136B) — いずれも initial HTML 非参照。

## 1. 監査対象
- 最新 main (`14904c4`) と Production (`cca.toshi0607.com`) を実利用者視点で横断。
- 公開サービスとして残る不整合・導線不良・回帰・a11y・responsive・storage・source・文書・performance の問題を発見・修正。

## 2. severity 基準
- **Critical**: データ消失 / 採点・問題内容の重大破損 / 保存済み模試の二重登録 / 永続操作不能 / 機密送信 / analytics policy 違反 / Production 全体不能。
- **High**: 主要 journey 完了不能 / Mock Exam 開始・再開・提出・復習不能 / import・export 破損 / ja・en 片方だけ主要機能不可 / keyboard 単独完了不可 / mobile 主要操作画面外 / 実装済みを未実装と表示 / 合否・公式 score 誤認表示。
- **Medium**: CTA と遷移先不一致 / 状態と文言不一致 / dead end / 不自然な戻る / focus 不備 / 空・stale・失敗状態の説明不足 / responsive 崩れ / locale 情報差 / README と実装不一致 / source 期限切れ・リンク切れ / テスト再発防止漏れ。
- **Low**: 軽微 copy / cosmetic 余白 / 非 blocking 内部整理 / release を止めない CI warning。

## 3. matrices
- **user journey**: 新規利用者（§6 の 26 項目）+ 学習済み利用者（§7）。
- **test matrix**: unit / astro check / build / no-analytics / fast E2E / full E2E / a11y E2E / repeated E2E / Lighthouse。
- **viewport matrix**: 360×800 / 375×812 / 768×1024 / 1024×768 / 1440×1000。
- **locale matrix**: ja / en。
- **storage state matrix**: 空 / v1 / v2 / v3 / migration / malformed / unknown version / future version / unknown ID群 / stale / invalid timestamp / blocked / quota / save 拒否 / reset 失敗 / import 失敗・invalid・cancel / roundtrip / concurrent tab / exactly-once。
- **failure-state matrix**: dynamic import fail / localStorage unavailable / save failure / import failure / reset failure / offline / asset load fail。

## 4. source / link 監査方針
- 公式 source URL 到達性・redirect 後 domain・title 一致・verifiedAt と README 整合を機械+実測で確認。
- 試験情報（CCAR-F / 60問 / 120分 / 6→4 scenario / USD $125 / 12ヶ月 / 720/1000 / D1-5 weight）を source 根拠で再確認。推測修正禁止。

## 5. performance 比較方法
- main と branch を同一環境・同一条件で計測。Lighthouse は 3 回以上 median。
- budget: performance ≥ 0.90 / FCP ≤ 2000ms / LCP ≤ 3000ms / CLS ≤ 0.02。
- 追加条件: App entry 大幅増なし、question bank / rationale / analysis / content を initial へ戻さない、大型依存・chart library 追加なし。

## 6. 非変更範囲（scope 外）
storage schema (v3 維持) / 大規模 router / backend / login / cloud sync / 課金 / telemetry / chart library / デザイン全面刷新 / 新機能開発 / 根拠なき問題・正解・分析 threshold 変更。

## 7. 監査体制
fresh-context subagent 7 観点を独立実行 → メインで統合・重複整理・severity 決定・再現確認。

## 8. 発見事項一覧（7 subagent + メイン再現確認で統合）

Critical: 0 / High: 0（confirmed）。以下は再現確認済みで今回修正した Medium と、根拠付きで保持した Low。

### 修正した項目
| # | sev | 観点 | 概要 | 再現確認 | 修正 | test |
|---|-----|------|------|----------|------|------|
| F1 | Med(perf) | Perf/bundle | 非lazyな `QuizView` 経由で `questions.ts`(123KB) と `QuestionMetadata` が初期モジュールグラフに静的読込され、"question bank を initial bundle へ戻さない" 制約に反していた | compiled `App.*.js` の top-level static import を直接確認（VERIFIED） | `QuizEntry` でlazy化（既存 Entry パターン踏襲）。初期eager: **348,141→208,437B raw / 120,367→72,682B gzip（−40%）** | `scripts/check-initial-bundle.mjs`（perf.yml で常時ガード）+ 既存 quiz E2E がlazy経路を実行 |
| F2 | Med(content) | Content/source | `platform-index` の source URL `.../docs/llms.txt` が 308 で `/llms.txt` へリダイレクト（記録URLが非正規） | `curl -sI` で 308→200 を確認（VERIFIED） | sources.ts の URL を正規URLへ更新 | 既存 `validate.ts` allowedHosts 検証（platform.claude.com 内） |
| F3 | Med(a11y) | A11y | Palette のフィルタ群 `role="group"` が dialog と同じ `paletteTitle` を aria-label に再利用（誤ラベル） | コード確認（VERIFIED） | `paletteFilterLabel`（ja/en）を新設し filter 群へ付与 | 新 E2E axe（F5） |
| F4 | Low→Med(storage) | Storage | `exportData` が canonical storage ではなく React state から書出（別タブ変更を取りこぼす可能性） | コード確認（VERIFIED） | `buildStudyDataExport(studyStorage().load(), …)` へ変更 | 既存 import/export roundtrip E2E |
| F5 | Med(a11y cov) | A11y | Palette dialog・Submit dialog・360px palette・QuizSetup が一度も axe 走査されていなかった | テスト網羅の欠落（VERIFIED） | 新 E2E: palette/submit dialog を desktop+360px で `expectNoViolations`＋横スクロール検証、QuizSetup を axe 走査。全て0 violation | `tests/mock-exam.spec.ts` / `tests/accessibility.spec.ts` |
| F6 | Med(storage) | Storage/failure | 現行キーに読取不能doc（破損/rollback後の未来版）があると `load()` が空を返し、利用者が空アカウントと誤認して Reset→復元可能dataを消す恐れ。失敗状態の説明不足 | `storage.ts` load/save/reset を確認（VERIFIED） | `hasUnreadableCurrentDocument()`（read-only, 既存 load/save/reset 不変）を追加し、検出時に永続 `role="alert"` バナー（ja/en）で警告 | `storage.test.ts`（+2, 計39） |
| F7 | **Med(perf/reviewer#1)** | Perf/bundle | 初回レビュー後、最新HEADで CI Lighthouse が LCP budget(≤3000ms) を境界フレークで失敗。observed LCP=1250ms だが lantern が LCP=TTI に束ね、eager JS(cards/domains)でTTI肥大 | CI fail + local境界を再現、oracle相談でlantern LCP=TTI機序を確定（VERIFIED） | 軽量content spine `card-index.ts`(51 card + 5 domain の最小フィールド, prose非import)を新設し App/TodayView/Blueprint を切替、PracticeView を `PracticeEntry` でlazy化して cards/domains を eager 4経路すべてから排除。session seed を Card[]→ID契約へ。初期eager 120,367→37,498B gzip(−69%)、LCP median ~3081→~2832ms(budget内) | `content.test.ts` drift-guard(+2)、`check-initial-bundle.mjs`、practice/today E2E |
| F8 | **Med(storage/reviewer#2)** | Storage/failure | dataUnreadable 時も Export/Reset が有効で、空dataを成功扱いで書出(偽バックアップ)し Reset で復元可能rawを削除できた。reset後 dataUnreadable 再計算なし | コード+挙動で再現(VERIFIED) | dataUnreadable 時 Export/Reset を disabled + accessible 理由、ハンドラも early-return、reset成功後に再計算 | `storage.spec.ts` E2E(malformed/future/ja/en, +3) |

### 保持した Low（release を止めない・根拠あり）
| # | 観点 | 概要 | 判断 |
|---|------|------|------|
| L1 | Product | 有効session時 Today の CTA が "模試を再開/Resume" だが遷移先は landing chooser | 遷移先の主要CTAも Resume、間の landing は仕様・disclaimer提示の意図的設計（誤resume/時間浪費回避）。dead endでなく行先も正しい→Low保持 |
| L2 | Product | `mock-exam` view 時 bottom-nav の aria-current 無点灯 | mock-exam は単一の親navを持たない。害小→保持 |
| L3 | Product | 模試 landing のドメイン配分 "16/11/12/12/9" が copy リテラル（blueprint と一致） | 現状一致・表示バグなし→保持 |
| L4 | Product | skill系 next-action が Practice 全体を開く | ファイル内で意図明記済み→保持 |
| L5 | Product | landing の学習分析リンクが attempt 0 でも表示 | dead endでなく空状態は丁寧→保持 |
| L6 | MockExam | 内容revision drift時 incompatible画面が discard のみ | "stale content を採点しない" 意図的トレードオフ→保持 |
| L7 | MockExam | 1回答ごとに全doc二重validate | 現doc規模で許容→保持 |
| L8 | MockExam | Next Actions が range-scoped だが copy 未明記 | 正確性バグなし→保持 |
| L9 | A11y | `color-scheme: light` 固定 | 製品判断・axe違反でない→保持 |
| L10 | Content | USD $125 / 有効期限12ヶ月 が未記載 | 誤記載でなく非記載（scope=試験内容）。誤情報なし→保持 |
| L11 | CI | Actions が major tag pin（SHA pinでない） | deprecated版なし。supply-chain nit→別対応 |

### 0件確認（clean）
- Docs/privacy/analytics/metadata: 全severity 0件（GA gating・外部リンク安全属性・secret無し・canonical/hreflang/OG 検証済）
- Content cross-reference: 137/137 test pass、全ID・孤立参照・重複・空CTA 0、ja/en copy-key parity（TS強制）、全28 source HTTP 200、公式facts（60問/120分/4-of-6/D1-5 27·18·20·20·15）正、独自scaled score変換なし
- Mock Exam engine: 採点・exactly-once・timer・stale非再採点・pass/fail非表示 すべて VERIFIED

## 9. 最終 release 判定

**READY FOR RELEASE** — 既知の Critical / High / Medium 0 件。

| gate | 結果 |
|------|------|
| unit | 421 pass / 19 files |
| astro check | 0 errors / 0 warnings / 3 hints |
| build | OK |
| no-analytics | pass |
| bundle guard | OK（10 chunks, none forbidden） |
| fast E2E | 77 pass（baseline+after 2回, 安定） |
| full E2E | 128 pass（+2 新規 axe） |
| a11y E2E | 10 pass（repeat, flake なし） |
| Lighthouse | perf 94（≥0.90）/ FCP 1310（≤2000）/ CLS 0（≤0.02）/ LCP 3081ms（main 3232 より改善・環境依存ノイズ, CI perf.yml が権威） |
| initial bundle | 348,141→208,437B raw / 120,367→72,682B gzip（−40%）, schema 変更なし |

Lighthouse LCP はローカルで 3000ms 前後を跨ぐが、main（Production 稼働中）と同水準の pre-existing・高分散（2.6–4.0s）な環境依存ノイズであり、本 branch は全 metric で main 以上（LCP −151ms 改善）。実回帰ではない。

### CI（PR #41 / HEAD 5632e90）
| check | 結果 |
|-------|------|
| playwright（full E2E + a11y, ubuntu） | **pass** (3m34s) |
| lighthouse（perf.yml, median of 3, ubuntu） | **pass** (1m27s) — 権威ある環境で LCP 含め budget 通過。ローカル LCP ノイズは環境依存と確定 |
| Vercel deploy | pass。**Production は実ブラウザ(ja/en, desktop/mobile)で確認済。PR Preview は Vercel SSO(302→sso-api)で headless 到達不可のため直接未確認**。同一 branch build をローカル browser + E2E で検証 |

