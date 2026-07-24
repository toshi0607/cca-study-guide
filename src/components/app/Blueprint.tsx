import { cardIndex, domainIndex } from '../../content/card-index';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { ReviewState } from '../../lib/scheduler';

export function Blueprint({ reviews, ready, locale, copy }: { reviews: Record<string, ReviewState>; ready: boolean; locale: Locale; copy: UiCopy }) {
  const progress = (domainId: string) => {
    const domainCards = cardIndex.filter((card) => card.domainId === domainId);
    return Math.round((domainCards.filter((card) => reviews[card.id]).length / domainCards.length) * 100);
  };

  return (
    <section class="blueprint" aria-labelledby="coverage-title">
      <div class="section-heading">
        <div><p class="eyebrow">{copy.blueprint.eyebrow}</p><h2 id="coverage-title" class="section-title">{copy.blueprint.title}</h2></div>
        <p>{copy.blueprint.progressNote}</p>
      </div>
      <div class="blueprint-map">
        <svg class="blueprint-lines" viewBox="0 0 1000 300" aria-hidden="true"><path d="M125 88 H380 L500 210 H680 L810 85"/><path d="M380 88 H810"/><circle cx="380" cy="88" r="5"/><circle cx="500" cy="210" r="5"/></svg>
        {domainIndex.map((domain, index) => {
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
