import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { questions } from '../../content/questions';
import type { Locale } from '../../i18n/locales';
import type { UiCopy } from '../../i18n/ui';
import {
  defaultMockExamBlueprint,
  deriveMockExamRemainingSeconds,
  deriveMockExamResult,
  moveMockExamCursor,
  setMockExamAnswer,
  toggleMockExamFlag,
  validateMockExamCompatibility,
  type MockExamAttempt,
  type MockExamResult,
  type MockExamSession,
} from '../../lib/mock-exam';
import { applyMockExamCreate, applyMockExamDiscard, applyMockExamSessionChange, finalizeMockExam, type MockExamFinalizeOutcome } from '../../lib/mock-exam-controller';
import type { StudyData } from '../../lib/storage';
import { useSecondTick } from '../../lib/use-mock-exam';
import { MockExamHistory } from './MockExamHistory';
import { MockExamLanding } from './MockExamLanding';
import { MockExamResult as MockExamResultView } from './MockExamResult';
import { MockExamReview } from './MockExamReview';
import { MockExamRunner } from './MockExamRunner';

// The Mock Exam engine and controller are imported HERE, inside this lazily
// loaded view, and never by App — so the exam logic stays out of the initial
// landing bundle and is fetched only when the learner opens the exam. App hands
// down a minimal storage bridge (read/write/notify) instead of engine-bound
// callbacks, keeping its static import graph free of the engine.
export type MockExamStorageBridge = {
  readData: () => StudyData;
  // Persists the whole document; returns false and surfaces the save-failed
  // notice (owned by App) when the write is refused.
  writeData: (data: StudyData) => boolean;
};

export type MockExamViewProps = MockExamStorageBridge & {
  locale: Locale;
  copy: UiCopy;
  session: MockExamSession | null;
  attempts: readonly MockExamAttempt[];
  storageAvailable: boolean;
};

type Phase = 'landing' | 'running' | 'result' | 'incompatible' | 'history' | 'save-error';
type ActiveResult = { attempt: MockExamAttempt; result: MockExamResult; stale: boolean };

function createExamId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `exam-${crypto.randomUUID()}`;
  return `exam-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

// Orchestrates the exam flow. Persistent state (answers, flags, cursor, active
// session, attempt history) lives entirely in storage; this component reads it
// through the bridge, calls the pure engine/controller, and writes back. It holds
// only the screen phase and the graded result being shown. All completion funnels
// through `finalize`, guarded so submit and auto-expiry never double-grade.
export function MockExamView({ locale, copy, session, attempts, storageAvailable, readData, writeData }: MockExamViewProps) {
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), []);
  const choiceIds = useMemo(() => new Map(questions.map((question) => [question.id, question.choices.map((choice) => choice.id)])), []);
  const [phase, setPhase] = useState<Phase>('landing');
  const [active, setActive] = useState<ActiveResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [pendingMode, setPendingMode] = useState<'submit' | 'expire' | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const incompatibleRef = useRef<HTMLElement | null>(null);
  const saveErrorRef = useRef<HTMLElement | null>(null);
  const finalizingRef = useRef(false);

  // Storage-first mutations: each reads canonical storage immediately before the
  // pure transform, then writes the whole document back, so a concurrent tab is
  // never clobbered and the completion path stays exactly-once.
  const createMockExam = (): boolean => {
    const current = readData();
    const { data, result } = applyMockExamCreate(current, { questions, blueprint: defaultMockExamBlueprint, now: new Date(), createId: createExamId });
    if (!result.ok) return false;
    return writeData(data);
  };

  const changeSession = (change: (session: MockExamSession) => MockExamSession): boolean => {
    const current = readData();
    const next = applyMockExamSessionChange(current, change);
    if (next === current) return false;
    return writeData(next);
  };

  const answerMockExam = (questionId: string, selectedChoiceIds: string[]): boolean =>
    changeSession((current) => setMockExamAnswer({ session: current, questionId, selectedChoiceIds, now: new Date(), validChoiceIds: choiceIds.get(questionId) }));
  const flagMockExam = (questionId: string): boolean =>
    changeSession((current) => toggleMockExamFlag(current, questionId, new Date()));
  const moveMockExam = (index: number): boolean =>
    changeSession((current) => moveMockExamCursor(current, index, new Date()));

  const runFinalize = (mode: 'submit' | 'expire'): { outcome: MockExamFinalizeOutcome; saved: boolean } => {
    const current = readData();
    const { data, outcome } = finalizeMockExam(current, { questions, mode, now: new Date() });
    // Only a real completion changes the document. If the write is refused
    // (quota/blocked), `saved` is false — the caller must NOT claim submission,
    // since the attempt was not persisted and the active session still stands.
    const saved = data === current ? true : writeData(data);
    return { outcome, saved };
  };

  const discardMockExam = (): boolean => {
    const current = readData();
    const next = applyMockExamDiscard(current);
    if (next === current) return false;
    return writeData(next);
  };

  const finalize = (mode: 'submit' | 'expire'): void => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setSubmitting(true);
    const { outcome, saved } = runFinalize(mode);
    setSubmitting(false);
    if (outcome.ok) {
      if (saved) {
        setActive({ attempt: outcome.attempt, result: outcome.result, stale: false });
        setReviewing(false);
        setPendingMode(null);
        setPhase('result');
      } else {
        // Graded but NOT persisted: never claim submission. Keep the active
        // session, show a retry (writeData already surfaced the save-failed
        // notice), and release the guard so the retry can run. Exam stays resumable.
        setPendingMode(mode);
        setPhase('save-error');
        finalizingRef.current = false;
      }
    } else if (outcome.reason === 'incompatible-content') {
      setPhase('incompatible');
    } else {
      // not-due (expiry watchdog fired early) or no-active (already finalized):
      // release the guard so a genuine later completion can proceed.
      finalizingRef.current = false;
    }
  };

  const retryFinalize = () => { if (pendingMode) finalize(pendingMode); };

  // One-shot reconciliation from a persisted session: auto-expire if the deadline
  // already passed, or surface an incompatible-content mismatch. A compatible,
  // still-running session is NOT auto-resumed — it lands on the start screen so
  // the learner explicitly chooses resume vs. a new exam. Runs once on mount; the
  // empty dep list is intentional.
  useEffect(() => {
    if (!session) return;
    const compatibility = validateMockExamCompatibility(session, questions);
    if (!compatibility.compatible) { setPhase('incompatible'); return; }
    if (new Date().getTime() >= Date.parse(session.expiresAt)) finalize('expire');
    // else: stay on 'landing', which shows resume / new-exam because a session exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const running = phase === 'running' && !!session;
  const clock = useSecondTick(running);
  const remaining = running && session ? deriveMockExamRemainingSeconds(session, clock) : 0;

  useEffect(() => {
    if (running && remaining <= 0) finalize('expire');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remaining]);

  useEffect(() => {
    if (phase === 'result' && !reviewing) requestAnimationFrame(() => resultHeadingRef.current?.focus());
  }, [phase, reviewing, active]);
  useEffect(() => {
    if (phase === 'result' && reviewing) requestAnimationFrame(() => reviewHeadingRef.current?.focus());
  }, [phase, reviewing]);
  useEffect(() => {
    if (phase === 'history') requestAnimationFrame(() => historyHeadingRef.current?.focus());
  }, [phase]);
  useEffect(() => {
    if (phase === 'incompatible') requestAnimationFrame(() => incompatibleRef.current?.focus());
  }, [phase]);
  useEffect(() => {
    if (phase === 'save-error') requestAnimationFrame(() => saveErrorRef.current?.focus());
  }, [phase]);

  const beginExam = () => {
    if (createMockExam()) { setCreateError(false); finalizingRef.current = false; setPhase('running'); }
    else setCreateError(true);
  };

  const handleResume = () => { finalizingRef.current = false; setPhase('running'); };
  const handleNewExam = () => {
    if (!window.confirm(copy.mockExam.discardConfirm)) return;
    if (!discardMockExam()) return;
    beginExam();
  };
  const handleIncompatibleDiscard = () => {
    if (!window.confirm(copy.mockExam.incompatibleDiscardConfirm)) return;
    if (discardMockExam()) { setActive(null); setPhase('landing'); }
  };
  const openAttempt = (attempt: MockExamAttempt) => {
    const result = deriveMockExamResult(attempt, questions);
    const stale = attempt.answers.some((answer) => {
      const question = questionById.get(answer.questionId);
      return !question || question.revision !== answer.questionRevision;
    });
    setActive({ attempt, result, stale });
    setReviewing(false);
    setPhase('result');
  };

  const currentRef = session && phase === 'running' ? session.questionRefs[session.currentIndex] : undefined;
  const currentQuestion = currentRef ? questionById.get(currentRef.questionId) : undefined;

  const incompatibleSection = (
    <section class="mock-exam-incompatible" aria-labelledby="mock-exam-incompatible-title" tabIndex={-1} ref={incompatibleRef}>
      <h2 id="mock-exam-incompatible-title">{copy.mockExam.incompatibleTitle}</h2>
      <p>{copy.mockExam.incompatibleBody}</p>
      <button type="button" class="mock-exam-secondary" onClick={handleIncompatibleDiscard}>{copy.mockExam.incompatibleDiscard}</button>
    </section>
  );

  return (
    <div class="mock-exam-view">
      {!storageAvailable && <p class="mock-exam-notice" role="note">{copy.mockExam.storageUnavailable}</p>}

      {phase === 'landing' && <MockExamLanding
        hasActiveSession={!!session}
        hasHistory={attempts.length > 0}
        createError={createError}
        copy={copy}
        onStart={beginExam}
        onResume={handleResume}
        onNewExam={handleNewExam}
        onOpenHistory={() => setPhase('history')}
      />}

      {phase === 'running' && session && currentQuestion && <MockExamRunner
        session={session}
        question={currentQuestion}
        remainingSeconds={remaining}
        submitting={submitting}
        locale={locale}
        copy={copy}
        onSelect={answerMockExam}
        onToggleFlag={flagMockExam}
        onMove={moveMockExam}
        onSubmit={() => finalize('submit')}
      />}

      {phase === 'running' && (!session || !currentQuestion) && incompatibleSection}
      {phase === 'incompatible' && incompatibleSection}

      {phase === 'save-error' && <section class="mock-exam-save-error" aria-labelledby="mock-exam-save-error-title" tabIndex={-1} ref={saveErrorRef}>
        <h2 id="mock-exam-save-error-title">{copy.mockExam.saveErrorTitle}</h2>
        <p>{copy.mockExam.saveErrorBody}</p>
        <div class="mock-exam-landing-actions">
          <button type="button" class="mock-exam-primary" onClick={retryFinalize}>{copy.mockExam.saveErrorRetry}</button>
          {pendingMode === 'submit' && <button type="button" class="mock-exam-secondary" onClick={() => { finalizingRef.current = false; setPhase('running'); }}>{copy.mockExam.resumeButton}</button>}
        </div>
      </section>}

      {phase === 'result' && active && !reviewing && <MockExamResultView
        attempt={active.attempt}
        result={active.result}
        stale={active.stale}
        headingRef={resultHeadingRef}
        locale={locale}
        copy={copy}
        onReview={() => setReviewing(true)}
        onOpenHistory={attempts.length > 0 ? () => setPhase('history') : null}
        onBackToLanding={() => { setActive(null); setPhase('landing'); }}
      />}

      {phase === 'result' && active && reviewing && <MockExamReview
        attempt={active.attempt}
        questionById={questionById}
        headingRef={reviewHeadingRef}
        locale={locale}
        copy={copy}
        onBack={() => setReviewing(false)}
      />}

      {phase === 'history' && <MockExamHistory
        attempts={attempts}
        headingRef={historyHeadingRef}
        locale={locale}
        copy={copy}
        onOpen={openAttempt}
        onBack={() => setPhase(active ? 'result' : 'landing')}
      />}
    </div>
  );
}
