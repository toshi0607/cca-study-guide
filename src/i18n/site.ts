import type { Locale } from './locales';

export type SitePage = 'app' | 'privacy';

type PageMetadata = {
  title: string;
  description: string;
};

type SiteCopy = {
  htmlLang: string;
  ogLocale: string;
  ogLocaleAlternate: string;
  metadata: Record<SitePage, PageMetadata>;
  skipLink: string;
  noscript: string;
  socialImageAlt: string;
  languageNavigationLabel: string;
  homeAriaLabel: string;
  backToGuide: string;
  privacy: {
    eyebrow: string;
    heading: string;
    lead: string;
    studyDataHeading: string;
    studyData: string;
    localOnlyHeading: string;
    localOnly: string;
    contactHeading: string;
    contactPrefix: string;
    contactSuffix: string;
    newTab: string;
    updated: string;
  };
};

export const siteCopy = {
  ja: {
    htmlLang: 'ja',
    ogLocale: 'ja_JP',
    ogLocaleAlternate: 'en_US',
    metadata: {
      app: {
        title: 'CCA Field Notes — 非公式学習ガイド',
        description: 'Claude Certified Architect – Foundations の公開出題範囲を学ぶ非公式ガイドと復習カード',
      },
      privacy: {
        title: 'プライバシー — CCA Field Notes',
        description: 'CCA Field Notesにおけるローカルの学習データの取り扱い',
      },
    },
    skipLink: '本文へ移動',
    noscript: 'この学習ノートのカード表示と進捗保存にはJavaScriptが必要です。',
    socialImageAlt: 'CCA Field Notesの設計図風カバー。5つの出題領域と配点、想起練習の流れを示す非公式学習ガイド。',
    languageNavigationLabel: '言語を選択',
    homeAriaLabel: 'CCA Field Notes トップへ',
    backToGuide: '学習ノートへ戻る →',
    privacy: {
      eyebrow: 'PRIVACY / LOCAL DATA',
      heading: 'プライバシー',
      lead: 'このページでは、学習進捗を端末内だけで扱う方法を説明します。',
      studyDataHeading: '学習データと言語',
      studyData: 'カードの評価と復習予定、ガイドとハンズオンの進捗、演習の回答統計、模擬試験の進行状況と履歴を、このブラウザのlocalStorageに保存します。検索語やフィルターは保存しません。選択中の言語はURLのパス（日本語は /、英語は /en/）で表し、別の設定としてブラウザに保存しません。学習データのサーバーへの同期やアカウントとの紐付けは行いません。',
      localOnlyHeading: '外部送信と第三者解析',
      localOnly: 'このサイトは第三者のアクセス解析、広告タグ、行動追跡を読み込みません。学習内容や進捗を外部へ送信する機能もありません。',
      contactHeading: 'お問い合わせ',
      contactPrefix: '記載内容への質問や修正依頼は、',
      contactSuffix: 'へお寄せください。',
      newTab: '（新しいタブで開く）',
      updated: '最終更新: 2026-08-11',
    },
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    ogLocaleAlternate: 'ja_JP',
    metadata: {
      app: {
        title: 'CCA Field Notes — Unofficial Study Guide',
        description: 'An unofficial guide and review-card collection for the published Claude Certified Architect – Foundations exam scope',
      },
      privacy: {
        title: 'Privacy — CCA Field Notes',
        description: 'How CCA Field Notes handles study data locally',
      },
    },
    skipLink: 'Skip to main content',
    noscript: 'JavaScript is required to display study cards and save your progress.',
    socialImageAlt: 'Blueprint-style cover for CCA Field Notes showing five weighted exam domains and the retrieval-practice flow.',
    languageNavigationLabel: 'Choose language',
    homeAriaLabel: 'Go to the CCA Field Notes home page',
    backToGuide: 'Back to the study guide →',
    privacy: {
      eyebrow: 'PRIVACY / LOCAL DATA',
      heading: 'Privacy',
      lead: 'This page explains how study progress stays on your device.',
      studyDataHeading: 'Study data and language',
      studyData: 'Card ratings and review schedules, guide and hands-on progress, practice-answer statistics, and mock-exam state and history are saved in this browser’s localStorage. Search terms and filters are not saved. Your selected language is represented by the URL path (Japanese at / and English at /en/) and is not stored as a separate browser preference. Study data is neither synchronized to a server nor linked to an account.',
      localOnlyHeading: 'No third-party analytics or tracking',
      localOnly: 'This site does not load third-party analytics, advertising tags, or behavioral tracking. It also has no feature that sends your study content or progress elsewhere.',
      contactHeading: 'Contact',
      contactPrefix: 'For questions or correction requests, please open an issue in ',
      contactSuffix: '.',
      newTab: '(opens in a new tab)',
      updated: 'Last updated: August 11, 2026',
    },
  },
} as const satisfies Record<Locale, SiteCopy>;
