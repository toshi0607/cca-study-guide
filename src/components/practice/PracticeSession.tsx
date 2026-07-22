import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { formatNumber } from '../app/format';
import { domains } from '../../content/domains';
import type { Card } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { Rating, ReviewState } from '../../lib/scheduler';
import { emptyTally, rateSessionCard, type SessionTally } from '../../lib/session';
import { CardAnswer } from './CardAnswer';

export function PracticeSession({ locale, copy, initialCards, reviews, dueCount, onRate, onExit }: {
  locale: Locale;
  copy: UiCopy;
  initialCards: Card[];
  reviews: Record<string, ReviewState>;
  dueCount: number;
  onRate: (cardId: string, rating: Rating) => boolean;
  onExit: (aborted: boolean) => void;
}) {
  const [queue, setQueue] = useState<Card[]>(initialCards);
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<SessionTally>(emptyTally());
  const [revealed, setRevealed] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const finished = index >= queue.length;
  const revealRef = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  const current = finished ? undefined : queue[index];

  useEffect(() => {
    if (finished) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setLiveMessage(copy.session.cardAnnouncement(index + 1, queue.length));
    requestAnimationFrame(() => revealRef.current?.focus());
    // queue.length only grows together with an index change, so index + finished cover every card switch.
  }, [index, finished]);

  const reveal = () => {
    if (revealed || finished) return;
    setRevealed(true);
    setLiveMessage(copy.session.revealAnnouncement);
    requestAnimationFrame(() => answerRef.current?.focus());
  };

  const rate = (rating: Rating) => {
    if (!current || !revealed) return;
    // A failed save keeps the card in place so the rating can be retried.
    if (!onRate(current.id, rating)) return;
    const step = rateSessionCard(queue, index, rating, tally);
    setQueue(step.queue);
    setTally(step.tally);
    setRevealed(false);
    setIndex(step.index);
  };

  const requestAbort = () => {
    if (!window.confirm(copy.session.abortConfirm)) return;
    onExit(true);
  };

  const restart = () => {
    setQueue(initialCards);
    setIndex(0);
    setTally(emptyTally());
    setRevealed(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    if (event.key === 'Escape') {
      if (!finished) requestAbort();
      return;
    }
    if (finished) return;
    if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
      // Focused interactive controls (reveal button, links, disclosures) keep their native activation.
      if (target?.closest('button, a, summary')) return;
      event.preventDefault();
      reveal();
      return;
    }
    if (revealed && (event.key === '1' || event.key === '2' || event.key === '3')) {
      event.preventDefault();
      rate(event.key === '1' ? 'again' : event.key === '2' ? 'hard' : 'good');
    }
  };
  // The handler closes over `revealed`, so it must always be the current render's.
  // A passive effect re-binds asynchronously after paint, leaving a window where a
  // key pressed right after reveal is served by the stale (revealed=false) closure
  // and dropped. Keep the latest handler in a ref, updated synchronously before
  // paint, and bind one stable listener that forwards to it.
  const onKeyDownRef = useRef(onKeyDown);
  useLayoutEffect(() => { onKeyDownRef.current = onKeyDown; });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDownRef.current(event);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);

  if (finished) {
    return (
      <section class="session-summary" aria-labelledby="session-summary-title" ref={summaryRef} tabIndex={-1}>
        <p class="eyebrow">{copy.session.summaryEyebrow}</p>
        <h3 id="session-summary-title">{copy.session.summaryTitle}</h3>
        <dl class="session-breakdown" aria-label={copy.session.breakdownLegend}>
          <div><dt>{copy.practice.ratingAgain}</dt><dd>{formatNumber(tally.again, locale)}</dd></div>
          <div><dt>{copy.practice.ratingHard}</dt><dd>{formatNumber(tally.hard, locale)}</dd></div>
          <div><dt>{copy.practice.ratingGood}</dt><dd>{formatNumber(tally.good, locale)}</dd></div>
        </dl>
        <p class="session-summary-meta">{copy.session.ratedCount(queue.length)} · {copy.session.dueRemaining(dueCount)}</p>
        <div class="session-summary-actions">
          <button class="quiz-start" onClick={restart}>{copy.session.restart}</button>
          <button class="quiz-quit" onClick={() => onExit(false)}>{copy.session.backToList}</button>
        </div>
      </section>
    );
  }

  const card = current!;
  const domain = domains.find((value) => value.id === card.domainId)!;
  const review = reviews[card.id];

  return (
    <div class="session-view">
      <p class="sr-only" aria-live="polite">{liveMessage}</p>
      <article class="practice-card session-card">
        <header>
          <div><span class="card-domain">D{domain.number}</span><span>{copy.practice.kinds[card.kind]}</span></div>
          <div class="session-progress"><code>{copy.session.progress(index + 1, queue.length)}</code><span>{copy.session.remaining(queue.length - index - 1)}</span></div>
        </header>
        <div class="card-prompt"><p class="eyebrow">{copy.practice.question}</p><h3>{localize(card.prompt, locale)}</h3></div>
        {!revealed && <button class="reveal-button" ref={revealRef} aria-expanded={false} aria-controls="session-answer" onClick={reveal}>{copy.practice.revealAnswer} <span aria-hidden="true">+</span></button>}
        {revealed && <CardAnswer card={card} review={review} locale={locale} copy={copy} id="session-answer" onRate={rate} answerRef={answerRef}/>}
        <button class="quiz-quit" onClick={requestAbort}>{copy.session.quit}</button>
      </article>
      <p class="session-shortcuts">{copy.session.shortcutsReveal} · {copy.session.shortcutsRate} · {copy.session.shortcutsQuit}</p>
    </div>
  );
}
