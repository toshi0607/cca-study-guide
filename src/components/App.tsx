import { useEffect, useRef, useState } from 'preact/hooks';
import { cards } from '../content/cards';
import type { Card } from '../content/types';
import { localePaths, type Locale } from '../i18n/locales';
import { ui } from '../i18n/ui';
import { isDue, scheduleReview, type Rating } from '../lib/scheduler';
import { completeStudyGuideSection, reconfirmStudyGuideSection, startStudyGuideSection } from '../lib/study-guide-progress';
import { completeHandsOnGuide, reconfirmHandsOnGuide, setHandsOnStepCompletion, startHandsOnGuide } from '../lib/hands-on-progress';
import { buildStudyDataExport, createEmptyStudyData, createStudyStorage, parseStudyDataImport, type ImportedStudyData, type StudyData } from '../lib/storage';
import { AppBottomNav, AppHeader } from './app/AppNavigation';
import { formatDate } from './app/format';
import type { View } from './app/types';
import { GuideEntry } from './GuideEntry';
import type { LearningStageViewTarget } from './views/GuideView';
import { HandsOnEntry } from './HandsOnEntry';
import { MockExamEntry } from './MockExamEntry';
import { OfficialScenariosEntry } from './OfficialScenariosEntry';
import { PracticeView, type StateFilter } from './views/PracticeView';
import { ProgressView } from './views/ProgressView';
import { QuizView } from './views/QuizView';
import { TodayView } from './views/TodayView';

// Keep the Mock Exam engine out of the initial bundle: App never imports it. The
// exam view (lazily loaded) owns all engine calls and receives only this storage
// bridge, so the landing route ships none of the exam logic.
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

function studyStorage() {
  try {
    return createStudyStorage(window.localStorage);
  } catch {
    return createStudyStorage(undefined);
  }
}

function App({ locale, analyticsEnabled = false }: { locale: Locale; analyticsEnabled?: boolean }) {
  const copy = ui[locale];
  const [view, setView] = useState<View>('today');
  const [data, setData] = useState<StudyData>(createEmptyStudyData);
  const [now, setNow] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('due');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [sessionCards, setSessionCards] = useState<Card[] | null>(null);
  const [notice, setNotice] = useState('');
  const [practiceTargetCardId, setPracticeTargetCardId] = useState<string | null>(null);
  const [quizTargetQuestionId, setQuizTargetQuestionId] = useState<string | null>(null);
  const [quizTargetScenarioId, setQuizTargetScenarioId] = useState<string | null>(null);
  const [handsOnTargetGuideId, setHandsOnTargetGuideId] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  // Which Mock Exam screen to land on when the view opens: the start screen, or
  // straight to the learning analysis (used by Today/Progress/learning-path CTAs).
  const [mockExamIntent, setMockExamIntent] = useState<'landing' | 'analysis'>('landing');
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const dataRef = useRef<StudyData>(createEmptyStudyData());
  // Serializes imports: a second file picked while one is still being read
  // would otherwise apply in resolution order, not selection order.
  const importBusyRef = useRef(false);

  useEffect(() => {
    const refreshNow = () => setNow(new Date());
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshNow();
    };

    const loaded = studyStorage().load();
    dataRef.current = loaded;
    setData(loaded);
    setStorageAvailable(detectStorageAvailable());
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

  const dueCards = now ? cards.filter((card) => isDue(data.reviews[card.id], card.revision, now)) : [];

  const focusNotice = () => requestAnimationFrame(() => noticeRef.current?.focus());

  // Re-read the canonical document immediately before every mutation. Another
  // tab may have committed since this component last rendered; building from
  // dataRef alone would silently replace that newer work.
  const commitData = (change: (current: StudyData) => StudyData | null): boolean => {
    const next = change(studyStorage().load());
    if (!next) return false;
    if (!studyStorage().save(next)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return false;
    }
    dataRef.current = next;
    setData(next);
    return true;
  };

  const persistRating = (cardId: string, rating: Rating) => {
    const currentCard = cards.find((card) => card.id === cardId)!;
    return commitData((current) => ({ ...current, reviews: { ...current.reviews, [cardId]: scheduleReview(cardId, currentCard.revision, rating, current.reviews[cardId]) } }));
  };

  const saveRating = (cardId: string, rating: Rating) => {
    if (!persistRating(cardId, rating)) return;
    setRevealed((value) => ({ ...value, [cardId]: false }));
    setNotice(rating === 'again' ? copy.notices.ratingAgain : rating === 'hard' ? copy.notices.ratingHard : copy.notices.ratingGood);
    focusNotice();
  };

  const endSession = (aborted: boolean) => {
    setSessionCards(null);
    if (aborted) {
      setNotice(copy.session.abortedNotice);
      focusNotice();
    }
  };

  const recordQuizAnswer = (questionId: string, correct: boolean): boolean =>
    commitData((current) => {
      const previous = current.quizStats[questionId];
      const stat = { attempts: (previous?.attempts ?? 0) + 1, correct: (previous?.correct ?? 0) + (correct ? 1 : 0), lastAnsweredAt: new Date().toISOString(), lastCorrect: correct };
      return { ...current, quizStats: { ...current.quizStats, [questionId]: stat } };
    });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(buildStudyDataExport(data, new Date()), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cca-field-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(copy.notices.exported);
  };

  const applyImport = (imported: ImportedStudyData | null) => {
    if (!imported) {
      setNotice(copy.notices.importInvalid);
      focusNotice();
      return;
    }
    const reviewedTotal = Object.keys(imported.data.reviews).length;
    const exportedAt = imported.exportedAt ? formatDate(new Date(imported.exportedAt), locale) : null;
    if (!window.confirm(copy.notices.importConfirm(reviewedTotal, exportedAt))) return;
    if (!studyStorage().save(imported.data)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return;
    }
    dataRef.current = imported.data;
    setData(imported.data);
    setRevealed({});
    setNotice(copy.notices.importDone);
    focusNotice();
  };

  const importData = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || importBusyRef.current) return;
    importBusyRef.current = true;
    void file.text()
      .then((text) => applyImport(parseStudyDataImport(text)), () => applyImport(null))
      .finally(() => {
        importBusyRef.current = false;
      });
  };

  const resetData = () => {
    if (!window.confirm(copy.notices.resetConfirm)) return;
    if (!studyStorage().reset()) {
      setNotice(copy.notices.resetFailed);
      focusNotice();
      return;
    }
    const empty = createEmptyStudyData();
    dataRef.current = empty;
    setData(empty);
    setRevealed({});
    setNotice(copy.notices.resetDone);
  };

  const navigate = (next: View) => {
    // Leaving the practice view ends a running session; its ratings are already persisted.
    if (next !== 'practice') setSessionCards(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGuideCard = (cardId: string) => {
    setQuery(''); setDomainFilter('all'); setStateFilter('all'); setPracticeTargetCardId(cardId); navigate('practice');
  };
  const openGuideQuestion = (questionId: string) => { setQuizTargetQuestionId(questionId); navigate('quiz'); };
  // Exact-target navigation out of the official scenarios view. Each sets a typed
  // target the destination view consumes and clears, so the learner lands on the
  // specific case, guide, or question rather than the destination's list.
  const openPracticeScenario = (scenarioId: string) => { setQuizTargetScenarioId(scenarioId); navigate('quiz'); };
  const openHandsOnGuide = (guideId: string) => { setHandsOnTargetGuideId(guideId); navigate('hands-on'); };
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
    if (saved) {
      setNotice(copy.guide.actionDone[action]);
      focusNotice();
    }
    return saved;
  };

  // Save-first Hands-on updates. Each re-reads canonical storage inside
  // commitData so a concurrent tab's change is never lost, and the visible state
  // only advances after the save succeeds. Guide-level transitions move focus to
  // the notice because the pressed control unmounts; a step toggle only announces
  // through the aria-live notice so keyboard focus stays on the checkbox.
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

  // Storage bridge handed to the lazily-loaded Mock Exam view. readData returns
  // the canonical document (re-read immediately before every exam mutation);
  // writeData validates and persists the whole document, updates state, and
  // surfaces the save-failed notice on refusal — mirroring commitData's contract
  // without pulling any exam logic into this component.
  const readMockExamData = (): StudyData => studyStorage().load();
  const writeMockExamData = (next: StudyData): boolean => {
    if (!studyStorage().save(next)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return false;
    }
    dataRef.current = next;
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

  // Learning-analysis "next action" links reuse the existing Practice view: an
  // optional domain id preselects that domain's cards, otherwise it opens the
  // full deck. Skills are not a Practice filter axis, so a skill action falls back
  // to opening practice unfiltered rather than inventing a route.
  const openMockExamPractice = (domainId?: string) => {
    setQuery('');
    setDomainFilter(domainId ?? 'all');
    setStateFilter('all');
    navigate('practice');
  };

  // Learning-path stage dispatch (in-page Guide anchors are handled inside
  // GuideView; only view-bound targets reach here). Reuses existing navigation —
  // no new router or URL is introduced.
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
    setSessionCards(dueCards.length ? dueCards : null);
    navigate('practice');
  };

  return (
    <div class="app-shell">
      <AppHeader locale={locale} copy={copy} view={view} ready={ready} onNavigate={navigate}/>

      <main id="main-content">
        <h1 class="sr-only">{copy.pageTitle}</h1>
        <p ref={noticeRef} class="notice" tabIndex={-1} aria-live="polite">{notice}</p>
        {view === 'today' && <TodayView locale={locale} copy={copy} now={now} ready={ready} reviews={data.reviews} dueCards={dueCards} session={data.activeMockExam} attempts={data.mockExamAttempts} onStartDueReview={startDueReview} onOpenWeakDomain={openWeakPractice} onOpenMockExam={openMockExam} onOpenMockExamAnalysis={openMockExamAnalysis}/>}

        {view === 'mock-exam' && <MockExamEntry locale={locale} copy={copy} session={data.activeMockExam} attempts={data.mockExamAttempts} storageAvailable={storageAvailable} initialPhase={mockExamIntent} readData={readMockExamData} writeData={writeMockExamData} onOpenPractice={openMockExamPractice}/>}

        {view === 'guide' && <GuideEntry locale={locale} copy={copy} records={data.studyGuideProgress} onProgressAction={saveGuideProgress} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} onOpenStage={openLearningStage} onOpenOfficialScenarios={() => navigate('official-scenarios')}/>}

        {view === 'hands-on' && <HandsOnEntry locale={locale} copy={copy} records={data.handsOnProgress} onStart={saveHandsOnStart} onToggleStep={saveHandsOnStep} onComplete={saveHandsOnComplete} onReconfirm={saveHandsOnReconfirm} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} targetGuideId={handsOnTargetGuideId} onTargetOpened={() => setHandsOnTargetGuideId(null)}/>}

        {view === 'official-scenarios' && <OfficialScenariosEntry locale={locale} copy={copy} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} onOpenPracticeScenario={openPracticeScenario} onOpenHandsOnGuide={openHandsOnGuide}/>}

        {view === 'practice' && <PracticeView
          locale={locale} copy={copy} reviews={data.reviews} now={now} dueCount={dueCards.length}
          query={query} onQueryChange={setQuery}
          domainFilter={domainFilter} onDomainFilterChange={setDomainFilter}
          stateFilter={stateFilter} onStateFilterChange={setStateFilter}
          targetCardId={practiceTargetCardId} onTargetOpened={() => setPracticeTargetCardId(null)}
          revealed={revealed} onToggleRevealed={(cardId) => setRevealed((value) => ({ ...value, [cardId]: !value[cardId] }))}
          sessionCards={sessionCards} onStartSession={setSessionCards} onExitSession={endSession}
          onRateInList={saveRating} onRateInSession={persistRating}
        />}

        {view === 'quiz' && <QuizView locale={locale} copy={copy} quizStats={data.quizStats} onAnswer={recordQuizAnswer} targetQuestionId={quizTargetQuestionId} onTargetOpened={() => setQuizTargetQuestionId(null)} targetScenarioId={quizTargetScenarioId} onTargetScenarioOpened={() => setQuizTargetScenarioId(null)}/>}

        {view === 'progress' && <ProgressView
          locale={locale} copy={copy}
          reviews={data.reviews} studyGuideProgress={data.studyGuideProgress} handsOnProgress={data.handsOnProgress}
          quizStats={data.quizStats} activeMockExam={data.activeMockExam} mockExamAttempts={data.mockExamAttempts} dueCount={dueCards.length}
          analyticsEnabled={analyticsEnabled}
          onExport={exportData} onImportFile={importData} onReset={resetData}
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
