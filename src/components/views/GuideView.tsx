import { formatDate } from '../app/format';
import { SourceLinks } from '../app/SourceLinks';
import { domains } from '../../content/domains';
import { sourceById } from '../../content/sources';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';

export function GuideView({ locale, copy }: { locale: Locale; copy: UiCopy }) {
  return (
    <section class="guide-view" aria-labelledby="guide-title">
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
    </section>
  );
}
