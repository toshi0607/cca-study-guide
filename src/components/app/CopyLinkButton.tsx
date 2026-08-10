import { useState } from 'preact/hooks';
import type { UiCopy } from '../../i18n/ui';
import type { DeepLink } from '../../lib/deep-link';
import { buildDeepLinkUrl } from '../../lib/deep-link';
import { Button } from './Button';

// Copies a deep link to this exact place. Clipboard only — nothing is sent
// anywhere, and the URL carries a content id, never any study progress.
//
// `label` names what the link points at and is appended to the accessible name
// only (sr-only). Dozens of these render at once — one per practice card, one per
// hands-on step — and without it a screen reader's button list is a wall of
// identical "Copy link" entries with nothing to tell them apart. Sighted users
// read the context from the surrounding card, so it stays visually hidden.
//
// The outcome is reported in an adjacent live region rather than by mutating the
// button's own label: a focused button's name change is announced inconsistently
// across assistive tech, and a second copy of the same link would otherwise give
// no feedback at all.
type CopyState = 'idle' | 'copied' | 'failed';

export function CopyLinkButton({ link, copy, label, class: className }: {
  link: DeepLink;
  copy: UiCopy;
  label: string;
  class?: string;
}) {
  const [state, setState] = useState<CopyState>('idle');

  const onClick = () => {
    if (!navigator.clipboard) {
      setState('failed');
      return;
    }
    const url = buildDeepLinkUrl(window.location, link);
    void navigator.clipboard.writeText(url).then(() => setState('copied'), () => setState('failed'));
  };

  return (
    <span class="copy-link-wrap">
      <Button variant="text" class={className} onClick={onClick}>
        {copy.deepLink.copy}<span class="sr-only"> — {label}</span>
      </Button>
      <span class="sr-only" role="status">
        {state === 'copied' ? copy.deepLink.copied : state === 'failed' ? copy.deepLink.copyFailed : ''}
      </span>
    </span>
  );
}
