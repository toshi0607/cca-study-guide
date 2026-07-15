export const locales = ['ja', 'en'] as const;

export type Locale = (typeof locales)[number];

export const localePaths = {
  ja: { app: '/', privacy: '/privacy/' },
  en: { app: '/en/', privacy: '/en/privacy/' },
} as const satisfies Record<Locale, { app: string; privacy: string }>;
