import { useEffect, useRef, useState } from 'preact/hooks';
import type { Locale } from '../i18n/locales';
import type { UiCopy } from '../i18n/ui';
import { Button } from './app/Button';

type OfficialScenariosComponent = typeof import('./views/OfficialScenariosView').OfficialScenariosView;

export function OfficialScenariosEntry(props: {
  locale: Locale;
  copy: UiCopy;
  onOpenCard: (cardId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  onOpenPracticeScenario: (scenarioId: string) => void;
  onOpenHandsOnGuide: (guideId: string) => void;
}) {
  const [View, setView] = useState<OfficialScenariosComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null); setError(false);
    void import('./views/OfficialScenariosView').then(
      (module) => { if (!cancelled) setView(() => module.OfficialScenariosView); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="guide-load-error panel" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.officialScenarios.loadError}</p><Button onClick={() => window.location.reload()}>{props.copy.officialScenarios.retry}</Button></section>;
  if (!View) return <section class="guide-loading panel" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.officialScenarios.loading}</p></section>;
  return <View {...props}/>;
}
