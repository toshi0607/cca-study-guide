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
