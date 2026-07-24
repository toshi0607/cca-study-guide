import { useRef } from 'preact/hooks';
import { formatDate } from '../app/format';
import { sources, VERIFIED_AT } from '../../content/sources';
import { localePaths, type Locale } from '../../i18n/locales';
import { type UiCopy } from '../../i18n/ui';
import type { ReviewState } from '../../lib/scheduler';
import type { HandsOnProgress, QuizStat, StudyGuideProgress } from '../../lib/storage';
import type { MockExamAttempt, MockExamSession } from '../../lib/mock-exam';
import { ProgressOverviewEntry } from './ProgressOverviewEntry';

export function ProgressView({
  locale, copy, reviews, studyGuideProgress, handsOnProgress, quizStats, activeMockExam, mockExamAttempts, dueCount,
  analyticsEnabled, dataUnreadable, onExport, onImportFile, onReset,
  onOpenGuide, onOpenHandsOn, onOpenPractice, onOpenQuiz, onOpenMockExam, onOpenMockExamAnalysis,
}: {
  locale: Locale;
  copy: UiCopy;
  reviews: Record<string, ReviewState>;
  studyGuideProgress: Record<string, StudyGuideProgress>;
  handsOnProgress: Record<string, HandsOnProgress>;
  quizStats: Record<string, QuizStat>;
  activeMockExam: MockExamSession | null;
  mockExamAttempts: readonly MockExamAttempt[];
  dueCount: number;
  analyticsEnabled: boolean;
  dataUnreadable: boolean;
  onExport: () => void;
  onImportFile: (event: Event) => void;
  onReset: () => void;
  onOpenGuide: () => void;
  onOpenHandsOn: () => void;
  onOpenPractice: () => void;
  onOpenQuiz: () => void;
  onOpenMockExam: () => void;
  onOpenMockExamAnalysis: () => void;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <section class="progress-view" aria-labelledby="progress-title">
      <header class="panel--hero"><p class="eyebrow">{copy.progress.eyebrow}</p><h2 class="page-title" id="progress-title">{copy.progress.title}</h2><p>{copy.progress.introduction}</p></header>
      <ProgressOverviewEntry
        locale={locale} copy={copy}
        reviews={reviews} studyGuideProgress={studyGuideProgress} handsOnProgress={handsOnProgress}
        quizStats={quizStats} activeMockExam={activeMockExam} mockExamAttempts={mockExamAttempts} dueCount={dueCount}
        onOpenGuide={onOpenGuide} onOpenHandsOn={onOpenHandsOn} onOpenPractice={onOpenPractice}
        onOpenQuiz={onOpenQuiz} onOpenMockExam={onOpenMockExam} onOpenMockExamAnalysis={onOpenMockExamAnalysis}
      />
      <section class="data-panel panel" aria-labelledby="data-title"><div><h3 class="section-title" id="data-title">{copy.progress.localData}</h3><p>{copy.progress.localDataDescription}</p>{analyticsEnabled && <p class="note note--info">{copy.progress.analyticsDisclosure}<a href={localePaths[locale].privacy}>{copy.progress.details}</a></p>}</div><div class="data-actions"><button class="btn" onClick={onExport} disabled={dataUnreadable} aria-describedby={dataUnreadable ? 'data-unreadable-actions-note' : undefined}>{copy.progress.exportJson}</button><button class="btn" onClick={() => importInputRef.current?.click()}>{copy.progress.importJson}</button><input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={onImportFile}/><button class="btn btn--danger" onClick={onReset} disabled={dataUnreadable} aria-describedby={dataUnreadable ? 'data-unreadable-actions-note' : undefined}>{copy.progress.reset}</button></div>{dataUnreadable && <p id="data-unreadable-actions-note" class="note note--danger">{copy.progress.dataUnreadableActions}</p>}</section>
      <section class="sources-panel panel" aria-labelledby="sources-title"><div><h3 class="section-title" id="sources-title">{copy.progress.sourcesTitle}</h3><p>{copy.progress.sourcesDescription}</p></div><div class="source-register">{sources.map((source) => <article key={source.id}><code>{source.id}</code><div><a href={source.url} target="_blank" rel="noreferrer"><span lang="en">{source.title}</span><span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a><p>{source.publisher} · {copy.progress.verified(formatDate(source.verifiedAt, locale))}</p></div></article>)}</div></section>
      <section class="disclaimer panel panel--accent" aria-labelledby="disclaimer-title"><h3 class="section-title" id="disclaimer-title">{copy.progress.disclaimerTitle}</h3><p>{copy.progress.disclaimerBody}</p><p>{copy.progress.blueprintVerified(formatDate(VERIFIED_AT, locale))} {copy.progress.reportIssueLead} <a href="https://github.com/toshi0607/cca-study-guide/issues" target="_blank" rel="noreferrer">{copy.progress.reportIssueLink}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>.</p></section>
    </section>
  );
}
