import { useState } from 'preact/hooks';
import type { MutableRef } from 'preact/hooks';
import type { ChoiceQuestion } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { MockExamAttempt, MockExamAttemptAnswer } from '../../lib/mock-exam';
import { useChoiceRationales } from '../../lib/rationales-loader';
import { formatDate } from '../app/format';
import { SourceLinks } from '../app/SourceLinks';
import { AnswerReview } from '../quiz/AnswerReview';
import { QuestionMetadata } from '../quiz/QuestionMetadata';

type ReviewFilter = 'all' | 'incorrect' | 'unanswered' | 'flagged';

// Post-exam review. Rationale text is loaded here (never during the timed run),
// reusing the quiz's own on-demand loader so its chunk is fetched only once the
// learner opens the review. A stale attempt (content changed under it) is shown
// as-stored with a banner, never silently re-graded against current questions.
export function MockExamReview({ attempt, questionById, headingRef, locale, copy, onBack }: {
  attempt: MockExamAttempt;
  questionById: ReadonlyMap<string, ChoiceQuestion>;
  headingRef: MutableRef<HTMLHeadingElement | null>;
  locale: Locale;
  copy: UiCopy;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const rationalesState = useChoiceRationales(true);
  const flaggedSet = new Set(attempt.flaggedQuestionIds);

  const rows = attempt.answers.map((answer, index) => {
    const question = questionById.get(answer.questionId);
    const answered = Boolean(answer.answeredAt);
    return { answer, index, question, answered, flagged: flaggedSet.has(answer.questionId) };
  });
  const stale = rows.some((row) => !row.question || row.question.revision !== row.answer.questionRevision);

  const visible = rows.filter((row) => {
    if (filter === 'incorrect') return row.answered && !row.answer.correct;
    if (filter === 'unanswered') return !row.answered;
    if (filter === 'flagged') return row.flagged;
    return true;
  });

  const answerText = (question: ChoiceQuestion, ids: readonly string[]) =>
    question.choices.filter((choice) => ids.includes(choice.id)).map((choice) => localize(choice.text, locale)).join(' / ');

  const filterLabel: Record<ReviewFilter, string> = {
    all: copy.mockExam.reviewFilterAll,
    incorrect: copy.mockExam.reviewFilterIncorrect,
    unanswered: copy.mockExam.reviewFilterUnanswered,
    flagged: copy.mockExam.reviewFilterFlagged,
  };

  return (
    <section class="mock-exam-review" aria-labelledby="mock-exam-review-title">
      <header class="page-header compact">
        <p class="eyebrow">{copy.mockExam.resultEyebrow}</p>
        <h2 id="mock-exam-review-title" tabIndex={-1} ref={headingRef}>{copy.mockExam.reviewTitle}</h2>
      </header>
      {stale && <p class="mock-exam-notice" role="note">{copy.mockExam.staleAttemptNotice}</p>}
      <div class="mock-exam-review-filters" role="group" aria-label={copy.mockExam.reviewTitle}>
        {(['all', 'incorrect', 'unanswered', 'flagged'] as const).map((key) => (
          <button key={key} type="button" class={filter === key ? 'is-active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {filterLabel[key]}
          </button>
        ))}
      </div>
      {visible.length === 0
        ? <p class="mock-exam-review-empty">{copy.mockExam.reviewEmpty}</p>
        : <ol class="mock-exam-review-list">
            {visible.map((row) => {
              const verdict = !row.answered ? copy.mockExam.verdictUnanswered : row.answer.correct ? copy.mockExam.verdictCorrect : copy.mockExam.verdictIncorrect;
              const verdictClass = !row.answered ? 'is-unanswered' : row.answer.correct ? 'is-correct' : 'is-incorrect';
              // A row is stale when its question is gone or its revision changed
              // under the stored attempt. For those, show ONLY what the attempt
              // itself holds (selected choice ids, verdict) — never the current
              // stem/choices/correct answer/rationale/source, which could contradict
              // the old verdict. Fresh rows render the full review.
              const rowStale = !row.question || row.question.revision !== row.answer.questionRevision;
              return (
                <li key={row.answer.questionId} class="mock-exam-review-item">
                  <div class="mock-exam-review-item-head">
                    <code>{copy.mockExam.reviewQuestionMeta(row.index + 1)}</code>
                    <span class={`mock-exam-verdict ${verdictClass}`}>{verdict}</span>
                  </div>
                  {!rowStale && row.question
                    ? <>
                        <QuestionMetadata question={row.question} locale={locale} copy={copy}/>
                        <div class="card-prompt"><h3>{localize(row.question.stem, locale)}</h3></div>
                        <p class="mock-exam-your-answer"><strong>{copy.mockExam.yourAnswerLabel}</strong> {row.answered ? answerText(row.question, row.answer.selectedChoiceIds) : copy.mockExam.notAnswered}</p>
                        <p class="mock-exam-correct-answer"><strong>{copy.mockExam.correctAnswerLabel}</strong> {answerText(row.question, row.question.correctChoiceIds)}</p>
                        <AnswerReview question={row.question} selectedIds={[...row.answer.selectedChoiceIds]} rationalesState={rationalesState} locale={locale} copy={copy}/>
                        <div class="card-sources"><strong>{copy.mockExam.officialSources}</strong><SourceLinks ids={row.question.sourceIds} copy={copy}/><small>{copy.mockExam.verified(formatDate(row.question.verifiedAt, locale))}</small></div>
                      </>
                    : <>
                        <p class="mock-exam-review-missing" role="note">{copy.mockExam.reviewStaleQuestion}</p>
                        <p class="mock-exam-your-answer"><strong>{copy.mockExam.yourAnswerLabel}</strong> {row.answered ? row.answer.selectedChoiceIds.map((id) => id.toUpperCase()).join(' / ') : copy.mockExam.notAnswered}</p>
                      </>}
                </li>
              );
            })}
          </ol>}
      <button type="button" class="mock-exam-link" onClick={onBack}>{copy.mockExam.reviewBack}</button>
    </section>
  );
}
