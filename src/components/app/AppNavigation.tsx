import type { Locale } from '../../i18n/locales';
import type { UiCopy } from '../../i18n/ui';
import { LanguageNav } from './LanguageNav';
import type { View } from './types';

// Hands-on and the official-scenarios sub-area are reached from inside the Guide
// view (its learning path and entry sections), and the mock exam is launched from
// the Today view, not from the bottom navigation, so the 360px five-item bar stays
// uncrowded. They are therefore deliberately excluded from the navigable keys.
type NavKey = Exclude<View, 'hands-on' | 'official-scenarios' | 'mock-exam'>;
export const viewKeys: NavKey[] = ['today', 'guide', 'practice', 'quiz', 'progress'];
export const icons: Record<NavKey, string> = { today: '⌂', guide: '▤', practice: '◇', quiz: '☑', progress: '✓' };

type NavProps = { locale: Locale; copy: UiCopy; view: View; ready: boolean; onNavigate: (next: View) => void };

function NavButtons({ view, ready, copy, onNavigate }: Omit<NavProps, 'locale'>) {
  return (
    <>
      {viewKeys.map((key) => (
        // Hands-on and official-scenarios are Guide sub-views (not their own nav
        // items), so the Guide button stays marked current while inside them.
        <button key={key} disabled={!ready} aria-current={view === key || (key === 'guide' && (view === 'hands-on' || view === 'official-scenarios')) ? 'page' : undefined} onClick={() => onNavigate(key)}>
          <span aria-hidden="true">{icons[key]}</span>{copy.views[key]}
        </button>
      ))}
    </>
  );
}

export function AppHeader({ locale, copy, view, ready, onNavigate }: NavProps) {
  return (
    <>
      <header class="mobile-header">
        <div class="wordmark"><b>{copy.brand.mark}</b><span>{copy.brand.fieldNotes}</span></div>
        <div class="mobile-tools"><LanguageNav locale={locale} copy={copy} modifier="mobile"/><span class="unofficial">{copy.brand.unofficial}</span></div>
      </header>
      <aside class="rail">
        <div>
          <div class="wordmark"><b>{copy.brand.mark}</b><span>{copy.brand.fieldNotes}</span></div>
          <p class="edition">{copy.brand.edition}</p>
          <LanguageNav locale={locale} copy={copy} modifier="rail"/>
        </div>
        <nav aria-label={copy.aria.mainNavigation}>
          <NavButtons view={view} ready={ready} copy={copy} onNavigate={onNavigate}/>
        </nav>
        <p class="rail-note"><strong>{copy.brand.unofficial}</strong><br/>{copy.brand.affiliationShort}</p>
      </aside>
    </>
  );
}

export function AppBottomNav({ copy, view, ready, onNavigate }: Omit<NavProps, 'locale'>) {
  return (
    <nav class="bottom-nav" aria-label={copy.aria.mainNavigation}>
      <NavButtons view={view} ready={ready} copy={copy} onNavigate={onNavigate}/>
    </nav>
  );
}
