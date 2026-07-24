import { describe, expect, it } from 'vitest';
import { buttonClass, noteClass, panelClass } from './ui';

describe('buttonClass', () => {
  it('primary is the .btn base', () => expect(buttonClass()).toBe('btn'));
  it('secondary and danger are modifiers on .btn', () => {
    expect(buttonClass('secondary')).toBe('btn btn--secondary');
    expect(buttonClass('danger')).toBe('btn btn--danger');
  });
  it('text is self-contained (no .btn base)', () => expect(buttonClass('text')).toBe('btn--text'));
  it('wide applies to the .btn base only, not to text', () => {
    expect(buttonClass('primary', { wide: true })).toBe('btn btn--wide');
    expect(buttonClass('text', { wide: true })).toBe('btn--text');
  });
  it('appends an area-hook class last', () =>
    expect(buttonClass('text', { class: 'mock-exam-link' })).toBe('btn--text mock-exam-link'));
});

describe('panelClass', () => {
  it('defaults to .panel', () => expect(panelClass()).toBe('panel'));
  it('composes sm/flat/accent on .panel', () => {
    expect(panelClass({ size: 'sm' })).toBe('panel panel--sm');
    expect(panelClass({ accent: true })).toBe('panel panel--accent');
    expect(panelClass({ size: 'sm', accent: true })).toBe('panel panel--sm panel--accent');
  });
  it('hero is its own base and takes is-compact', () => {
    expect(panelClass({ hero: true })).toBe('panel--hero');
    expect(panelClass({ hero: true, compact: true })).toBe('panel--hero is-compact');
  });
  it('ignores compact when not a hero', () => expect(panelClass({ compact: true })).toBe('panel'));
});

describe('noteClass', () => {
  it('neutral note has no modifier', () => expect(noteClass()).toBe('note'));
  it('adds a kind modifier', () => {
    expect(noteClass('warn')).toBe('note note--warn');
    expect(noteClass('success')).toBe('note note--success');
  });
  it('appends an area-hook class', () =>
    expect(noteClass('info', { class: 'quiz-hint' })).toBe('note note--info quiz-hint'));
});
