import { useEffect, useRef, useState } from 'preact/hooks';
import { cardIndex, domainIndex } from '../content/card-index';
import { localePaths, type Locale } from '../i18n/locales';
import { ui } from '../i18n/ui';
import type { AnswerOutcome } from '../lib/quiz';
import { isDue, scheduleReview, type Rating } from '../lib/scheduler';
import type { QuizConfidence, QuizStat } from '../lib/storage-schema';
import { completeStudyGuideSection, deriveStudyGuideProgress, reconfirmStudyGuideSection, startStudyGuideSection } from '../lib/study-guide-progress';
import { completeHandsOnGuide, deriveHandsOnProgress, reconfirmHandsOnGuide, setHandsOnStepCompletion, startHandsOnGuide } from '../lib/hands-on-progress';
import { buildStudyDataExport, createEmptyStudyData, createStudyStorage, isImportSizeAllowed, MAX_IMPORT_TEXT_LENGTH, parseStudyDataImport, type ImportedStudyData, type StudyData } from '../lib/storage';
import { createExamDateStorage } from '../lib/exam-date';
import { buildStudySummary } from '../lib/study-summary';
import { mergeStudyData } from '../lib/study-data-merge';
import { formatDeepLink, parseDeepLink, type DeepLink } from '../lib/deep-link';
import { AppBottomNav, AppHeader } from './app/AppNavigation';
import { formatDate } from './app/format';
import { ImportChoiceDialog } from './app/ImportChoiceDialog';
import type { View } from './app/types';
import { GuideEntry } from './GuideEntry';
import type { LearningStageViewTarget } from './views/GuideView';
import { HandsOnEntry } from './HandsOnEntry';
import { MockExamEntry } from './MockExamEntry';
import { OfficialScenariosEntry } from './OfficialScenariosEntry';
import { PracticeEntry } from './PracticeEntry';
import type { StateFilter } from './views/PracticeView';
import { ProgressView } from './views/ProgressView';
import { QuizEntry } from './QuizEntry';
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

function examDateStorage() {
  try {
    return createExamDateStorage(window.localStorage);
  } catch {
    return createExamDateStorage(undefined);
  }
}

function App({ locale, analyticsEnabled = false }: { locale: Locale; analyticsEnabled?: boolean }) {
  const copy = ui[locale];
  const [view, setView] = useState<View>('today');
  const [data, setData] = useState<StudyData>(createEmptyStudyData);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('due');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [sessionCards, setSessionCards] = useState<string[] | null>(null);
  const [notice, setNotice] = useState('');
  // A parsed import awaiting the learner's replace/merge/cancel choice. Set by
  // applyImport, cleared by finishImport/cancelImport.
  const [pendingImport, setPendingImport] = useState<ImportedStudyData | null>(null);
  // Precomputed clipboard digest for the Progress view; null until (or unless) it
  // can be built. See the effect below for why it is not built inside the click.
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [practiceTargetCardId, setPracticeTargetCardId] = useState<string | null>(null);
  const [quizTargetQuestionId, setQuizTargetQuestionId] = useState<string | null>(null);
  const [quizTargetScenarioId, setQuizTargetScenarioId] = useState<string | null>(null);
  const [handsOnTargetGuideId, setHandsOnTargetGuideId] = useState<string | null>(null);
  const [guideTargetSectionId, setGuideTargetSectionId] = useState<string | null>(null);
  const [handsOnTargetStepId, setHandsOnTargetStepId] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [dataUnreadable, setDataUnreadable] = useState(false);
  // Which Mock Exam screen to land on when the view opens: the start screen, or
  // straight to the learning analysis (used by Today/Progress/learning-path CTAs).
  const [mockExamIntent, setMockExamIntent] = useState<'landing' | 'analysis'>('landing');
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const dataRef = useRef<StudyData>(createEmptyStudyData());
  // Serializes imports: a second file picked while one is still being read
  // would otherwise apply in resolution order, not selection order.
  const importBusyRef = useRef(false);
  // Skips the very first run of the hash-reflecting effect below (see its
  // comment): the first run always fires during this same mount, before or
  // regardless of whether a deep link was just applied, so acting on it would
  // risk clobbering the hash the learner actually opened.
  const hashReflectSkippedRef = useRef(false);

  // Routes a parsed deep link onto the existing per-view target state. Each
  // field feeds the same "target id" plumbing the app already uses for
  // in-app navigation (e.g. openGuideCard) — a deep link is just another way
  // to arrive at one of those targets.
  const applyDeepLink = (link: DeepLink) => {
    if (link.sectionId) setGuideTargetSectionId(link.sectionId);
    if (link.cardId) { setQuery(''); setDomainFilter('all'); setStateFilter('all'); setPracticeTargetCardId(link.cardId); }
    if (link.questionId) setQuizTargetQuestionId(link.questionId);
    if (link.scenarioId) setQuizTargetScenarioId(link.scenarioId);
    if (link.handsOnGuideId) setHandsOnTargetGuideId(link.handsOnGuideId);
    if (link.handsOnStepId) setHandsOnTargetStepId(link.handsOnStepId);
    // Same rule as `navigate`: leaving the practice view ends a running session
    // (its ratings are already persisted). A hash arriving mid-session must not
    // leave an orphaned session behind the new view.
    if (link.view !== 'practice') setSessionCards(null);
    setView(link.view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const refreshNow = () => setNow(new Date());
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshNow();
    };

    const loaded = studyStorage().load();
    dataRef.current = loaded;
    setData(loaded);
    setExamDate(examDateStorage().load());
    setStorageAvailable(detectStorageAvailable());
    setDataUnreadable(studyStorage().hasUnreadableCurrentDocument());
    refreshNow();
    setReady(true);

    // Deep-link entry: a hash present at load time (someone opened a shared
    // link) opens straight onto its target. `hashchange` covers both the
    // browser Back/Forward buttons moving across a hash we wrote ourselves
    // and a link pasted into the address bar of an already-open tab.
    const applyHashLink = () => {
      const link = parseDeepLink(window.location.hash);
      if (link) applyDeepLink(link);
    };
    applyHashLink();
    window.addEventListener('hashchange', applyHashLink);

    const clock = window.setInterval(refreshNow, 60_000);
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(clock);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('hashchange', applyHashLink);
    };
  }, []);

  // Keeps the address bar in sync with the current view — but only once a
  // hash is already present. `replaceState` (never `pushState`) so this never
  // adds history entries — Back/Forward keep navigating the browser's normal
  // page history, not view-by-view.
  //
  // The first run is skipped (see hashReflectSkippedRef above) so mounting
  // never immediately overwrites a hash the learner just opened, before the
  // effect above has had a chance to read and apply it.
  //
  // The `!window.location.hash` guard is deliberate, not an afterthought: a
  // session that never involved a deep link must reload back to Today, which
  // is the app's existing, tested contract (e.g. the Mock Exam and chunk-
  // recovery flows all reload and expect to land on Today, with progress
  // resumed from storage rather than from the URL). Writing a hash for every
  // ordinary in-app navigation — as an unconditional `[view]` effect would —
  // breaks that contract, because whatever hash a plain reload finds is what
  // the mount effect above re-applies. So this effect only ever *maintains*
  // a hash that a deep link already established; it never *creates* one from
  // an empty address bar.
  //
  // Once a deep link's target is applied, `applyDeepLink`'s own `setView`
  // triggers this same effect again, which then overwrites a target-bearing
  // hash (`#/guide/sg-x`) with the target-less form (`#/guide`). This is
  // intentional, not a bug to fix: the target has already been applied to
  // the view's state, and from this point the hash's job is to describe the
  // current view, not to replay the one-time entry target. From here on,
  // navigating further within the same deep-linked session keeps the address
  // bar in sync (it is no longer empty), which is the desired "this is now a
  // real address" behavior a deep link is supposed to establish.
  useEffect(() => {
    if (!hashReflectSkippedRef.current) {
      hashReflectSkippedRef.current = true;
      return;
    }
    if (!window.location.hash) return;
    try {
      history.replaceState(null, '', formatDeepLink({ view }));
    } catch {
      // history unavailable in this environment (e.g. a sandboxed preview) —
      // the app still works, it just cannot own the URL.
    }
  }, [view]);

  const dueCardIds = now ? cardIndex.filter((card) => isDue(data.reviews[card.id], card.revision, now)).map((card) => card.id) : [];

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
    const currentCard = cardIndex.find((card) => card.id === cardId)!;
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

  const recordQuizAnswer = (questionId: string, outcome: AnswerOutcome): boolean =>
    commitData((current) => {
      const previous = current.quizStats[questionId];
      const correct = outcome === 'correct';
      const stat: QuizStat = {
        attempts: (previous?.attempts ?? 0) + 1,
        correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
        lastAnsweredAt: new Date().toISOString(),
        lastCorrect: correct,
        // Bump `partial` only on an outcome that actually landed partial, and
        // otherwise carry the prior count forward as-is (spread, not a fallback
        // to 0) — a stat that has never seen a partial answer must keep the
        // field absent rather than gain an explicit `partial: 0`.
        ...(outcome === 'partial' ? { partial: (previous?.partial ?? 0) + 1 } : previous?.partial !== undefined ? { partial: previous.partial } : {}),
        // Confidence is reported separately (recordQuizConfidence), so an answer
        // submission alone must not clear what was recorded for a prior attempt.
        ...(previous?.lastConfidence !== undefined ? { lastConfidence: previous.lastConfidence } : {}),
        ...(previous?.guessedCorrect !== undefined ? { guessedCorrect: previous.guessedCorrect } : {}),
      };
      return { ...current, quizStats: { ...current.quizStats, [questionId]: stat } };
    });

  // Records the learner's self-reported confidence for the answer they just
  // submitted. A no-op (returns false without persisting) when the question
  // has no stat yet, since recordQuizAnswer always runs first and creates it.
  const recordQuizConfidence = (questionId: string, confidence: QuizConfidence, wasCorrect: boolean): boolean =>
    commitData((current) => {
      const previous = current.quizStats[questionId];
      if (!previous) return null;
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

  const exportData = () => {
    if (dataUnreadable) return;
    const blob = new Blob([JSON.stringify(buildStudyDataExport(studyStorage().load(), new Date()), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cca-field-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(copy.notices.exported);
  };

  // The pasteable digest is built ahead of the click, not inside it. Safari (and
  // iOS in particular) only honours navigator.clipboard.writeText while the user
  // gesture is still active, and the content chunks this digest needs are
  // dynamically imported — awaiting them inside the handler would routinely spend
  // that activation and fail the copy. So the text is precomputed whenever the
  // Progress view is open and the document changes, and the button itself does
  // nothing but write an already-built string.
  //
  // content/questions, content/study-guide and content/hands-on stay dynamic so
  // none of them reaches the initial landing bundle; cardIndex/domainIndex are the
  // lightweight spine already eager here and cover cards/domains without pulling
  // in cards.ts/domains.ts.
  useEffect(() => {
    // Invalidate first. Without this, a digest built on a previous visit stays
    // copyable in the window before the rebuild resolves, so a learner who left
    // Progress, answered questions, and came straight back could copy stale
    // numbers. Reporting "unavailable" for that instant is the honest failure.
    setSummaryText(null);
    if (view !== 'progress' || dataUnreadable) return;
    let cancelled = false;
    void Promise.all([
      import('../content/questions'),
      import('../content/study-guide'),
      import('../content/hands-on'),
    ]).then(([{ questions }, { studyGuideSections }, { handsOnGuides }]) => {
      if (cancelled) return;
      const studyGuide = deriveStudyGuideProgress(studyGuideSections, data.studyGuideProgress);
      const handsOn = deriveHandsOnProgress(handsOnGuides, data.handsOnProgress);
      setSummaryText(buildStudySummary({
        data,
        cards: cardIndex,
        questions,
        domains: domainIndex,
        studyGuideTotal: studyGuide.totalSections,
        studyGuideCompleted: studyGuide.completed,
        handsOnTotal: handsOn.totalGuides,
        handsOnCompleted: handsOn.completed,
        now: new Date(),
      }));
    }, () => {
      // A failed chunk load leaves the digest unavailable; the button reports that
      // rather than copying a stale or partial summary.
      if (!cancelled) setSummaryText(null);
    });
    return () => { cancelled = true; };
  }, [view, data, dataUnreadable]);

  // Nothing here sends anything anywhere: the Clipboard API is local to this
  // device, and the learner chooses where the text is pasted.
  const copySummary = () => {
    if (dataUnreadable) return;
    if (!summaryText || !navigator.clipboard) {
      setNotice(copy.notices.summaryCopyFailed);
      focusNotice();
      return;
    }
    void navigator.clipboard.writeText(summaryText).then(
      () => { setNotice(copy.notices.summaryCopied); focusNotice(); },
      () => { setNotice(copy.notices.summaryCopyFailed); focusNotice(); },
    );
  };

  const applyImport = (imported: ImportedStudyData | null) => {
    if (!imported) {
      setNotice(copy.notices.importInvalid);
      focusNotice();
      return;
    }
    setPendingImport(imported);
  };

  // Resolves the pending import once the learner picks replace or merge.
  const finishImport = (mode: 'replace' | 'merge') => {
    const pending = pendingImport;
    setPendingImport(null);
    if (!pending) return;
    // Re-read canonical storage: another tab may have written since the file was
    // picked, and a merge must combine with what is actually stored now.
    const next = mode === 'merge' ? mergeStudyData(studyStorage().load(), pending.data) : pending.data;
    if (!studyStorage().save(next)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return;
    }
    dataRef.current = next;
    setData(next);
    setRevealed({});
    setNotice(mode === 'merge' ? copy.notices.importMerged : copy.notices.importDone);
    focusNotice();
  };

  const cancelImport = () => {
    setPendingImport(null);
    setNotice(copy.notices.importCancelled);
    focusNotice();
  };

  const importData = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || importBusyRef.current) return;
    // Reject an oversized file by its reported size, before reading it into memory
    // or handing it to JSON.parse — parseStudyDataImport repeats this check on the
    // decoded text, but that check should never fire when this one already ran.
    if (!isImportSizeAllowed(file.size)) {
      setNotice(copy.notices.importTooLarge(MAX_IMPORT_TEXT_LENGTH / (1024 * 1024)));
      focusNotice();
      return;
    }
    importBusyRef.current = true;
    void file.text()
      .then((text) => applyImport(parseStudyDataImport(text)), () => applyImport(null))
      .finally(() => {
        importBusyRef.current = false;
      });
  };

  const resetData = () => {
    if (dataUnreadable) return;
    if (!window.confirm(copy.notices.resetConfirm)) return;
    if (!studyStorage().reset()) {
      setNotice(copy.notices.resetFailed);
      focusNotice();
      return;
    }
    // The planned exam date lives under its own key, so resetting the study
    // document would otherwise leave it behind — and the confirm text promises to
    // delete everything this device holds. A failure to clear it is not worth
    // overriding the reset-succeeded notice with; the exam-date panel keeps its
    // own clear button.
    examDateStorage().clear();
    setExamDate(null);
    const empty = createEmptyStudyData();
    dataRef.current = empty;
    setData(empty);
    setRevealed({});
    setDataUnreadable(false);
    setNotice(copy.notices.resetDone);
  };

  const clearExamDate = (): void => {
    if (!examDateStorage().clear()) {
      setNotice(copy.notices.examDateSaveFailed);
      focusNotice();
      return;
    }
    setExamDate(null);
    setNotice(copy.notices.examDateCleared);
    focusNotice();
  };

  const saveExamDate = (value: string): void => {
    if (!value) {
      clearExamDate();
      return;
    }
    if (!examDateStorage().save(value)) {
      setNotice(copy.notices.examDateSaveFailed);
      focusNotice();
      return;
    }
    setExamDate(value);
    setNotice(copy.notices.examDateSaved);
    focusNotice();
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
    setSessionCards(dueCardIds.length ? dueCardIds : null);
    navigate('practice');
  };

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
          onMerge={() => finishImport('merge')}
          onReplace={() => finishImport('replace')}
          onCancel={cancelImport}
        />}
        {dataUnreadable && <p class="data-alert" role="alert">{copy.notices.dataUnreadable}</p>}
        {view === 'today' && <TodayView locale={locale} copy={copy} now={now} ready={ready} reviews={data.reviews} dueCount={dueCardIds.length} session={data.activeMockExam} attempts={data.mockExamAttempts} examDate={examDate} onStartDueReview={startDueReview} onOpenWeakDomain={openWeakPractice} onOpenMockExam={openMockExam} onOpenMockExamAnalysis={openMockExamAnalysis}/>}

        {view === 'mock-exam' && <MockExamEntry locale={locale} copy={copy} session={data.activeMockExam} attempts={data.mockExamAttempts} storageAvailable={storageAvailable} quizStats={data.quizStats} initialPhase={mockExamIntent} readData={readMockExamData} writeData={writeMockExamData} onOpenPractice={openMockExamPractice}/>}

        {view === 'guide' && <GuideEntry locale={locale} copy={copy} records={data.studyGuideProgress} hasMockExamAttempts={data.mockExamAttempts.length > 0} examDate={examDate} onProgressAction={saveGuideProgress} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} onOpenStage={openLearningStage} onOpenOfficialScenarios={() => navigate('official-scenarios')} targetSectionId={guideTargetSectionId} onTargetSectionOpened={() => setGuideTargetSectionId(null)}/>}

        {view === 'hands-on' && <HandsOnEntry locale={locale} copy={copy} records={data.handsOnProgress} onStart={saveHandsOnStart} onToggleStep={saveHandsOnStep} onComplete={saveHandsOnComplete} onReconfirm={saveHandsOnReconfirm} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} targetGuideId={handsOnTargetGuideId} onTargetOpened={() => setHandsOnTargetGuideId(null)} targetStepId={handsOnTargetStepId} onTargetStepOpened={() => setHandsOnTargetStepId(null)}/>}

        {view === 'official-scenarios' && <OfficialScenariosEntry locale={locale} copy={copy} onOpenCard={openGuideCard} onOpenQuestion={openGuideQuestion} onOpenPracticeScenario={openPracticeScenario} onOpenHandsOnGuide={openHandsOnGuide}/>}

        {view === 'practice' && <PracticeEntry
          locale={locale} copy={copy} reviews={data.reviews} now={now} dueCount={dueCardIds.length}
          query={query} onQueryChange={setQuery}
          domainFilter={domainFilter} onDomainFilterChange={setDomainFilter}
          stateFilter={stateFilter} onStateFilterChange={setStateFilter}
          targetCardId={practiceTargetCardId} onTargetOpened={() => setPracticeTargetCardId(null)}
          revealed={revealed} onToggleRevealed={(cardId) => setRevealed((value) => ({ ...value, [cardId]: !value[cardId] }))}
          sessionCards={sessionCards} onStartSession={setSessionCards} onExitSession={endSession}
          onRateInList={saveRating} onRateInSession={persistRating}
        />}

        {view === 'quiz' && <QuizEntry locale={locale} copy={copy} quizStats={data.quizStats} onAnswer={recordQuizAnswer} onConfidence={recordQuizConfidence} targetQuestionId={quizTargetQuestionId} onTargetOpened={() => setQuizTargetQuestionId(null)} targetScenarioId={quizTargetScenarioId} onTargetScenarioOpened={() => setQuizTargetScenarioId(null)}/>}

        {view === 'progress' && <ProgressView
          locale={locale} copy={copy}
          reviews={data.reviews} studyGuideProgress={data.studyGuideProgress} handsOnProgress={data.handsOnProgress}
          quizStats={data.quizStats} activeMockExam={data.activeMockExam} mockExamAttempts={data.mockExamAttempts} dueCount={dueCardIds.length}
          analyticsEnabled={analyticsEnabled} dataUnreadable={dataUnreadable}
          examDate={examDate} onExamDateChange={saveExamDate} onExamDateClear={clearExamDate}
          onExport={exportData} onCopySummary={copySummary} onImportFile={importData} onReset={resetData}
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
