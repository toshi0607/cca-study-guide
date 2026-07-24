import { useEffect, useRef, useState } from 'preact/hooks';
import type { Locale } from '../i18n/locales';
import type { UiCopy } from '../i18n/ui';
import type { HandsOnProgress } from '../lib/storage';
import { Button } from './app/Button';

type HandsOnComponent = typeof import('./views/HandsOnView').HandsOnView;

export function HandsOnEntry(props: {
  locale: Locale;
  copy: UiCopy;
  records: Record<string, HandsOnProgress>;
  onStart: (guideId: string, revision: number) => boolean;
  onToggleStep: (guideId: string, revision: number, stepIds: string[], stepId: string, complete: boolean) => boolean;
  onComplete: (guideId: string, revision: number, stepIds: string[]) => boolean;
  onReconfirm: (guideId: string, revision: number) => boolean;
  onOpenCard: (cardId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  targetGuideId: string | null;
  onTargetOpened: () => void;
}) {
  const [HandsOn, setHandsOn] = useState<HandsOnComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setHandsOn(null); setError(false);
    void import('./views/HandsOnView').then(
      (module) => { if (!cancelled) setHandsOn(() => module.HandsOnView); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="guide-load-error panel" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.handsOn.loadError}</p><Button onClick={() => window.location.reload()}>{props.copy.handsOn.retry}</Button></section>;
  if (!HandsOn) return <section class="guide-loading panel" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.handsOn.loading}</p></section>;
  return <HandsOn {...props}/>;
}
