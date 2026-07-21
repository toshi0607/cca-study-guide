import { locales, localePaths, type Locale } from '../../i18n/locales';
import type { UiCopy } from '../../i18n/ui';

export function LanguageNav({ locale, copy, modifier }: { locale: Locale; copy: UiCopy; modifier?: string }) {
  return (
    <nav class={`language-switcher${modifier ? ` language-switcher--${modifier}` : ''}`} aria-label={copy.aria.languageNavigation}>
      {locales.map((option) => (
        <a
          key={option}
          href={localePaths[option].app}
          lang={option}
          hrefLang={option}
          aria-current={locale === option ? 'page' : undefined}
        >
          {copy.languageNames[option]}
        </a>
      ))}
    </nav>
  );
}
