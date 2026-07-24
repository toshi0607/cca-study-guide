import { formatNumber } from '../app/format';
import { domains } from '../../content/domains';
import type { ChoiceQuestion } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { RationalesState } from '../../lib/rationales-loader';
import { AnswerReview } from './AnswerReview';
import { QuestionMetadata } from './QuestionMetadata';
import type { QuizResult } from './types';

export function QuizSummary({ results, correctCount, wrongResults, rationalesState, locale, copy, onRetry }: {
  results: QuizResult[];
  correctCount: number;
  wrongResults: QuizResult[];
  rationalesState: RationalesState;
  locale: Locale;
  copy: UiCopy;
  onRetry: () => void;
}) {
  const answerText = (question: ChoiceQuestion) =>
    question.choices.filter((choice) => question.correctChoiceIds.includes(choice.id)).map((choice) => localize(choice.text, locale)).join(' / ');

  return (
    <div class="quiz-summary">
      <section class="quiz-score" aria-labelledby="quiz-score-title">
        <p class="eyebrow" id="quiz-score-title">{copy.quiz.summaryEyebrow}</p>
        <h3 class="section-title">{copy.quiz.summaryTitle}</h3>
        <div class="quiz-score-figure">
          <span>{copy.quiz.accuracy}</span>
          <strong>{results.length ? Math.round((correctCount / results.length) * 100) : 0}%</strong>
          <span>{copy.quiz.scoreLine(correctCount, results.length)}</span>
        </div>
      </section>
      <section class="quiz-domains" aria-labelledby="quiz-domains-title">
        <h3 id="quiz-domains-title" class="section-title">{copy.quiz.byDomain}</h3>
        {domains.map((domain) => {
          const domainResults = results.filter((result) => result.question.domainId === domain.id);
          if (!domainResults.length) return null;
          const domainCorrect = domainResults.filter((result) => result.correct).length;
          return <div class="progress-row" key={domain.id}>
            <span>D{domain.number} {localize(domain.title, locale)}</span>
            <progress value={domainCorrect} max={domainResults.length}>{domainCorrect}/{domainResults.length}</progress>
            <strong>{formatNumber(domainCorrect, locale)}/{formatNumber(domainResults.length, locale)}</strong>
          </div>;
        })}
      </section>
      <section class="quiz-missed" aria-labelledby="quiz-missed-title">
        <h3 id="quiz-missed-title" class="section-title">{copy.quiz.wrongTitle}</h3>
        {wrongResults.length
          ? <ul>{wrongResults.map((result) => <li key={result.question.id}>
              <details class="quiz-review-item">
                <summary>{localize(result.question.stem, locale)}</summary>
                <div class="quiz-review-body">
                  <QuestionMetadata question={result.question} locale={locale} copy={copy}/>
                  <p class="quiz-correct-answer"><strong>{copy.quiz.correctAnswerLabel}</strong> {answerText(result.question)}</p>
                  <AnswerReview question={result.question} selectedIds={result.selectedIds} rationalesState={rationalesState} locale={locale} copy={copy}/>
                </div>
              </details>
            </li>)}</ul>
          : <p>{copy.quiz.noWrong}</p>}
      </section>
      <button class="btn quiz-start" onClick={onRetry}>{copy.quiz.retry}</button>
    </div>
  );
}
