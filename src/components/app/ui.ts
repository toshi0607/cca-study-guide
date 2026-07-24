// Class builders for the shared design-system components (src/styles/system.css).
// Keeping the class logic in pure functions lets the node-env vitest suite verify
// the exact class output without a DOM, and makes a wrong variant a type error at
// the call site. The <Button>/<Panel>/<Note> wrappers in this folder use these.
//
// An optional `class` extra is appended last so a call site can keep the
// "shared class + area hook" pattern (e.g. buttonClass('text', { class: 'mock-exam-link' })).

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text';

// `.btn--text` is self-contained (no `.btn` base); the other variants are
// modifiers on `.btn`. `wide` is only meaningful on the `.btn` base.
export function buttonClass(variant: ButtonVariant = 'primary', opts: { wide?: boolean; class?: string } = {}): string {
  const parts = variant === 'text' ? ['btn--text'] : ['btn'];
  if (variant === 'secondary') parts.push('btn--secondary');
  if (variant === 'danger') parts.push('btn--danger');
  if (opts.wide && variant !== 'text') parts.push('btn--wide');
  if (opts.class) parts.push(opts.class);
  return parts.join(' ');
}

// `.panel--hero` is its own base (not composed with `.panel`); `is-compact` only
// applies to hero. The non-hero panel composes `.panel` with sm/flat/accent.
export function panelClass(opts: {
  hero?: boolean;
  compact?: boolean;
  size?: 'sm';
  flat?: boolean;
  accent?: boolean;
  class?: string;
} = {}): string {
  const parts: string[] = [];
  if (opts.hero) {
    parts.push('panel--hero');
    if (opts.compact) parts.push('is-compact');
  } else {
    parts.push('panel');
    if (opts.size === 'sm') parts.push('panel--sm');
    if (opts.flat) parts.push('panel--flat');
    if (opts.accent) parts.push('panel--accent');
  }
  if (opts.class) parts.push(opts.class);
  return parts.join(' ');
}

export type NoteKind = 'info' | 'warn' | 'success' | 'danger';

// A neutral note (no kind) is just `.note`.
export function noteClass(kind?: NoteKind, opts: { class?: string } = {}): string {
  const parts = ['note'];
  if (kind) parts.push(`note--${kind}`);
  if (opts.class) parts.push(opts.class);
  return parts.join(' ');
}
