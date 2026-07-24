import { formatNumber } from '../app/format';
import { cards } from '../../content/cards';
import { domains } from '../../content/domains';
import { studyGuideSections } from '../../content/study-guide';
import { handsOnGuides } from '../../content/hands-on';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { ReviewState } from '../../lib/scheduler';
import { isWeak } from '../../lib/weakness';
import { deriveStudyGuideProgress } from '../../lib/study-guide-progress';
import { deriveHandsOnProgress, getHandsOnStepProgress } from '../../lib/hands-on-progress';
import type { HandsOnProgress, QuizStat, StudyGuideProgress } from '../../lib/storage';
import type { MockExamAttempt, MockExamSession } from '../../lib/mock-exam';

// The service-wide overview. Lazily loaded because it is the only place in the
// non-lazy view tree that needs the full Study Guide and Hands-on content; keeping
// it in its own chunk holds that content out of the initial landing bundle (same
// pattern as GuideEntry/HandsOnEntry). Every figure is derived from existing
// StudyData — no new persisted field, and no pass/fail, scaled score, or readiness.
export type ProgressOverviewProps = {
  locale: Locale;
  copy: UiCopy;
  reviews: Record<string, ReviewState>;
  studyGuideProgress: Record<string, StudyGuideProgress>;
  handsOnProgress: Record<string, HandsOnProgress>;
  quizStats: Record<string, QuizStat>;
  activeMockExam: MockExamSession | null;
  mockExamAttempts: readonly MockExamAttempt[];
  dueCount: number;
  onOpenGuide: () => void;
  onOpenHandsOn: () => void;
  onOpenPractice: () => void;
  onOpenQuiz: () => void;
  onOpenMockExam: () => void;
  onOpenMockExamAnalysis: () => void;
};

export function ProgressOverview({
  locale, copy, reviews, studyGuideProgress, handsOnProgress, quizStats, activeMockExam, mockExamAttempts, dueCount,
  onOpenGuide, onOpenHandsOn, onOpenPractice, onOpenQuiz, onOpenMockExam, onOpenMockExamAnalysis,
}: ProgressOverviewProps) {
  const o = copy.progress.overview;

  const guide = deriveStudyGuideProgress(studyGuideSections, studyGuideProgress);

  const handsOn = deriveHandsOnProgress(handsOnGuides, handsOnProgress);
  const handsOnSteps = handsOnGuides.reduce(
    (acc, g) => {
      const step = getHandsOnStepProgress(handsOnProgress[g.id], g.revision, g.steps.map((s) => s.id));
      return { completed: acc.completed + step.completed, total: acc.total + step.total };
    },
    { completed: 0, total: 0 },
  );

  const reviewedCards = cards.filter((card) => reviews[card.id]).length;
  const weakCards = cards.filter((card) => isWeak(reviews[card.id])).length;

  const quizValues = Object.values(quizStats);
  const quizAnswered = quizValues.filter((stat) => stat.attempts > 0).length;
  const quizAttempts = quizValues.reduce((sum, stat) => sum + stat.attempts, 0);
  const quizCorrect = quizValues.reduce((sum, stat) => sum + stat.correct, 0);

  // Latest = the attempt with the most recent completion. Score is read straight
  // from the stored per-answer `correct` flags (content-free, same basis as the
  // learning analysis raw accuracy); total is the fixed question count, so a blank
  // answer counts as incorrect. No re-grading and no engine import here.
  const latestAttempt = mockExamAttempts.reduce<MockExamAttempt | null>(
    (latest, attempt) => (!latest || Date.parse(attempt.completedAt) >= Date.parse(latest.completedAt) ? attempt : latest),
    null,
  );
  const latestTotal = latestAttempt?.questionRefs.length ?? 0;
  const latestCorrect = latestAttempt?.answers.filter((answer) => answer.correct).length ?? 0;
  const latestAccuracy = latestTotal > 0 ? Math.round((latestCorrect / latestTotal) * 100) : 0;

  const n = (value: number) => formatNumber(value, locale);

  return (
    <section class="progress-overview panel" aria-labelledby="progress-overview-title">
      <h3 class="section-title" id="progress-overview-title">{o.title}</h3>
      <div class="progress-cards">
        <article class="progress-card panel panel--sm">
          <h4 class="card-title">{o.guideTitle}</h4>
          <ul>
            <li>{o.guideCompleted(guide.completed, guide.totalSections)}</li>
            <li>{o.guideInProgress(guide.inProgress)}</li>
            <li>{o.guideStale(guide.stale)}</li>
          </ul>
          <button type="button" class="btn btn--secondary" onClick={onOpenGuide}>{o.openGuide} <span aria-hidden="true">→</span></button>
        </article>

        <article class="progress-card panel panel--sm">
          <h4 class="card-title">{o.handsOnTitle}</h4>
          <ul>
            <li>{o.handsOnCompleted(handsOn.completed, handsOn.totalGuides)}</li>
            <li>{o.handsOnInProgress(handsOn.inProgress)}</li>
            <li>{o.handsOnSteps(handsOnSteps.completed, handsOnSteps.total)}</li>
          </ul>
          <button type="button" class="btn btn--secondary" onClick={onOpenHandsOn}>{o.openHandsOn} <span aria-hidden="true">→</span></button>
        </article>

        <article class="progress-card panel panel--sm">
          <h4 class="card-title">{o.practiceTitle}</h4>
          <ul>
            <li>{o.practiceReviewed(reviewedCards, cards.length)}</li>
            <li>{o.practiceWeak(weakCards)}</li>
            <li>{o.practiceDue(dueCount)}</li>
          </ul>
          <button type="button" class="btn btn--secondary" onClick={onOpenPractice}>{o.openPractice} <span aria-hidden="true">→</span></button>
        </article>

        <article class="progress-card panel panel--sm">
          <h4 class="card-title">{o.quizTitle}</h4>
          <ul>
            <li>{o.quizAnswered(quizAnswered)}</li>
            <li>{o.quizAttempts(quizAttempts)}</li>
            <li>{o.quizCorrect(quizCorrect)}</li>
          </ul>
          <button type="button" class="btn btn--secondary" onClick={onOpenQuiz}>{o.openQuiz} <span aria-hidden="true">→</span></button>
        </article>

        <article class="progress-card panel panel--sm">
          <h4 class="card-title">{o.mockExamTitle}</h4>
          <ul>
            <li>{o.mockExamCompleted(mockExamAttempts.length)}</li>
            <li>{activeMockExam ? o.mockExamActive : o.mockExamNoActive}</li>
            {latestAttempt
              ? <><li>{o.mockExamLatest(latestCorrect, latestTotal)}</li><li>{o.mockExamLatestAccuracy(latestAccuracy)}</li></>
              : <li>{o.mockExamEmpty}</li>}
          </ul>
          <div class="progress-card-actions">
            <button type="button" class="btn btn--secondary" onClick={onOpenMockExam}>{o.openMockExam} <span aria-hidden="true">→</span></button>
            {mockExamAttempts.length > 0 && <button type="button" class="btn btn--secondary" onClick={onOpenMockExamAnalysis}>{o.openMockExamAnalysis} <span aria-hidden="true">→</span></button>}
          </div>
        </article>
      </div>

      <section class="progress-panel" aria-labelledby="by-domain"><h3 class="section-title" id="by-domain">{copy.progress.byDomain}</h3>{domains.map((domain) => {
        const list = cards.filter((card) => card.domainId === domain.id);
        const done = list.filter((card) => reviews[card.id]).length;
        const weak = list.filter((card) => isWeak(reviews[card.id])).length;
        return <div class="progress-row" key={domain.id}><span>D{domain.number} {localize(domain.title, locale)}{weak > 0 && <small class="weak-count">{copy.progress.weakCount(weak)}</small>}</span><progress value={done} max={list.length}>{done}/{list.length}</progress><strong>{n(done)}/{n(list.length)}</strong></div>;
      })}</section>
    </section>
  );
}
