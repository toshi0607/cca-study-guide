# Remotion製SNS告知動画（video/）制作

Previous plan (progress-import, PR #24) completed and merged; replaced by the
promo-video plan below.

Branch: claude/remotion-promo-video（origin/main 0b435d0 から作成）

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| video/ は独立プロジェクト（自前package.json）でアプリ本体に無影響 | user msg | `git diff origin/main --stat` が video/・README・.gitignore・tasks/ のみ |
| アプリ側 pnpm test / pnpm build がパスし続ける | user msg | 両コマンド exit 0 |
| MP4はコミットしない（.gitignore対象） | user msg | `git status` にmp4が出ない |
| 1920×1080・約30秒・H.264 | user msg | ffprobe 出力 |
| 最新Remotionドキュメント参照で実装（記憶で書かない） | user msg (MUST) | librarianレポート出典 |
| scaffold は公式手段（create-video）+ pnpm | user msg (MUST) | コマンド履歴 |
| フォントは @remotion/google-fonts のフル版（public/fonts/のサブセット版は使わない） | user msg | video/ 内 import 記述 |
| デザイントーンは global.css 踏襲（ink#173447/cyan#087e9b/方眼紙/Barlow Condensed/Zen Kaku Gothic New） | user msg | フレームPNG目視 |
| 実画面スクショを video/assets/ に取り込みモックフレーム内で動き | user msg | コンポジション実装 |
| 動画・投稿文に「Anthropic非公式・非提携」明記 | user msg (MUST) | フレームPNG目視 + PR本文 |
| 試験問題・Exam Guide本文の引用禁止 | user msg (MUST NOT) | 字幕テキストレビュー |
| Anthropicロゴ・公式ブランド素材の使用禁止 | user msg (MUST NOT) | アセット一覧確認 |
| アプリ本体コード変更禁止（video/追加とREADME追記以外） | user msg (MUST NOT) | git diff --stat |
| SNS投稿はしない（草案のみ） | user msg (MUST NOT) | — |
| README に video/ 説明とレンダリング手順を1段落追記 | user msg (MUST) | README diff |
| コミット末尾 Co-Authored-By / PR末尾 Generated with | user msg + rules | git log / PR body |
| 音声なしで伝わる字幕構成（BGM・ナレーション不要） | user msg | コンポジション実装 |
| 文字は大きく1画面1メッセージ | user msg | フレームPNG目視 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| サイトURLは https://cca.toshi0607.com | VERIFIED | astro.config.mjs:5 |
| .vercelignore は存在しない。Vercelはstatic Astroビルドで video/ は出力に含まれない | VERIFIED | ls結果 NO .vercelignore / astro.config output:static |
| pnpm-workspace.yaml なし → video/package.json はrootのpnpmに干渉しない | VERIFIED | リポジトリrootのls に存在せず |
| ビュー切替は rail nav の button クリック（today/guide/practice/quiz/progress） | VERIFIED | App.tsx:660 |
| シナリオ演習は quiz ビュー内のモード | VERIFIED | App.tsx quiz-view + README |
| 領域重み D1 27% / D2 18% / D3 20% / D4 20% / D5 15% | VERIFIED | today/guideビュー実スクショの表示と一致 |
| Remotionの正確なAPI | UNVERIFIED | librarianレポート待ち（実装開始前に受領） |

## Plan

- [x] 1. リポジトリ調査（デザイントーン・URL・ビュー構造）
- [x] 2. origin/main から新ブランチ claude/remotion-promo-video 作成
- [x] 3. Remotion最新ドキュメント調査（librarian）→ レポート受領（v4.0.490、一次情報出典付き）
- [x] 4. アプリを dev 起動し、Playwrightで7枚（today/guide/practice/quiz/scenario-list/scenario/weak）の高解像度スクショ（3200×2000, devToolbar除去, 進捗データseed済み）
      検証: 全PNGをReadで目視済み（文字化け・崩れなし）→ video/assets/ へコピー済み
- [x] 5. `pnpm create video@latest --yes --blank video` で scaffold（tailwind除去、@remotion/google-fonts追加、nested .gitなし）
      検証: pnpm install 成功、npx tsc exit 0
- [x] 6. コンポジション実装（900frames@30fps=30秒・1920×1080・6シーン・BarlowCondensed/ZenKakuGothicNew）
      検証: npx tsc / eslint 0 error、render成功
- [x] 7. レンダリング + 目視検証3周（白帯→object-fit cover修正、見出し折返し→72px修正、演習スクショ不正解表示→未回答で撮り直し）
      検証: ffprobe = 30.06s / 1920x1080 / h264 / 30fps。f70/220/390/490/555/600/700/850 目視OK
- [x] 8. MP4はvideo/.gitignoreの`out`で除外（git check-ignoreで確認）+ README 1段落追記
- [x] 9. アプリ側 pnpm test（55 passed）/ pnpm build（Complete）exit 0
- [ ] 10. コミット・push・PR作成（本文にSNS投稿草案）
- [ ] 11. 最終報告（MP4絶対パス・尺・解像度・サイズ・フレームPNGパス）

## Notes

- 実行環境は worktree: .claude/worktrees/performance-optimization-plan-1fff03（ブランチ claude/remotion-promo-video）
- スクショはアプリの @playwright/test を node_modules 経由で利用（アプリのコードは変更しない）
- 【指示との乖離】想起カードは指示の「約70枚」ではなく実数51枚（src/content/cards.ts、進捗ビュー表示とも一致）。動画・投稿文は実数51枚を採用
- 【制約衝突の解消】`astro check`がvideo/のReact TSXをPreact設定で型検査し73エラー→アプリbuild失敗。「build必須」と「アプリ設定変更禁止」が衝突するため、ランタイム無影響の最小変更として root tsconfig.json に `"exclude": ["dist", "video"]` を追加（dist は astro base tsconfig の既定excludeを維持するため明記）。PR本文で明示する
- scaffold直後の`--yes --blank`はTailwind込みだったため、ドキュメント記載の素のblank構成に合わせて除去
- レンダリングMP4には無音AACトラックが含まれる（Remotion既定。SNS投稿には無害）

## Review

（未実施）
