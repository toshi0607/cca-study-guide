import { useEffect, useRef, useState } from 'preact/hooks';
import { cards } from '../content/cards';
import type { Card } from '../content/types';
import { localePaths, type Locale } from '../i18n/locales';
import { ui } from '../i18n/ui';
import { isDue, scheduleReview, type Rating } from '../lib/scheduler';
import { completeStudyGuideSection, reconfirmStudyGuideSection, startStudyGuideSection } from '../lib/study-guide-progress';
import { buildStudyDataExport, createEmptyStudyData, createStudyStorage, parseStudyDataImport, type ImportedStudyData, type StudyData } from '../lib/storage';
import { AppBottomNav, AppHeader } from './app/AppNavigation';
import { formatDate } from './app/format';
import type { View } from './app/types';
import { GuideEntry } from './GuideEntry';
import { PracticeView, type StateFilter } from './views/PracticeView';
import { ProgressView } from './views/ProgressView';
import { QuizView } from './views/QuizView';
import { TodayView } from './views/TodayView';

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

  const openWeakPractice = (domainId: string) => {
    setQuery('');
    setDomainFilter(domainId);
    setStateFilter('weak');
    navigate('practice');
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
        {view === 'today' && <TodayView locale={locale} copy={copy} now={now} ready={ready} reviews={data.reviews} dueCards={dueCards} onStartDueReview={startDueReview} onOpenWeakDomain={openWeakPractice}/>}

        {view === 'guide' && <GuideEntry locale={locale} copy={copy} records={data.studyGuideProgress} onProgressAction={saveGuideProgress} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion}/>}

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

        {view === 'quiz' && <QuizView locale={locale} copy={copy} quizStats={data.quizStats} onAnswer={recordQuizAnswer} targetQuestionId={quizTargetQuestionId} onTargetOpened={() => setQuizTargetQuestionId(null)}/>}

        {view === 'progress' && <ProgressView locale={locale} copy={copy} reviews={data.reviews} analyticsEnabled={analyticsEnabled} onExport={exportData} onImportFile={importData} onReset={resetData}/>}
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
