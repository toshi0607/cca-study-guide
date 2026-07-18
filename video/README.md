# CCA Field Notes 告知動画

CCA Field Notes のSNS告知動画（約30秒・1920×1080・H.264）を生成するRemotionプロジェクトです。アプリ本体からは独立しており、ここでの変更や依存はアプリのビルド・デプロイに影響しません。

## 使い方

```sh
pnpm install
pnpm dev                                  # Remotion Studioでプレビュー
npx remotion render promo out/promo.mp4   # レンダリング
```

静止フレームの確認は次のコマンドで行えます。

```sh
npx remotion still promo out/frame.png --frame=450
```

## 構成

- `src/Root.tsx` — コンポジション定義（`promo`: 900frames / 30fps / 1920×1080）
- `src/Promo.tsx` — シーン構成（フック → ガイド → 想起カード → 演習 → 苦手 → クロージング）
- `src/components.tsx` — ブラウザモックフレーム、見出し等の共通部品
- `src/theme.ts` — アプリの `src/styles/global.css` に合わせた配色・フォント（Barlow Condensed / Zen Kaku Gothic New を @remotion/google-fonts で読み込み）
- `assets/` — アプリ実画面のスクリーンショット（1600×1000 viewport・2x）

`out/` の生成物はコミットしません。

Remotionのライセンスは個人・小規模チーム（3名以下）は無料です。詳細は [remotion.dev](https://www.remotion.dev/) を参照してください。
