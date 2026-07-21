import type { Locale } from '../../i18n/locales';

export function dateLocale(locale: Locale) {
  return locale === 'ja' ? 'ja-JP' : 'en-US';
}

export function formatDate(value: Date | string, locale: Locale) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: 'long' }).format(date);
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(dateLocale(locale)).format(value);
}
