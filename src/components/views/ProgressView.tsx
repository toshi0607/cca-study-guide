import { useRef } from 'preact/hooks';
import { formatDate, formatNumber } from '../app/format';
import { cards } from '../../content/cards';
import { domains } from '../../content/domains';
import { sources, VERIFIED_AT } from '../../content/sources';
import { localePaths, type Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { ReviewState } from '../../lib/scheduler';
import { isWeak } from '../../lib/weakness';

export function ProgressView({ locale, copy, reviews, analyticsEnabled, onExport, onImportFile, onReset }: {
  locale: Locale;
  copy: UiCopy;
  reviews: Record<string, ReviewState>;
  analyticsEnabled: boolean;
  onExport: () => void;
  onImportFile: (event: Event) => void;
  onReset: () => void;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <section class="progress-view" aria-labelledby="progress-title">
      <header class="page-header"><p class="eyebrow">{copy.progress.eyebrow}</p><h2 id="progress-title">{copy.progress.title}</h2><p>{copy.progress.introduction}</p></header>
      <section class="progress-panel" aria-labelledby="by-domain"><h3 id="by-domain">{copy.progress.byDomain}</h3>{domains.map((domain) => {
        const list = cards.filter((card) => card.domainId === domain.id);
        const done = list.filter((card) => reviews[card.id]).length;
        const weak = list.filter((card) => isWeak(reviews[card.id])).length;
        return <div class="progress-row" key={domain.id}><span>D{domain.number} {localize(domain.title, locale)}{weak > 0 && <small class="weak-count">{copy.progress.weakCount(weak)}</small>}</span><progress value={done} max={list.length}>{done}/{list.length}</progress><strong>{formatNumber(done, locale)}/{formatNumber(list.length, locale)}</strong></div>;
      })}</section>
      <section class="data-panel" aria-labelledby="data-title"><div><h3 id="data-title">{copy.progress.localData}</h3><p>{copy.progress.localDataDescription}</p>{analyticsEnabled && <p class="analytics-disclosure">{copy.progress.analyticsDisclosure}<a href={localePaths[locale].privacy}>{copy.progress.details}</a></p>}</div><div class="data-actions"><button onClick={onExport}>{copy.progress.exportJson}</button><button onClick={() => importInputRef.current?.click()}>{copy.progress.importJson}</button><input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={onImportFile}/><button class="danger" onClick={onReset}>{copy.progress.reset}</button></div></section>
      <section class="sources-panel" aria-labelledby="sources-title"><div><p class="eyebrow">{copy.progress.sourcesEyebrow}</p><h3 id="sources-title">{copy.progress.sourcesTitle}</h3><p>{copy.progress.sourcesDescription}</p></div><div class="source-register">{sources.map((source) => <article key={source.id}><code>{source.id}</code><div><a href={source.url} target="_blank" rel="noreferrer"><span lang="en">{source.title}</span><span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a><p>{source.publisher} · {copy.progress.verified(formatDate(source.verifiedAt, locale))}</p></div></article>)}</div></section>
      <section class="disclaimer" aria-labelledby="disclaimer-title"><h3 id="disclaimer-title">{copy.progress.disclaimerTitle}</h3><p>{copy.progress.disclaimerBody}</p><p>{copy.progress.blueprintVerified(formatDate(VERIFIED_AT, locale))} {copy.progress.reportIssueLead} <a href="https://github.com/toshi0607/cca-study-guide/issues" target="_blank" rel="noreferrer">{copy.progress.reportIssueLink}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>.</p></section>
    </section>
  );
}
