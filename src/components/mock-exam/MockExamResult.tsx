import type { MutableRef } from 'preact/hooks';
import { domains } from '../../content/domains';
import { skillById } from '../../content/skills';
import { questionDifficulties, type Skill } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { MockExamAttempt, MockExamResult as MockExamResultType, MockExamTally } from '../../lib/mock-exam';
import { mockExamAccuracyPercent } from '../../lib/use-mock-exam';

type TallyRow = { key: string; label: string; tally: MockExamTally };

function TallyTable({ heading, rows, note, copy }: { heading: string; rows: TallyRow[]; note?: string; copy: UiCopy }) {
  if (rows.length === 0) return null;
  return (
    <section class="panel panel--sm mock-exam-tally" aria-label={heading}>
      <h3 class="card-title">{heading}</h3>
      {note && <p class="mock-exam-tally-note">{note}</p>}
      <dl>
        {rows.map((row) => (
          <div key={row.key}>
            <dt>{row.label}</dt>
            <dd>{copy.mockExam.tallyValue(row.tally.correct, row.tally.answered, row.tally.total)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Raw result only: correct count, raw accuracy, and factual by-axis tallies. No
// pass/fail, scaled score, or readiness is derived or displayed — the disclaimer
// states plainly that this is not the official scaled score.
export function MockExamResult({ attempt, result, stale, headingRef, locale, copy, onReview, onOpenHistory, onBackToLanding }: {
  attempt: MockExamAttempt;
  result: MockExamResultType;
  stale: boolean;
  headingRef: MutableRef<HTMLHeadingElement | null>;
  locale: Locale;
  copy: UiCopy;
  onReview: () => void;
  onOpenHistory: (() => void) | null;
  onBackToLanding: () => void;
}) {
  const percent = mockExamAccuracyPercent(result.rawAccuracy);

  const domainRows: TallyRow[] = domains
    .filter((domain) => result.byDomain[domain.id])
    .map((domain) => ({ key: domain.id, label: `D${domain.number} ${localize(domain.title, locale)}`, tally: result.byDomain[domain.id] }));

  const difficultyRows: TallyRow[] = questionDifficulties
    // byDifficulty is pre-seeded with every level; drop empty ones so the table
    // stays consistent with byDomain (which only lists difficulties actually present).
    .filter((difficulty) => result.byDifficulty[difficulty]?.total > 0)
    .map((difficulty) => ({ key: difficulty, label: copy.mockExam.difficulty[difficulty], tally: result.byDifficulty[difficulty] }));

  const skillRows: TallyRow[] = Object.entries(result.bySkill)
    .map(([id, tally]) => {
      const skill = skillById[id as keyof typeof skillById] as Skill | undefined;
      return skill && tally ? { key: id, label: localize(skill.title, locale), tally } : null;
    })
    .filter((row): row is TallyRow => row !== null)
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <section class="mock-exam-result" aria-labelledby="mock-exam-result-title">
      <header class="panel--hero is-compact">
        <p class="eyebrow">{copy.mockExam.resultEyebrow}</p>
        <h2 id="mock-exam-result-title" class="page-title" tabIndex={-1} ref={headingRef}>{copy.mockExam.resultTitle}</h2>
        <p class="mock-exam-outcome">{attempt.outcome === 'expired' ? copy.mockExam.outcomeExpired : copy.mockExam.outcomeSubmitted}</p>
      </header>
      {stale && <p class="note note--warn mock-exam-notice" role="note">{copy.mockExam.staleAttemptNotice}</p>}
      <p class="note note--info mock-exam-disclaimer">{copy.mockExam.resultDisclaimer}</p>
      <dl class="panel panel--sm mock-exam-scoreboard">
        <div><dt>{copy.mockExam.rawAccuracyLabel}</dt><dd>{copy.mockExam.rawAccuracyValue(percent)}</dd></div>
        <div><dt>{copy.mockExam.correctLabel}</dt><dd>{result.correctAnswers}</dd></div>
        <div><dt>{copy.mockExam.totalQuestionsLabel}</dt><dd>{result.totalQuestions}</dd></div>
        <div><dt>{copy.mockExam.answeredLabel}</dt><dd>{result.answeredQuestions}</dd></div>
        <div><dt>{copy.mockExam.unansweredLabel}</dt><dd>{result.totalQuestions - result.answeredQuestions}</dd></div>
      </dl>
      {/* Raw counts (accuracy/correct/total/answered) come from the attempt's own
          stored correctness flags and stay valid. The by-axis breakdowns join to
          the CURRENT questions, so for a stale attempt they would attribute old
          verdicts to possibly-changed metadata — hide them rather than mislead. */}
      {stale
        ? <p class="mock-exam-tally-note">{copy.mockExam.staleBreakdownHidden}</p>
        : <>
            <TallyTable heading={copy.mockExam.byDomainHeading} rows={domainRows} copy={copy}/>
            <TallyTable heading={copy.mockExam.byDifficultyHeading} rows={difficultyRows} copy={copy}/>
            <TallyTable heading={copy.mockExam.bySkillHeading} rows={skillRows} note={copy.mockExam.skillMultiNote} copy={copy}/>
          </>}
      <div class="mock-exam-result-actions">
        <button type="button" class="btn" onClick={onReview}>{copy.mockExam.reviewButton}</button>
        {onOpenHistory && <button type="button" class="btn btn--secondary" onClick={onOpenHistory}>{copy.mockExam.historyButton}</button>}
        <button type="button" class="btn--text mock-exam-link" onClick={onBackToLanding}>{copy.mockExam.backToLanding}</button>
      </div>
    </section>
  );
}
