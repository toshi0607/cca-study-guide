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
    analyticsHeading: string;
    analyticsIntro: string;
    analyticsExclusions: string[];
    googleDataPrefix: string;
    googleDataLink: string;
    cookiesHeading: string;
    cookiesPrefix: string;
    optOutLink: string;
    cookiesSuffix: string;
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
        description: 'CCA Field Notesにおける学習データとアクセス解析の取り扱い',
      },
    },
    skipLink: '本文へ移動',
    noscript: 'この学習ノートのカード表示と進捗保存にはJavaScriptが必要です。',
    socialImageAlt: 'CCA Field Notesの設計図風カバー。5つの出題領域と配点、想起練習の流れを示す非公式学習ガイド。',
    languageNavigationLabel: '言語を選択',
    homeAriaLabel: 'CCA Field Notes トップへ',
    backToGuide: '学習ノートへ戻る →',
    privacy: {
      eyebrow: 'PRIVACY / ANALYTICS',
      heading: 'プライバシー',
      lead: 'このページでは、学習進捗とサイト利用状況の取り扱いを説明します。',
      studyDataHeading: '学習データと言語',
      studyData: 'カードの評価と復習予定だけを、このブラウザのlocalStorageに保存します。検索語やフィルターは保存しません。選択中の言語はURLのパス（日本語は /、英語は /en/）で表し、別の設定としてブラウザに保存しません。学習データのサーバーへの同期やアカウントとの紐付けは行いません。',
      analyticsHeading: 'アクセス解析',
      analyticsIntro: 'サイト改善のためGoogle Analytics 4を使用し、閲覧ページ、アクセス日時、ブラウザ・端末種別、おおよその地域などの基本的な利用状況を収集します。',
      analyticsExclusions: [
        '学習カードの内容、アプリ内検索語、評価、進捗データを独自イベントとして送信しません。',
        '広告ストレージ、広告向けユーザーデータ、広告パーソナライズを無効にしています。',
        'Google Signalsと広告パーソナライズ用シグナルを無効にしています。',
      ],
      googleDataPrefix: 'Googleによるデータの取り扱いは、',
      googleDataLink: 'Googleサービスを使用するサイトやアプリから収集した情報の利用方法',
      cookiesHeading: 'Cookieと無効化',
      cookiesPrefix: 'Google Analyticsは訪問を区別するためにCookieを使用します。ブラウザの設定でCookieを削除・制限できるほか、',
      optOutLink: 'Google Analyticsオプトアウト アドオン',
      cookiesSuffix: 'も利用できます。',
      contactHeading: 'お問い合わせ',
      contactPrefix: '記載内容への質問や修正依頼は、',
      contactSuffix: 'へお寄せください。',
      newTab: '（新しいタブで開く）',
      updated: '最終更新: 2026-07-15',
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
        description: 'How CCA Field Notes handles study data and site analytics',
      },
    },
    skipLink: 'Skip to main content',
    noscript: 'JavaScript is required to display study cards and save your progress.',
    socialImageAlt: 'Blueprint-style cover for CCA Field Notes showing five weighted exam domains and the retrieval-practice flow.',
    languageNavigationLabel: 'Choose language',
    homeAriaLabel: 'Go to the CCA Field Notes home page',
    backToGuide: 'Back to the study guide →',
    privacy: {
      eyebrow: 'PRIVACY / ANALYTICS',
      heading: 'Privacy',
      lead: 'This page explains how study progress and site-usage data are handled.',
      studyDataHeading: 'Study data and language',
      studyData: 'Only card ratings and review schedules are saved in this browser’s localStorage. Search terms and filters are not saved. Your selected language is represented by the URL path (Japanese at / and English at /en/) and is not stored as a separate browser preference. Study data is neither synchronized to a server nor linked to an account.',
      analyticsHeading: 'Analytics',
      analyticsIntro: 'To improve the site, Google Analytics 4 collects basic usage information such as pages viewed, access times, browser and device type, and approximate region.',
      analyticsExclusions: [
        'Study-card content, in-app search terms, ratings, and progress data are not sent as custom events.',
        'Ad storage, ad user data, and ad personalization are disabled.',
        'Google Signals and signals used for ad personalization are disabled.',
      ],
      googleDataPrefix: 'For details about how Google handles this data, see ',
      googleDataLink: 'How Google uses information from sites or apps that use our services',
      cookiesHeading: 'Cookies and opting out',
      cookiesPrefix: 'Google Analytics uses cookies to distinguish visits. You can delete or restrict cookies in your browser settings, or use the ',
      optOutLink: 'Google Analytics Opt-out Browser Add-on',
      cookiesSuffix: '.',
      contactHeading: 'Contact',
      contactPrefix: 'For questions or correction requests, please open an issue in ',
      contactSuffix: '.',
      newTab: '(opens in a new tab)',
      updated: 'Last updated: July 15, 2026',
    },
  },
} as const satisfies Record<Locale, SiteCopy>;
