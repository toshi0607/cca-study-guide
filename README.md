# CCA Field Notes

Claude Certified Architect – Foundations（CCAR-F）の公開出題範囲を、日本語の独自要約と想起カードで学ぶ非公式Webアプリです。

## 方針

- Anthropic非公式・非提携
- 2026年7月の公式Exam Guide v1.0にある5領域・30タスクを独自に短く要約
- 練習カードは公開中の公式プロダクトDocsから独自作成
- 実試験問題、記憶から再構成した問題、非公開教材、公式サンプル問題は掲載しない
- 想起カードに加え、独自作成問題による選択式演習（単一選択・複数選択、即時フィードバックと領域別サマリ付き）を収録。本試験の再現ではない
- 選択式演習にはシナリオ演習モードを収録。架空企業のケース記述を読んでから紐づく設問群に答える形式に慣れるための独自教材で、本試験のシナリオの複製・再現ではない
- 練習ビューには一覧表示に加えて集中レビューセッションを収録。フィルタ結果を1枚ずつ「思い出す→開示→評価」で回し、キーボードショートカット（Space/Enterで開示、1/2/3で評価、Escで中断）にも対応
- 進捗はブラウザのlocalStorageだけに保存
- Google Analyticsは設定時に通常読み込みし、ページ閲覧以外の学習データを独自イベントとして送信しない

## 開発

```sh
pnpm install
pnpm assets:generate
pnpm dev
pnpm test
pnpm test:e2e
pnpm build
```

Astroの静的ビルドを使用します。サーバー、APIキー、データベースは不要です。

### Webフォント

見出し用フォント（Barlow Condensed / Zen Kaku Gothic New）は、使用文字だけにサブセットしたwoff2を`public/fonts/`にコミットしてセルフホストしています。見出しやUI文言を変更してサブセットに文字が足りなくなると`pnpm test`が失敗するので、その場合は次で再生成してください。

```sh
pnpm build
pnpm fonts:subset
```

ファイル名には内容ハッシュが含まれ、参照は`public/fonts/manifest.json`経由で自動追従します。生成物のwoff2とmanifestはコミットしてください。

## Google Analytics

GA4のWebデータストリームに表示される測定IDを、Production環境のみに設定します。未設定ならGoogleタグとアクセス解析の表示は出力されません。不正な形式はビルドエラーになります。

```sh
vercel env add PUBLIC_GA_MEASUREMENT_ID production
vercel deploy --prod
```

値は`G-...`形式です。設定時は`gtag.js`を通常読み込みし、広告ストレージ・広告向けユーザーデータ・広告パーソナライズを拒否した状態で基本ページビューを設定します。Google Signalsと広告パーソナライズ用シグナルも無効で、GA Cookieはアクセス中のホストだけに限定します。アプリ独自のカスタムイベントは実装していません。ページビューだけに限定する場合は、GA4 Webデータストリーム側でも「拡張計測」を無効にしてください。利用者向け説明は`/privacy/`に掲載します。

## 公式情報

- [Certification page](https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification)
- [Exam Guide v1.0](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)

最終確認: 2026-07-14

## License

Source code is released under the MIT License. Study content is independently authored; Anthropic product and certification names remain the property of their respective owners.
