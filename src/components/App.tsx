import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { cardIndex } from '../content/card-index';
import { localePaths, type Locale } from '../i18n/locales';
import { ui } from '../i18n/ui';
import type { AnswerOutcome } from '../lib/quiz';
import { isDue, scheduleReview, type Rating } from '../lib/scheduler';
import type { QuizConfidence, QuizStat } from '../lib/storage-schema';
import { completeStudyGuideSection, reconfirmStudyGuideSection, startStudyGuideSection } from '../lib/study-guide-progress';
import { completeHandsOnGuide, reconfirmHandsOnGuide, setHandsOnStepCompletion, startHandsOnGuide } from '../lib/hands-on-progress';
import { buildStudyDataExport, createEmptyStudyData, createStudyStorage, type StudyData } from '../lib/storage';
import { createExamDateStorage } from '../lib/exam-date';
import type { DeepLink } from '../lib/deep-link';
import { AppBottomNav, AppHeader } from './app/AppNavigation';
import { formatDate } from './app/format';
import { ImportChoiceDialog } from './app/ImportChoiceDialog';
import type { View, ViewTarget } from './app/types';
import { useDeepLinkRouting } from './app/useDeepLinkRouting';
import { useExamDate } from './app/useExamDate';
import { useStudyImport } from './app/useStudyImport';
import { useStudySummary } from './app/useStudySummary';
import { GuideEntry } from './GuideEntry';
import type { LearningStageViewTarget } from './views/GuideView';
import { HandsOnEntry } from './HandsOnEntry';
import { MockExamEntry } from './MockExamEntry';
import { OfficialScenariosEntry } from './OfficialScenariosEntry';
import { PracticeEntry } from './PracticeEntry';
import type { StateFilter } from './views/PracticeView';
import { ProgressView } from './views/ProgressView';
import { QuizEntry } from './QuizEntry';
import type { ConfidenceOutcome } from './quiz/types';
import { TodayView } from './views/TodayView';

function detectStorageAvailable(): boolean {
  try {
    const probe = '__cca_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

// parseDeepLink yields at most one target per link, so the first match is the
// whole target. guideId and stepId are carried together: consuming them
// separately would let a stepId meant for a different guide leak into whichever
// guide is currently selected.
function targetFromDeepLink(link: DeepLink): ViewTarget | null {
  if (link.sectionId) return { kind: 'guide-section', sectionId: link.sectionId };
  if (link.cardId) return { kind: 'practice-card', cardId: link.cardId };
  if (link.questionId) return { kind: 'quiz-question', questionId: link.questionId };
  if (link.scenarioId) return { kind: 'quiz-scenario', scenarioId: link.scenarioId };
  if (link.handsOnGuideId) return { kind: 'hands-on', guideId: link.handsOnGuideId, ...(link.handsOnStepId ? { stepId: link.handsOnStepId } : {}) };
  return null;
}

// Touching window.localStorage can throw outright (a browser with storage
// disabled, or server-side rendering), so every adapter is built through this:
// the factory falls back to its no-op form rather than the app failing to render.
function withLocalStorage<T>(create: (storage: Storage | undefined) => T): T {
  try {
    return create(window.localStorage);
  } catch {
    return create(undefined);
  }
}

function App({ locale, analyticsEnabled = false }: { locale: Locale; analyticsEnabled?: boolean }) {
  const copy = ui[locale];
  // The adapters are stateless views onto localStorage, so one of each per mount
  // is enough. What must stay per-call is `load()`: every mutation still re-reads
  // the canonical document (see commitData) so another tab's writes are not lost.
  const studyStore = useMemo(() => withLocalStorage(createStudyStorage), []);
  const examDateStore = useMemo(() => withLocalStorage(createExamDateStorage), []);
  const [view, setView] = useState<View>('today');
  const [data, setData] = useState<StudyData>(createEmptyStudyData);
  const [now, setNow] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('due');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [sessionCards, setSessionCards] = useState<string[] | null>(null);
  const [notice, setNotice] = useState('');
  // At most one pending target at a time; the destination view clears it on arrival.
  const [target, setTarget] = useState<ViewTarget | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [dataUnreadable, setDataUnreadable] = useState(false);
  // Which Mock Exam screen to land on when the view opens: the start screen, or
  // straight to the learning analysis (used by Today/Progress/learning-path CTAs).
  const [mockExamIntent, setMockExamIntent] = useState<'landing' | 'analysis'>('landing');
  const noticeRef = useRef<HTMLParagraphElement>(null);

  const focusNotice = () => requestAnimationFrame(() => noticeRef.current?.focus());
  const notify = (message: string) => { setNotice(message); focusNotice(); };

  const { examDate, saveExamDate, clearExamDate, clearExamDateSilently } = useExamDate({ storage: examDateStore, copy, notify });
  const { pendingImport, importError, importFile, finishImport, cancelImport } = useStudyImport({
    storage: studyStore,
    copy,
    notify,
    onImported: (next) => { setData(next); setRevealed({}); },
  });
  const summaryText = useStudySummary({ view, data, dataUnreadable, now });

  // A deep link is just another way to arrive at one of the targets in-app
  // navigation already produces (e.g. openGuideCard).
  const applyDeepLink = (link: DeepLink) => {
    const linkTarget = targetFromDeepLink(link);
    if (link.cardId) { setQuery(''); setDomainFilter('all'); setStateFilter('all'); }
    // Routed through `navigate` so view and target update atomically, same as
    // every in-app target-bearing navigation. A step target scrolls itself into
    // view inside HandsOnView; running App's own smooth scroll at the same time
    // would fight that scroll.
    navigate(link.view, linkTarget, !link.handsOnStepId);
  };

  useEffect(() => {
    const refreshNow = () => setNow(new Date());
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshNow();
    };

    setData(studyStore.load());
    setStorageAvailable(detectStorageAvailable());
    setDataUnreadable(studyStore.hasUnreadableCurrentDocument());
    refreshNow();
    setReady(true);

    const clock = window.setInterval(refreshNow, 60_000);
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(clock);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useDeepLinkRouting({ view, onApplyLink: applyDeepLink });

  const dueCardIds = now ? cardIndex.filter((card) => isDue(data.reviews[card.id], card.revision, now)).map((card) => card.id) : [];

  // Re-read the canonical document immediately before every mutation. Another
  // tab may have committed since this component last rendered; building from the
  // rendered `data` alone would silently replace that newer work.
  const commitData = (change: (current: StudyData) => StudyData | null): boolean => {
    const next = change(studyStore.load());
    if (!next) return false;
    if (!studyStore.save(next)) {
      notify(copy.notices.saveFailed);
      return false;
    }
    setData(next);
    return true;
  };

  const persistRating = (cardId: string, rating: Rating) => {
    const currentCard = cardIndex.find((card) => card.id === cardId)!;
    return commitData((current) => ({ ...current, reviews: { ...current.reviews, [cardId]: scheduleReview(cardId, currentCard.revision, rating, current.reviews[cardId]) } }));
  };

  const saveRating = (cardId: string, rating: Rating) => {
    if (!persistRating(cardId, rating)) return;
    setRevealed((value) => ({ ...value, [cardId]: false }));
    notify(rating === 'again' ? copy.notices.ratingAgain : rating === 'hard' ? copy.notices.ratingHard : copy.notices.ratingGood);
  };

  const endSession = (aborted: boolean) => {
    setSessionCards(null);
    if (aborted) notify(copy.session.abortedNotice);
  };

  // Returns the `lastAnsweredAt` of the answer just saved (or null on failure),
  // so the caller can hand it back to recordQuizConfidence as the token that
  // proves a later confidence pick still targets this exact answer.
  const recordQuizAnswer = (questionId: string, outcome: AnswerOutcome): string | null => {
    const answeredAt = new Date().toISOString();
    const saved = commitData((current) => {
      const previous = current.quizStats[questionId];
      const correct = outcome === 'correct';
      const stat: QuizStat = {
        attempts: (previous?.attempts ?? 0) + 1,
        correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
        lastAnsweredAt: answeredAt,
        lastCorrect: correct,
      };
      // Each optional field is assigned only when there is a value for it: a stat
      // that has never seen a partial answer must keep `partial` absent rather
      // than gain an explicit `partial: 0`.
      if (outcome === 'partial') stat.partial = (previous?.partial ?? 0) + 1;
      else if (previous?.partial !== undefined) stat.partial = previous.partial;
      if (previous?.guessedCorrect !== undefined) stat.guessedCorrect = previous.guessedCorrect;
      return { ...current, quizStats: { ...current.quizStats, [questionId]: stat } };
    });
    return saved ? answeredAt : null;
  };

  // Records the learner's self-reported confidence for the answer they just
  // submitted. `expectedLastAnsweredAt` is the token recordQuizAnswer returned
  // for that answer: commitData re-reads canonical storage, and another tab may
  // have answered this question again since this screen graded it, so the token
  // is checked against the freshly-read stat before writing anything.
  const recordQuizConfidence = (questionId: string, confidence: QuizConfidence, wasCorrect: boolean, expectedLastAnsweredAt: string): ConfidenceOutcome => {
    let stale = false;
    const saved = commitData((current) => {
      const previous = current.quizStats[questionId];
      // lastAnsweredAt is ISO-millisecond precision, so two answers to the same
      // question could in theory land in the same millisecond; in practice the
      // synchronous double-fire guard in QuizView means a human can't produce a
      // second answer to the same question that fast, so the timestamp alone is
      // a sufficient token here.
      if (!previous || previous.lastAnsweredAt !== expectedLastAnsweredAt) { stale = true; return null; }
      // Same rule as `partial` above: only ever write `guessedCorrect` once there
      // is something to count, so a stat with no guessed-correct answer keeps the
      // field absent rather than gaining an explicit key.
      const guessed = confidence === 'guess' && wasCorrect ? (previous.guessedCorrect ?? 0) + 1 : previous.guessedCorrect;
      const stat: QuizStat = {
        ...previous,
        lastConfidence: confidence,
        ...(guessed !== undefined ? { guessedCorrect: guessed } : {}),
      };
      return { ...current, quizStats: { ...current.quizStats, [questionId]: stat } };
    });
    if (stale) return 'stale';
    return saved ? 'saved' : 'failed';
  };

  const exportData = () => {
    if (dataUnreadable) return;
    const blob = new Blob([JSON.stringify(buildStudyDataExport(studyStore.load(), new Date()), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cca-field-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(copy.notices.exported);
  };

  // Nothing here sends anything anywhere: the Clipboard API is local to this
  // device, and the learner chooses where the text is pasted.
  const copySummary = () => {
    if (dataUnreadable) return;
    if (!summaryText || !navigator.clipboard) {
      notify(copy.notices.summaryCopyFailed);
      return;
    }
    void navigator.clipboard.writeText(summaryText).then(
      () => notify(copy.notices.summaryCopied),
      () => notify(copy.notices.summaryCopyFailed),
    );
  };

  const resetData = () => {
    if (dataUnreadable) return;
    if (!window.confirm(copy.notices.resetConfirm)) return;
    if (!studyStore.reset()) {
      notify(copy.notices.resetFailed);
      return;
    }
    // The exam date lives under its own key, and the confirm text promises to
    // delete everything this device holds. A failed clear leaves the date in
    // storage, so the notice — and the still-visible date — must say so.
    const examDateCleared = clearExamDateSilently();
    const empty = createEmptyStudyData();
    setData(empty);
    setRevealed({});
    setDataUnreadable(false);
    setNotice(examDateCleared ? copy.notices.resetDone : copy.notices.resetDonePartial);
  };

  // View and target are updated atomically here so a lazily-loaded view can
  // never see a target left over from a navigation that never named one: a
  // target-less navigate always clears it, and a target-bearing one (deep link
  // or an open* helper) hands it in as `nextTarget` rather than calling
  // `setTarget` beforehand.
  const navigate = (next: View, nextTarget: ViewTarget | null = null, scroll = true) => {
    // Leaving the practice view ends a running session; its ratings are already persisted.
    if (next !== 'practice') setSessionCards(null);
    setTarget(nextTarget);
    setView(next);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGuideCard = (cardId: string) => {
    setQuery(''); setDomainFilter('all'); setStateFilter('all'); navigate('practice', { kind: 'practice-card', cardId });
  };
  const openGuideQuestion = (questionId: string) => navigate('quiz', { kind: 'quiz-question', questionId });
  const openPracticeScenario = (scenarioId: string) => navigate('quiz', { kind: 'quiz-scenario', scenarioId });
  const openHandsOnGuide = (guideId: string) => navigate('hands-on', { kind: 'hands-on', guideId });
  const saveGuideProgress = (sectionId: string, revision: number, action: 'start' | 'complete' | 'reconfirm') => {
    const saved = commitData((current) => {
      const record = current.studyGuideProgress[sectionId];
      const next = action === 'start'
        ? startStudyGuideSection(record, revision, new Date())
        : action === 'complete'
          ? completeStudyGuideSection(record, revision, new Date())
          : reconfirmStudyGuideSection(record, revision, new Date());
      if (!next || next === record) return null;
      return { ...current, studyGuideProgress: { ...current.studyGuideProgress, [sectionId]: next } };
    });
    if (saved) notify(copy.guide.actionDone[action]);
    return saved;
  };

  // Guide-level Hands-on transitions move focus to the notice because the
  // pressed control unmounts; a step toggle only announces through the aria-live
  // notice so keyboard focus stays on the checkbox.
  type HandsOnRecord = StudyData['handsOnProgress'][string];
  const saveHandsOn = (
    guideId: string,
    change: (record: HandsOnRecord | undefined) => HandsOnRecord | undefined,
    buildNotice: (next: HandsOnRecord) => string,
    moveFocus: boolean,
  ) => {
    let savedNext: HandsOnRecord | undefined;
    const saved = commitData((current) => {
      const record = current.handsOnProgress[guideId];
      const next = change(record);
      if (!next || next === record) return null;
      savedNext = next;
      return { ...current, handsOnProgress: { ...current.handsOnProgress, [guideId]: next } };
    });
    if (saved && savedNext) {
      setNotice(buildNotice(savedNext));
      if (moveFocus) focusNotice();
    }
    return saved;
  };

  const saveHandsOnStart = (guideId: string, revision: number) =>
    saveHandsOn(guideId, (record) => startHandsOnGuide(record, revision, new Date()), () => copy.handsOn.actionDone.start, true);
  const saveHandsOnStep = (guideId: string, revision: number, stepIds: string[], stepId: string, complete: boolean) =>
    saveHandsOn(guideId, (record) => setHandsOnStepCompletion(record, revision, stepIds, stepId, complete, new Date()), (next) => {
      const done = new Set(next.completedStepIds);
      const completed = stepIds.filter((id) => done.has(id)).length;
      return complete ? copy.handsOn.actionDone.step(completed, stepIds.length) : copy.handsOn.actionDone.unstep(completed, stepIds.length);
    }, false);
  const saveHandsOnComplete = (guideId: string, revision: number, stepIds: string[]) =>
    saveHandsOn(guideId, (record) => completeHandsOnGuide(record, revision, stepIds, new Date()), () => copy.handsOn.actionDone.complete, true);
  const saveHandsOnReconfirm = (guideId: string, revision: number) =>
    saveHandsOn(guideId, (record) => reconfirmHandsOnGuide(record, revision, new Date()), () => copy.handsOn.actionDone.reconfirm, true);

  // Storage bridge handed to the lazily-loaded Mock Exam view: it mirrors
  // commitData's contract (re-read before every mutation, notice on refusal)
  // without pulling any exam logic — and so any of the exam engine — into the
  // initial bundle.
  const readMockExamData = (): StudyData => studyStore.load();
  const writeMockExamData = (next: StudyData): boolean => {
    if (!studyStore.save(next)) {
      notify(copy.notices.saveFailed);
      return false;
    }
    setData(next);
    return true;
  };

  const openMockExam = () => { setMockExamIntent('landing'); navigate('mock-exam'); };
  const openMockExamAnalysis = () => { setMockExamIntent('analysis'); navigate('mock-exam'); };

  const openWeakPractice = (domainId: string) => {
    setQuery('');
    setDomainFilter(domainId);
    setStateFilter('weak');
    navigate('practice');
  };

  // Skills are not a Practice filter axis, so a skill action opens practice
  // unfiltered rather than inventing a route.
  const openMockExamPractice = (domainId?: string) => {
    setQuery('');
    setDomainFilter(domainId ?? 'all');
    setStateFilter('all');
    navigate('practice');
  };

  // Learning-path stage dispatch; in-page Guide anchors are handled inside
  // GuideView, so only view-bound targets reach here.
  const openLearningStage = (target: LearningStageViewTarget) => {
    switch (target) {
      case 'hands-on': navigate('hands-on'); break;
      case 'practice': openMockExamPractice(); break;
      case 'quiz': navigate('quiz'); break;
      case 'mock-exam': openMockExam(); break;
      case 'mock-exam-analysis': openMockExamAnalysis(); break;
    }
  };

  const startDueReview = () => {
    setQuery('');
    setDomainFilter('all');
    setStateFilter('due');
    setSessionCards(dueCardIds.length ? dueCardIds : null);
    navigate('practice');
  };

  // HandsOnView gets the target object itself, not a fresh copy: its effects key
  // on that object, so the identity has to stay stable across renders.
  const clearTarget = () => setTarget(null);
  const handsOnTarget = target?.kind === 'hands-on' ? target : null;

  return (
    <div class="app-shell">
      <AppHeader locale={locale} copy={copy} view={view} ready={ready} onNavigate={navigate}/>

      <main id="main-content">
        <h1 class="sr-only">{copy.pageTitle}</h1>
        <p ref={noticeRef} class="notice" tabIndex={-1} aria-live="polite">{notice}</p>
        {pendingImport && <ImportChoiceDialog
          copy={copy}
          reviewedTotal={Object.keys(pendingImport.data.reviews).length}
          exportedAt={pendingImport.exportedAt ? formatDate(new Date(pendingImport.exportedAt), locale) : null}
          saveError={importError}
          onMerge={() => finishImport('merge')}
          onReplace={() => finishImport('replace')}
          onCancel={cancelImport}
        />}
        {dataUnreadable && <p class="data-alert" role="alert">{copy.notices.dataUnreadable}</p>}
        {view === 'today' && <TodayView locale={locale} copy={copy} now={now} ready={ready} reviews={data.reviews} dueCount={dueCardIds.length} session={data.activeMockExam} attempts={data.mockExamAttempts} examDate={examDate} onStartDueReview={startDueReview} onOpenWeakDomain={openWeakPractice} onOpenMockExam={openMockExam} onOpenMockExamAnalysis={openMockExamAnalysis}/>}

        {view === 'mock-exam' && <MockExamEntry locale={locale} copy={copy} session={data.activeMockExam} attempts={data.mockExamAttempts} storageAvailable={storageAvailable} quizStats={data.quizStats} initialPhase={mockExamIntent} readData={readMockExamData} writeData={writeMockExamData} onOpenPractice={openMockExamPractice}/>}

        {view === 'guide' && <GuideEntry locale={locale} copy={copy} records={data.studyGuideProgress} hasMockExamAttempts={data.mockExamAttempts.length > 0} examDate={examDate} onProgressAction={saveGuideProgress} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} onOpenStage={openLearningStage} onOpenOfficialScenarios={() => navigate('official-scenarios')} targetSectionId={target?.kind === 'guide-section' ? target.sectionId : null} onTargetSectionOpened={clearTarget}/>}

        {view === 'hands-on' && <HandsOnEntry locale={locale} copy={copy} records={data.handsOnProgress} onStart={saveHandsOnStart} onToggleStep={saveHandsOnStep} onComplete={saveHandsOnComplete} onReconfirm={saveHandsOnReconfirm} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} target={handsOnTarget} onTargetOpened={clearTarget}/>}

        {view === 'official-scenarios' && <OfficialScenariosEntry locale={locale} copy={copy} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} onOpenPracticeScenario={openPracticeScenario} onOpenHandsOnGuide={openHandsOnGuide}/>}

        {view === 'practice' && <PracticeEntry
          locale={locale} copy={copy} reviews={data.reviews} now={now} dueCount={dueCardIds.length}
          query={query} onQueryChange={setQuery}
          domainFilter={domainFilter} onDomainFilterChange={setDomainFilter}
          stateFilter={stateFilter} onStateFilterChange={setStateFilter}
          targetCardId={target?.kind === 'practice-card' ? target.cardId : null} onTargetOpened={clearTarget}
          revealed={revealed} onToggleRevealed={(cardId) => setRevealed((value) => ({ ...value, [cardId]: !value[cardId] }))}
          sessionCards={sessionCards} onStartSession={setSessionCards} onExitSession={endSession}
          onRateInList={saveRating} onRateInSession={persistRating}
        />}

        {view === 'quiz' && <QuizEntry locale={locale} copy={copy} quizStats={data.quizStats} onAnswer={recordQuizAnswer} onConfidence={recordQuizConfidence} targetQuestionId={target?.kind === 'quiz-question' ? target.questionId : null} onTargetOpened={clearTarget} targetScenarioId={target?.kind === 'quiz-scenario' ? target.scenarioId : null} onTargetScenarioOpened={clearTarget}/>}

        {view === 'progress' && <ProgressView
          locale={locale} copy={copy}
          reviews={data.reviews} studyGuideProgress={data.studyGuideProgress} handsOnProgress={data.handsOnProgress}
          quizStats={data.quizStats} activeMockExam={data.activeMockExam} mockExamAttempts={data.mockExamAttempts} dueCount={dueCardIds.length}
          analyticsEnabled={analyticsEnabled} dataUnreadable={dataUnreadable}
          examDate={examDate} onExamDateChange={saveExamDate} onExamDateClear={clearExamDate}
          onExport={exportData} onCopySummary={copySummary} onImportFile={importFile} onReset={resetData}
          onOpenGuide={() => navigate('guide')} onOpenHandsOn={() => navigate('hands-on')} onOpenPractice={() => openMockExamPractice()}
          onOpenQuiz={() => navigate('quiz')} onOpenMockExam={openMockExam} onOpenMockExamAnalysis={openMockExamAnalysis}
        />}
        <footer class="site-footer">
          <span>{copy.brand.footer}</span>
          <nav aria-label={copy.aria.siteInformation}>
            {analyticsEnabled && <a href={localePaths[locale].privacy}>{copy.footer.analytics}</a>}
            <a href="https://github.com/toshi0607/cca-study-guide" target="_blank" rel="noreferrer">{copy.footer.github}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>
          </nav>
        </footer>
      </main>

      <AppBottomNav copy={copy} view={view} ready={ready} onNavigate={navigate}/>
      <div class="persistent-disclaimer">{copy.progress.disclaimerTitle}</div>
    </div>
  );
}

export default App;
