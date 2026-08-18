import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dateLocale } from '../app/format';
import { CardAnswer } from '../practice/CardAnswer';
import { PracticeSession } from '../practice/PracticeSession';
import { CopyLinkButton } from '../app/CopyLinkButton';
import { cards } from '../../content/cards';
import { domains } from '../../content/domains';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import { isDue, type Rating, type ReviewState } from '../../lib/scheduler';
import { isWeak } from '../../lib/weakness';

export const stateFilters = ['due', 'all', 'unseen', 'reviewed', 'weak'] as const;
export type StateFilter = (typeof stateFilters)[number];

export function PracticeView({
  locale, copy, reviews, now, dueCount,
  query, onQueryChange, domainFilter, onDomainFilterChange, stateFilter, onStateFilterChange,
  revealed, onToggleRevealed,
  sessionCards, onStartSession, onExitSession, onRateInList, onRateInSession,
  targetCardIds, onTargetOpened,
}: {
  locale: Locale;
  copy: UiCopy;
  reviews: Record<string, ReviewState>;
  now: Date | null;
  dueCount: number;
  query: string;
  onQueryChange: (query: string) => void;
  domainFilter: string;
  onDomainFilterChange: (domainId: string) => void;
  stateFilter: StateFilter;
  onStateFilterChange: (state: StateFilter) => void;
  revealed: Record<string, boolean>;
  onToggleRevealed: (cardId: string) => void;
  sessionCards: string[] | null;
  onStartSession: (cardIds: string[]) => void;
  onExitSession: (aborted: boolean) => void;
  onRateInList: (cardId: string, rating: Rating) => void;
  onRateInSession: (cardId: string, rating: Rating) => boolean;
  targetCardIds: string[] | null;
  onTargetOpened: () => void;
}) {
  const [activeTargetCardIds, setActiveTargetCardIds] = useState<string[] | null>(null);
  const targetNoticeRef = useRef<HTMLParagraphElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!targetCardIds?.length) return;
    setActiveTargetCardIds(targetCardIds);
    onTargetOpened();
  }, [targetCardIds, onTargetOpened]);
  useEffect(() => {
    if (activeTargetCardIds) requestAnimationFrame(() => targetNoticeRef.current?.focus());
  }, [activeTargetCardIds]);
  const filteredCards = useMemo(() => {
    const matched = cards.filter((card) => {
      const text = [card.prompt, card.answer, card.explanation, card.pitfall]
        .map((field) => localize(field, locale))
        .join(' ')
        .toLocaleLowerCase(dateLocale(locale));
      const matchesQuery = text.includes(query.trim().toLocaleLowerCase(dateLocale(locale)));
      const matchesDomain = domainFilter === 'all' || card.domainId === domainFilter;
      const review = reviews[card.id];
      const matchesState = stateFilter === 'all' || (stateFilter === 'unseen' ? !review : stateFilter === 'reviewed' ? Boolean(review) : stateFilter === 'weak' ? isWeak(review) : Boolean(now && isDue(review, card.revision, now)));
      return matchesQuery && matchesDomain && matchesState && (!activeTargetCardIds || activeTargetCardIds.includes(card.id));
    });
    // A multi-card target keeps the order the sender listed (e.g. a guide
    // section's pedagogical order), not the content-file order.
    if (!activeTargetCardIds) return matched;
    return [...matched].sort((a, b) => activeTargetCardIds.indexOf(a.id) - activeTargetCardIds.indexOf(b.id));
  }, [query, domainFilter, stateFilter, reviews, locale, now, activeTargetCardIds]);

  return (
    <section class="practice-view" aria-labelledby="practice-title">
      <header class="panel--hero"><p class="eyebrow">{copy.practice.eyebrow}</p><h2 id="practice-title" class="page-title">{copy.practice.title}</h2><p class="hero-lede">{copy.practice.introduction}</p></header>
      {activeTargetCardIds && (() => {
        const matching = activeTargetCardIds.flatMap((id) => { const card = cards.find((value) => value.id === id); return card ? [card] : []; });
        if (!matching.length) return null;
        const announcement = matching.length === 1
          ? copy.practice.targetAnnouncement(localize(matching[0].prompt, locale))
          : copy.practice.targetAnnouncementMany(matching.length);
        return <div class="note note--info practice-target"><p tabIndex={-1} role="status" aria-live="polite" ref={targetNoticeRef}>{announcement}</p><button type="button" class="btn--text" onClick={() => { setActiveTargetCardIds(null); requestAnimationFrame(() => searchInputRef.current?.focus()); }}>{copy.practice.showAll}</button></div>;
      })()}
      {sessionCards && <PracticeSession locale={locale} copy={copy} initialCards={sessionCards.flatMap((id) => { const card = cards.find((value) => value.id === id); return card ? [card] : []; })} reviews={reviews} dueCount={dueCount} onRate={onRateInSession} onExit={onExitSession}/>}
      {!sessionCards && <><div class="filter-panel">
        <label class="search-label" for="card-search">{copy.practice.searchLabel}<input ref={searchInputRef} id="card-search" type="search" value={query} onInput={(event) => onQueryChange(event.currentTarget.value)} placeholder={copy.practice.searchPlaceholder}/></label>
        <fieldset><legend>{copy.practice.stateLegend}</legend><div class="chips">{stateFilters.map((key) => <button key={key} type="button" class={`chip${stateFilter === key ? ' is-selected' : ''}`} aria-pressed={stateFilter === key} onClick={() => onStateFilterChange(key)}>{copy.practice.filters[key]}</button>)}</div></fieldset>
        <fieldset><legend>{copy.practice.domainLegend}</legend><div class="chips"><button type="button" class={`chip${domainFilter === 'all' ? ' is-selected' : ''}`} aria-pressed={domainFilter === 'all'} onClick={() => onDomainFilterChange('all')}>{copy.practice.allDomains}</button>{domains.map((domain) => <button key={domain.id} type="button" class={`chip${domainFilter === domain.id ? ' is-selected' : ''}`} aria-pressed={domainFilter === domain.id} onClick={() => onDomainFilterChange(domain.id)}>D{domain.number}</button>)}</div></fieldset>
      </div>
      <div class="session-start-row">
        <button class="btn quiz-start" disabled={!filteredCards.length} onClick={() => onStartSession(filteredCards.map((card) => card.id))}>{copy.session.start} <span aria-hidden="true">→</span></button>
        {!filteredCards.length && <p class="session-start-hint">{copy.session.cannotStart}</p>}
      </div>
      <p class="result-count">{copy.practice.resultCount(filteredCards.length)}</p>
      <div class="card-stack">{filteredCards.map((card, index) => {
        const domain = domains.find((value) => value.id === card.domainId)!;
        const answerId = `${card.id}-answer`;
        const isOpen = Boolean(revealed[card.id]);
        const review = reviews[card.id];
        return <article class="practice-card" key={card.id}>
          <header><div><span class="badge badge--ink">D{domain.number}</span><span>{copy.practice.kinds[card.kind]}</span></div><code>{String(index + 1).padStart(2, '0')} / {String(filteredCards.length).padStart(2, '0')}</code><CopyLinkButton link={{ view: 'practice', cardId: card.id }} copy={copy} label={card.id} class="practice-copy-link"/></header>
          <div class="card-prompt"><p class="eyebrow">{copy.practice.question}</p><h3>{localize(card.prompt, locale)}</h3></div>
          <button class="btn btn--wide reveal-button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => onToggleRevealed(card.id)}>{isOpen ? copy.practice.hideAnswer : copy.practice.revealAnswer} <span aria-hidden="true">{isOpen ? '−' : '+'}</span></button>
          {isOpen && <CardAnswer card={card} review={review} locale={locale} copy={copy} id={answerId} onRate={(rating) => onRateInList(card.id, rating)}/>}
        </article>;
      })}</div>
      {!filteredCards.length && <div class="empty-state"><strong>{copy.practice.emptyTitle}</strong><p>{copy.practice.emptyDescription}</p></div>}</>}
    </section>
  );
}
