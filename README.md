# CCA Field Notes

Claude Certified Architect – Foundations（CCAR-F）の公開出題範囲を、日本語の独自要約と想起カードで学ぶ非公式Webアプリです。

## 方針

- Anthropic非公式・非提携
- 2026年7月の公式Exam Guide v1.0にある5領域・30タスクを独自に短く要約
- 練習カードは公開中の公式プロダクトDocsから独自作成
- 実試験問題、記憶から再構成した問題、非公開教材、公式サンプル問題は掲載しない
- 進捗はブラウザのlocalStorageだけに保存

## 開発

```sh
pnpm install
pnpm dev
pnpm test
pnpm test:e2e
pnpm build
```

Astroの静的ビルドを使用します。サーバー、APIキー、データベースは不要です。

## 公式情報

- [Certification page](https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification)
- [Exam Guide v1.0](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)

最終確認: 2026-07-14

## License

Source code is released under the MIT License. Study content is independently authored; Anthropic product and certification names remain the property of their respective owners.
