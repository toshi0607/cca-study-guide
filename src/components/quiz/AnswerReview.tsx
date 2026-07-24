import type { ChoiceQuestion } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { RationalesState } from '../../lib/rationales-loader';
import { ChoiceReview } from './ChoiceReview';

// The two-part explanation shown after an answer and reused in the summary:
// the whole-question judgment (`explanation`) under one heading and the
// per-choice reasoning under another, so a learner never mistakes one for the
// other. The per-choice text is the deferred rationale; the whole-question
// explanation ships with the question and is always present.
export function AnswerReview({ question, selectedIds, rationalesState, locale, copy }: {
  question: ChoiceQuestion;
  selectedIds: string[];
  rationalesState: RationalesState;
  locale: Locale;
  copy: UiCopy;
}) {
  return (
    <>
      <section class="answer-section">
        <h4 class="sub-title">{copy.quiz.explanationHeading}</h4>
        <p>{localize(question.explanation, locale)}</p>
      </section>
      <section class="answer-section">
        <h4 class="sub-title">{copy.quiz.rationaleHeading}</h4>
        <ChoiceReview question={question} selectedIds={selectedIds} rationalesState={rationalesState} locale={locale} copy={copy}/>
      </section>
    </>
  );
}
