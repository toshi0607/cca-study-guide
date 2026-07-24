import { describe, expect, it } from 'vitest';
import { scanCss } from './check-design-tokens.mjs';

describe('check-design-tokens scanCss', () => {
  it('flags a raw hex colour', () => {
    const f = scanCss('a.css', '.x { color: #ff0000; }');
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe('raw-hex');
  });

  it('flags a raw font-size and the size slot of a font shorthand', () => {
    const f = scanCss('a.css', '.x { font-size: 1.4rem; }\n.y { font: 700 2rem/1.2 var(--display); }');
    expect(f.map((x) => x.rule)).toEqual(['raw-font-size', 'raw-font-size']);
  });

  it('flags !important', () => {
    const f = scanCss('a.css', '.x { color: red !important; }');
    expect(f[0].rule).toBe('important');
  });

  it('allows a token-based value', () => {
    expect(scanCss('a.css', '.x { color: var(--ink); font-size: var(--fs-base); }')).toEqual([]);
  });

  it('allows a hex operand inside color-mix (var() before it does not truncate the match)', () => {
    const f = scanCss('a.css', '.x { border-color: color-mix(in srgb, var(--danger) 55%, #fff); }');
    expect(f).toEqual([]);
  });

  it('does not treat a px line-height in a font shorthand as a font size', () => {
    expect(scanCss('a.css', '.x { font: var(--fs-micro)/22px var(--mono); }')).toEqual([]);
  });

  it('respects an end-of-line ds-allow marker with a reason', () => {
    expect(scanCss('a.css', '.x { font-size: 4rem; } /* ds-allow: display figure */')).toEqual([]);
    expect(scanCss('a.css', '.x { color: #fff !important; } /* ds-allow: reason */')).toEqual([]);
  });

  it('does not honour a ds-allow at the start of a line (must be end-of-line)', () => {
    const f = scanCss('a.css', '/* ds-allow: sneaky */ .x { color: #fff; }');
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe('raw-hex');
  });

  it('does not honour a reasonless ds-allow marker', () => {
    const f = scanCss('a.css', '.x { color: #fff; } /* ds-allow: */');
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe('raw-hex');
  });

  it('catches a font-size split across lines (declaration-based, not line-based)', () => {
    const f = scanCss('a.css', '.title {\n  font-size:\n    2rem;\n}');
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe('raw-font-size');
  });

  it('catches a font shorthand split across lines', () => {
    const f = scanCss('a.css', '.title {\n  font:\n    700 2rem/1.2 var(--display);\n}');
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe('raw-font-size');
  });

  it('does not flag values that live inside a comment', () => {
    expect(scanCss('a.css', '/* example: color #ff0000 and 2rem */\n.x { color: var(--ink); }')).toEqual([]);
  });

  it('threads a multi-line block comment so its body is not scanned', () => {
    const css = '/* header\n   mentions #abcdef and 3rem\n   still a comment */\n.x { gap: var(--space-2); }';
    expect(scanCss('a.css', css)).toEqual([]);
  });

  it('reports the 1-based line number', () => {
    const f = scanCss('a.css', '.a { color: var(--ink); }\n.b { color: #123456; }');
    expect(f[0].line).toBe(2);
  });
});
