import { useEffect, useRef, useState } from 'preact/hooks';
import type { Locale } from '../i18n/locales';
import type { UiCopy } from '../i18n/ui';
import type { StudyGuideProgress } from '../lib/storage';
import type { LearningStageViewTarget } from './views/GuideView';

type GuideComponent = typeof import('./views/GuideView').GuideView;

export function GuideEntry(props: {
  locale: Locale;
  copy: UiCopy;
  records: Record<string, StudyGuideProgress>;
  hasMockExamAttempts: boolean;
  onProgressAction: (sectionId: string, revision: number, action: 'start' | 'complete' | 'reconfirm') => boolean;
  onOpenCard: (cardId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  onOpenStage: (target: LearningStageViewTarget) => void;
  onOpenOfficialScenarios: () => void;
}) {
  const [Guide, setGuide] = useState<GuideComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setGuide(null); setError(false);
    void import('./views/GuideView').then(
      (module) => { if (!cancelled) setGuide(() => module.GuideView); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="guide-load-error panel" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.guide.loadError}</p><button type="button" class="btn" onClick={() => window.location.reload()}>{props.copy.guide.retry}</button></section>;
  if (!Guide) return <section class="guide-loading panel" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.guide.loading}</p></section>;
  return <Guide {...props}/>;
}
