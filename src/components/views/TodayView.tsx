import { useMemo } from 'preact/hooks';
import { Blueprint } from '../app/Blueprint';
import { formatDate, formatNumber } from '../app/format';
import { cardIndex, domainIndex } from '../../content/card-index';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { ReviewState } from '../../lib/scheduler';
import type { MockExamAttempt, MockExamSession } from '../../lib/mock-exam';
import { isWeak } from '../../lib/weakness';

export function TodayView({ locale, copy, now, ready, reviews, dueCount, session, attempts, onStartDueReview, onOpenWeakDomain, onOpenMockExam, onOpenMockExamAnalysis }: {
  locale: Locale;
  copy: UiCopy;
  now: Date | null;
  ready: boolean;
  reviews: Record<string, ReviewState>;
  dueCount: number;
  session: MockExamSession | null;
  attempts: readonly MockExamAttempt[];
  onStartDueReview: () => void;
  onOpenWeakDomain: (domainId: string) => void;
  onOpenMockExam: () => void;
  onOpenMockExamAnalysis: () => void;
}) {
  // CTA reflects the exam state: resume a running session, reopen results when an
  // attempt exists, otherwise start fresh. Opening the analysis is a separate
  // auxiliary link surfaced only once there is an attempt to analyze.
  const hasAttempt = attempts.length > 0;
  const mockExamCtaLabel = session
    ? copy.mockExam.resumeButton
    : hasAttempt
      ? copy.mockExam.todayOpenResults
      : copy.mockExam.startButton;
  const reviewedCount = Object.keys(reviews).filter((id) => cardIndex.some((card) => card.id === id)).length;
  const weakByDomain = useMemo(() => domainIndex
    .map((domain) => ({ domain, count: cardIndex.filter((card) => card.domainId === domain.id && isWeak(reviews[card.id])).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count), [reviews]);

  return (
    <div class="view-stack">
      <section class="today-hero" aria-labelledby="today-title">
        <div>
          <p class="eyebrow">{copy.today.eyebrow} · {now ? formatDate(now, locale) : '—'}</p>
          <h2 id="today-title">{copy.today.titleLead}<br/><em>{copy.today.titleEmphasis}</em></h2>
          <p>{copy.today.introduction}</p>
        </div>
        <div class="due-block">
          <span>{copy.today.dueTitle}</span>
          <strong>{ready && now ? formatNumber(dueCount, locale) : '—'}</strong>
          <span>{ready && now ? copy.today.dueCount(dueCount) : '—'}</span>
          <button class="btn btn--wide" disabled={!ready} onClick={onStartDueReview}>{copy.today.startReview} <span aria-hidden="true">→</span></button>
        </div>
      </section>
      <Blueprint reviews={reviews} ready={ready} locale={locale} copy={copy}/>
      <section class="mock-exam-launch" aria-labelledby="mock-exam-launch-title">
        <div class="section-heading">
          <div><p class="eyebrow">{copy.mockExam.eyebrow}</p><h2 id="mock-exam-launch-title" class="section-title">{copy.mockExam.title}</h2></div>
          <p>{copy.mockExam.introduction}</p>
        </div>
        <div class="mock-exam-launch-actions">
          <button type="button" class="btn mock-exam-launch-button" disabled={!ready} onClick={onOpenMockExam}>{mockExamCtaLabel} <span aria-hidden="true">→</span></button>
          {ready && hasAttempt && <button type="button" class="btn btn--secondary mock-exam-launch-analysis" onClick={onOpenMockExamAnalysis}>{copy.mockExam.todayAnalysisLink} <span aria-hidden="true">→</span></button>}
        </div>
      </section>
      <section class="weak-areas" aria-labelledby="weak-areas-title">
        <div class="section-heading">
          <div><p class="eyebrow">{copy.weakAreas.eyebrow}</p><h2 id="weak-areas-title" class="section-title">{copy.weakAreas.title}</h2></div>
          <p>{copy.weakAreas.note}</p>
        </div>
        {ready && weakByDomain.length > 0
          ? <div class="weak-list">{weakByDomain.map(({ domain, count }) => <button key={domain.id} type="button" class="weak-row" onClick={() => onOpenWeakDomain(domain.id)}>
              <span class="weak-row-domain" aria-hidden="true">D{domain.number}</span>
              <span class="weak-row-title">{localize(domain.title, locale)}</span>
              <strong>{copy.weakAreas.cardCount(count)}</strong>
              <span aria-hidden="true">→</span>
            </button>)}</div>
          : <div class="empty-state">
              <strong>{ready && reviewedCount > 0 ? copy.weakAreas.emptyAllClearTitle : copy.weakAreas.emptyBeforeStartTitle}</strong>
              <p>{ready && reviewedCount > 0 ? copy.weakAreas.emptyAllClearDescription : copy.weakAreas.emptyBeforeStartDescription}</p>
            </div>}
      </section>
      <section class="status-strip" aria-labelledby="status-title">
        <div><p class="eyebrow">{copy.status.eyebrow}</p><h2 id="status-title" class="section-title">{copy.status.title}</h2></div>
        <dl>
          <div><dt>{copy.status.started}</dt><dd>{ready ? formatNumber(reviewedCount, locale) : '—'}</dd></div>
          <div><dt>{copy.status.notStarted}</dt><dd>{ready ? formatNumber(cardIndex.length - reviewedCount, locale) : '—'}</dd></div>
          <div><dt>{copy.status.coverage}</dt><dd>{formatNumber(cardIndex.length, locale)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
