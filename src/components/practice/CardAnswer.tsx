import type { MutableRef } from 'preact/hooks';
import { formatDate } from '../app/format';
import { SourceLinks } from '../app/SourceLinks';
import type { Card } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { Rating, ReviewState } from '../../lib/scheduler';

export function CardAnswer({ card, review, locale, copy, id, onRate, answerRef }: {
  card: Card;
  review: ReviewState | undefined;
  locale: Locale;
  copy: UiCopy;
  id: string;
  onRate: (rating: Rating) => void;
  answerRef?: MutableRef<HTMLDivElement | null>;
}) {
  return (
    <div class="answer" id={id} ref={answerRef} tabIndex={answerRef ? -1 : undefined}>
      <p class="eyebrow">{copy.practice.answer}</p><p class="answer-lead">{localize(card.answer, locale)}</p><p>{localize(card.explanation, locale)}</p>
      <div class="note note--warn pitfall"><strong>{copy.practice.pitfall}</strong><p>{localize(card.pitfall, locale)}</p></div>
      <div class="card-sources"><strong>{copy.practice.officialSources}</strong><SourceLinks ids={card.sourceIds} copy={copy}/><small>{copy.practice.verified(formatDate(card.verifiedAt, locale))}</small></div>
      <fieldset class="rating"><legend>{copy.practice.ratingLegend}</legend><button onClick={() => onRate('again')}>{copy.practice.ratingAgain}<small>{copy.practice.ratingAgainDelay}</small></button><button onClick={() => onRate('hard')}>{copy.practice.ratingHard}<small>{copy.practice.ratingHardDelay}</small></button><button onClick={() => onRate('good')}>{copy.practice.ratingGood}<small>{review?.lastRating === 'good' ? copy.practice.ratingGoodExtended : copy.practice.ratingGoodDelay}</small></button></fieldset>
    </div>
  );
}
