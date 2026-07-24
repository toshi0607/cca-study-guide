import { createElement } from 'preact';
import type { ComponentChildren, JSX } from 'preact';
import { panelClass } from './ui';

type PanelProps = Omit<JSX.HTMLAttributes<HTMLElement>, 'class'> & {
  // Panels appear as section/header/article/div; createElement takes the tag as
  // a string so no polymorphic-JSX gymnastics (or `any`) are needed.
  as?: keyof JSX.IntrinsicElements;
  hero?: boolean;
  compact?: boolean;
  size?: 'sm';
  flat?: boolean;
  accent?: boolean;
  class?: string;
  children?: ComponentChildren;
};

export function Panel({ as = 'section', hero, compact, size, flat, accent, class: cls, children, ...rest }: PanelProps) {
  return createElement(
    as,
    { class: panelClass({ hero, compact, size, flat, accent, class: cls }), ...rest },
    children,
  );
}
