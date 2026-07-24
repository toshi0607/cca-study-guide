import { createElement } from 'preact';
import type { ComponentChildren, JSX } from 'preact';
import { noteClass, type NoteKind } from './ui';

type NoteProps = Omit<JSX.HTMLAttributes<HTMLElement>, 'class'> & {
  // Most notes are a <p>; the ones that wrap a paragraph plus an action (retry,
  // recommendation) are a <div>.
  as?: 'p' | 'div';
  kind?: NoteKind;
  class?: string;
  children?: ComponentChildren;
};

export function Note({ as = 'p', kind, class: cls, children, ...rest }: NoteProps) {
  return createElement(as, { class: noteClass(kind, { class: cls }), ...rest }, children);
}
