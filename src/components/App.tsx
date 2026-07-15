import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { cards } from '../content/cards';
import { domains } from '../content/domains';
import { sourceById, sources, VERIFIED_AT } from '../content/sources';
import { locales, localePaths, type Locale } from '../i18n/locales';
import { localize, ui, type UiCopy } from '../i18n/ui';
import { isDue, scheduleReview, type Rating, type ReviewState } from '../lib/scheduler';
import { createStudyStorage, type StudyData } from '../lib/storage';

type View = 'today' | 'guide' | 'practice' | 'progress';

const viewKeys: View[] = ['today', 'guide', 'practice', 'progress'];
const stateFilters = ['due', 'all', 'unseen', 'reviewed'] as const;
const icons: Record<View, string> = { today: '⌂', guide: '▤', practice: '◇', progress: '✓' };

function studyStorage() {
  try {
    return createStudyStorage(window.localStorage);
  } catch {
    return createStudyStorage(undefined);
  }
}

function dateLocale(locale: Locale) {
  return locale === 'ja' ? 'ja-JP' : 'en-US';
}

function formatDate(value: Date | string, locale: Locale) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: 'long' }).format(date);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(dateLocale(locale)).format(value);
}

function LanguageNav({ locale, copy, modifier }: { locale: Locale; copy: UiCopy; modifier?: string }) {
  return (
    <nav class={`language-switcher${modifier ? ` language-switcher--${modifier}` : ''}`} aria-label={copy.aria.languageNavigation}>
      {locales.map((option) => (
        <a
          key={option}
          href={localePaths[option].app}
          lang={option}
          hrefLang={option}
          aria-current={locale === option ? 'page' : undefined}
        >
          {copy.languageNames[option]}
        </a>
      ))}
    </nav>
  );
}

function SourceLinks({ ids, copy }: { ids: string[]; copy: UiCopy }) {
  return (
    <ul class="source-links">
      {ids.map((id) => {
        const source = sourceById.get(id);
        return source ? (
          <li key={id}>
            <a href={source.url} target="_blank" rel="noreferrer">
              <span lang="en">{source.title}</span><span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span>
            </a>
          </li>
        ) : null;
      })}
    </ul>
  );
}

function Blueprint({ reviews, ready, locale, copy }: { reviews: Record<string, ReviewState>; ready: boolean; locale: Locale; copy: UiCopy }) {
  const progress = (domainId: string) => {
    const domainCards = cards.filter((card) => card.domainId === domainId);
    return Math.round((domainCards.filter((card) => reviews[card.id]).length / domainCards.length) * 100);
  };

  return (
    <section class="blueprint" aria-labelledby="coverage-title">
      <div class="section-heading">
        <div><p class="eyebrow">{copy.blueprint.eyebrow}</p><h2 id="coverage-title">{copy.blueprint.title}</h2></div>
        <p>{copy.blueprint.progressNote}</p>
      </div>
      <div class="blueprint-map">
        <svg class="blueprint-lines" viewBox="0 0 1000 300" aria-hidden="true"><path d="M125 88 H380 L500 210 H680 L810 85"/><path d="M380 88 H810"/><circle cx="380" cy="88" r="5"/><circle cx="500" cy="210" r="5"/></svg>
        {domains.map((domain, index) => {
          const percent = ready ? progress(domain.id) : 0;
          return (
            <div class={`blueprint-node node-${index + 1}`} key={domain.id}>
              <div class="node-copy"><span>D{domain.number}</span><strong>{domain.weight}%</strong></div>
              <div class="node-progress" style={{ '--progress': `${percent}%` }}><span>{ready ? copy.blueprint.started(percent) : '—'}</span></div>
              <p>{localize(domain.title, locale)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function App({ locale, analyticsEnabled = false }: { locale: Locale; analyticsEnabled?: boolean }) {
  const copy = ui[locale];
  const [view, setView] = useState<View>('today');
  const [data, setData] = useState<StudyData>({ version: 1, reviews: {} });
  const [now, setNow] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<'due' | 'all' | 'unseen' | 'reviewed'>('due');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState('');
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const refreshNow = () => setNow(new Date());
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshNow();
    };

    setData(studyStorage().load());
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
  const reviewedCount = Object.keys(data.reviews).filter((id) => cards.some((card) => card.id === id)).length;
  const filteredCards = useMemo(() => cards.filter((card) => {
    const text = [card.prompt, card.answer, card.explanation, card.pitfall]
      .map((field) => localize(field, locale))
      .join(' ')
      .toLocaleLowerCase(dateLocale(locale));
    const matchesQuery = text.includes(query.trim().toLocaleLowerCase(dateLocale(locale)));
    const matchesDomain = domainFilter === 'all' || card.domainId === domainFilter;
    const review = data.reviews[card.id];
    const matchesState = stateFilter === 'all' || (stateFilter === 'unseen' ? !review : stateFilter === 'reviewed' ? Boolean(review) : Boolean(now && isDue(review, card.revision, now)));
    return matchesQuery && matchesDomain && matchesState;
  }), [query, domainFilter, stateFilter, data, locale, now]);

  const focusNotice = () => requestAnimationFrame(() => noticeRef.current?.focus());

  const saveRating = (cardId: string, rating: Rating) => {
    const currentCard = cards.find((card) => card.id === cardId)!;
    const reviews = { ...data.reviews, [cardId]: scheduleReview(cardId, currentCard.revision, rating, data.reviews[cardId]) };
    const next = { version: 1 as const, reviews };
    if (!studyStorage().save(next)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return;
    }
    setData(next);
    setRevealed((value) => ({ ...value, [cardId]: false }));
    setNotice(rating === 'again' ? copy.notices.ratingAgain : rating === 'hard' ? copy.notices.ratingHard : copy.notices.ratingGood);
    focusNotice();
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'CCA Field Notes', ...data }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cca-field-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(copy.notices.exported);
  };

  const resetData = () => {
    if (!window.confirm(copy.notices.resetConfirm)) return;
    if (!studyStorage().reset()) {
      setNotice(copy.notices.resetFailed);
      focusNotice();
      return;
    }
    setData({ version: 1, reviews: {} });
    setRevealed({});
    setNotice(copy.notices.resetDone);
  };

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div class="app-shell">
      <header class="mobile-header">
        <div class="wordmark"><b>{copy.brand.mark}</b><span>{copy.brand.fieldNotes}</span></div>
        <div class="mobile-tools"><LanguageNav locale={locale} copy={copy} modifier="mobile"/><span class="unofficial">{copy.brand.unofficial}</span></div>
      </header>
      <aside class="rail">
        <div>
          <div class="wordmark"><b>{copy.brand.mark}</b><span>{copy.brand.fieldNotes}</span></div>
          <p class="edition">{copy.brand.edition}</p>
          <LanguageNav locale={locale} copy={copy} modifier="rail"/>
        </div>
        <nav aria-label={copy.aria.mainNavigation}>
          {viewKeys.map((key) => <button key={key} disabled={!ready} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span aria-hidden="true">{icons[key]}</span>{copy.views[key]}</button>)}
        </nav>
        <p class="rail-note"><strong>{copy.brand.unofficial}</strong><br/>{copy.brand.affiliationShort}</p>
      </aside>

      <main id="main-content">
        <h1 class="sr-only">{copy.pageTitle}</h1>
        <p ref={noticeRef} class="notice" tabIndex={-1} aria-live="polite">{notice}</p>
        {view === 'today' && <div class="view-stack">
          <section class="today-hero" aria-labelledby="today-title">
            <div>
              <p class="eyebrow">{copy.today.eyebrow} · {now ? formatDate(now, locale) : '—'}</p>
              <h2 id="today-title">{copy.today.titleLead}<br/><em>{copy.today.titleEmphasis}</em></h2>
              <p>{copy.today.introduction}</p>
            </div>
            <div class="due-block">
              <span>{copy.today.dueTitle}</span>
              <strong>{ready && now ? formatNumber(dueCards.length, locale) : '—'}</strong>
              <span>{ready && now ? copy.today.dueCount(dueCards.length) : '—'}</span>
              <button disabled={!ready} onClick={() => { setStateFilter('due'); navigate('practice'); }}>{copy.today.startReview} <span aria-hidden="true">→</span></button>
            </div>
          </section>
          <Blueprint reviews={data.reviews} ready={ready} locale={locale} copy={copy}/>
          <section class="status-strip" aria-labelledby="status-title">
            <div><p class="eyebrow">{copy.status.eyebrow}</p><h2 id="status-title">{copy.status.title}</h2></div>
            <dl>
              <div><dt>{copy.status.started}</dt><dd>{ready ? `${formatNumber(reviewedCount, locale)} / ${formatNumber(cards.length, locale)}` : '—'}</dd></div>
              <div><dt>{copy.status.notStarted}</dt><dd>{ready ? formatNumber(cards.length - reviewedCount, locale) : '—'}</dd></div>
              <div><dt>{copy.status.coverage}</dt><dd>{copy.status.objectives(30)}</dd></div>
            </dl>
          </section>
        </div>}

        {view === 'guide' && <section class="guide-view" aria-labelledby="guide-title">
          <header class="page-header">
            <p class="eyebrow">{copy.guide.eyebrow}</p><h2 id="guide-title">{copy.guide.title}</h2><p>{copy.guide.introduction}</p>
            <a class="text-link" href={sourceById.get('exam-guide')?.url} target="_blank" rel="noreferrer">{copy.guide.openExamGuide}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>
          </header>
          <div class="domain-list">{domains.map((domain) => <section class="domain-section" key={domain.id} aria-labelledby={`${domain.id}-title`}>
            <header><div class="domain-number">D{domain.number}</div><div><p class="eyebrow">{copy.guide.weight} {domain.weight}%</p><h3 id={`${domain.id}-title`}>{localize(domain.title, locale)}</h3><p>{localize(domain.summary, locale)}</p></div></header>
            <div class="objective-grid">{domain.objectives.map((item) => <article class="objective" key={item.id}>
              <div class="objective-title"><code>{item.id}</code><div><h4>{localize(item.title, locale)}</h4></div></div>
              <p>{localize(item.summary, locale)}</p><h5>{copy.guide.mustKnow}</h5><ul>{localize(item.mustKnow, locale).map((point) => <li key={point}>{point}</li>)}</ul>
              <details><summary>{copy.guide.officialSources}</summary><SourceLinks ids={item.sourceIds} copy={copy}/><small>{copy.guide.verified(formatDate(item.verifiedAt, locale))}</small></details>
            </article>)}</div>
          </section>)}</div>
        </section>}

        {view === 'practice' && <section class="practice-view" aria-labelledby="practice-title">
          <header class="page-header compact"><p class="eyebrow">{copy.practice.eyebrow}</p><h2 id="practice-title">{copy.practice.title}</h2><p>{copy.practice.introduction}</p></header>
          <div class="filter-panel">
            <label class="search-label" for="card-search">{copy.practice.searchLabel}<input id="card-search" type="search" value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder={copy.practice.searchPlaceholder}/></label>
            <fieldset><legend>{copy.practice.stateLegend}</legend><div class="chips">{stateFilters.map((key) => <button key={key} type="button" class={stateFilter === key ? 'selected' : ''} aria-pressed={stateFilter === key} onClick={() => setStateFilter(key)}>{copy.practice.filters[key]}</button>)}</div></fieldset>
            <fieldset><legend>{copy.practice.domainLegend}</legend><div class="chips"><button type="button" class={domainFilter === 'all' ? 'selected' : ''} aria-pressed={domainFilter === 'all'} onClick={() => setDomainFilter('all')}>{copy.practice.allDomains}</button>{domains.map((domain) => <button key={domain.id} type="button" class={domainFilter === domain.id ? 'selected' : ''} aria-pressed={domainFilter === domain.id} onClick={() => setDomainFilter(domain.id)}>D{domain.number}</button>)}</div></fieldset>
          </div>
          <p class="result-count">{copy.practice.resultCount(filteredCards.length)}</p>
          <div class="card-stack">{filteredCards.map((card, index) => {
            const domain = domains.find((value) => value.id === card.domainId)!;
            const answerId = `${card.id}-answer`;
            const isOpen = Boolean(revealed[card.id]);
            const review = data.reviews[card.id];
            return <article class="practice-card" key={card.id}>
              <header><div><span class="card-domain">D{domain.number}</span><span>{copy.practice.kinds[card.kind]}</span></div><code>{String(index + 1).padStart(2, '0')} / {String(filteredCards.length).padStart(2, '0')}</code></header>
              <div class="card-prompt"><p class="eyebrow">{copy.practice.question}</p><h3>{localize(card.prompt, locale)}</h3></div>
              <button class="reveal-button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => setRevealed((value) => ({ ...value, [card.id]: !isOpen }))}>{isOpen ? copy.practice.hideAnswer : copy.practice.revealAnswer} <span aria-hidden="true">{isOpen ? '−' : '+'}</span></button>
              {isOpen && <div class="answer" id={answerId}>
                <p class="eyebrow">{copy.practice.answer}</p><p class="answer-lead">{localize(card.answer, locale)}</p><p>{localize(card.explanation, locale)}</p>
                <div class="pitfall"><strong>{copy.practice.pitfall}</strong><p>{localize(card.pitfall, locale)}</p></div>
                <div class="card-sources"><strong>{copy.practice.officialSources}</strong><SourceLinks ids={card.sourceIds} copy={copy}/><small>{copy.practice.verified(formatDate(card.verifiedAt, locale))}</small></div>
                <fieldset class="rating"><legend>{copy.practice.ratingLegend}</legend><button onClick={() => saveRating(card.id, 'again')}>{copy.practice.ratingAgain}<small>{copy.practice.ratingAgainDelay}</small></button><button onClick={() => saveRating(card.id, 'hard')}>{copy.practice.ratingHard}<small>{copy.practice.ratingHardDelay}</small></button><button onClick={() => saveRating(card.id, 'good')}>{copy.practice.ratingGood}<small>{review?.lastRating === 'good' ? copy.practice.ratingGoodExtended : copy.practice.ratingGoodDelay}</small></button></fieldset>
              </div>}
            </article>;
          })}</div>
          {!filteredCards.length && <div class="empty-state"><strong>{copy.practice.emptyTitle}</strong><p>{copy.practice.emptyDescription}</p></div>}
        </section>}

        {view === 'progress' && <section class="progress-view" aria-labelledby="progress-title">
          <header class="page-header"><p class="eyebrow">{copy.progress.eyebrow}</p><h2 id="progress-title">{copy.progress.title}</h2><p>{copy.progress.introduction}</p></header>
          <section class="progress-panel" aria-labelledby="by-domain"><h3 id="by-domain">{copy.progress.byDomain}</h3>{domains.map((domain) => {
            const list = cards.filter((card) => card.domainId === domain.id);
            const done = list.filter((card) => data.reviews[card.id]).length;
            return <div class="progress-row" key={domain.id}><span>D{domain.number} {localize(domain.title, locale)}</span><progress value={done} max={list.length}>{done}/{list.length}</progress><strong>{formatNumber(done, locale)}/{formatNumber(list.length, locale)}</strong></div>;
          })}</section>
          <section class="data-panel" aria-labelledby="data-title"><div><h3 id="data-title">{copy.progress.localData}</h3><p>{copy.progress.localDataDescription}</p>{analyticsEnabled && <p class="analytics-disclosure">{copy.progress.analyticsDisclosure}<a href={localePaths[locale].privacy}>{copy.progress.details}</a></p>}</div><div class="data-actions"><button onClick={exportData}>{copy.progress.exportJson}</button><button class="danger" onClick={resetData}>{copy.progress.reset}</button></div></section>
          <section class="sources-panel" aria-labelledby="sources-title"><div><p class="eyebrow">{copy.progress.sourcesEyebrow}</p><h3 id="sources-title">{copy.progress.sourcesTitle}</h3><p>{copy.progress.sourcesDescription}</p></div><div class="source-register">{sources.map((source) => <article key={source.id}><code>{source.id}</code><div><a href={source.url} target="_blank" rel="noreferrer"><span lang="en">{source.title}</span><span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a><p>{source.publisher} · {copy.progress.verified(formatDate(source.verifiedAt, locale))}</p></div></article>)}</div></section>
          <section class="disclaimer" aria-labelledby="disclaimer-title"><h3 id="disclaimer-title">{copy.progress.disclaimerTitle}</h3><p>{copy.progress.disclaimerBody}</p><p>{copy.progress.blueprintVerified(formatDate(VERIFIED_AT, locale))} {copy.progress.reportIssueLead} <a href="https://github.com/toshi0607/cca-study-guide/issues" target="_blank" rel="noreferrer">{copy.progress.reportIssueLink}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>.</p></section>
        </section>}
        <footer class="site-footer">
          <span>{copy.brand.footer}</span>
          <nav aria-label={copy.aria.siteInformation}>
            {analyticsEnabled && <a href={localePaths[locale].privacy}>{copy.footer.analytics}</a>}
            <a href="https://github.com/toshi0607/cca-study-guide" target="_blank" rel="noreferrer">{copy.footer.github}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>
          </nav>
        </footer>
      </main>

      <nav class="bottom-nav" aria-label={copy.aria.mainNavigation}>{viewKeys.map((key) => <button key={key} disabled={!ready} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span aria-hidden="true">{icons[key]}</span>{copy.views[key]}</button>)}</nav>
      <div class="persistent-disclaimer">{copy.progress.disclaimerTitle}</div>
    </div>
  );
}

export default App;
