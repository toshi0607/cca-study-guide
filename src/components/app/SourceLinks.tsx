import { sourceById } from '../../content/sources';
import type { UiCopy } from '../../i18n/ui';

export function SourceLinks({ ids, copy }: { ids: string[]; copy: UiCopy }) {
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
