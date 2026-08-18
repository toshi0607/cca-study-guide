import { describe, expect, it } from 'vitest';
import { isInsideRoot, parseCwd, parseListenerPids } from './check-e2e-port.mjs';

describe('stale preview server detection', () => {
  it('dedupes the IPv4 and IPv6 lines of a dual-stack listener', () => {
    expect(parseListenerPids('p123\np123\n')).toEqual([123]);
  });

  it('collects distinct listener PIDs', () => {
    expect(parseListenerPids('p123\np456\n')).toEqual([123, 456]);
  });

  it('returns no PIDs for the empty "port free" output', () => {
    expect(parseListenerPids('')).toEqual([]);
  });

  it('extracts the cwd path from lsof field output', () => {
    expect(parseCwd('p123\nfcwd\nn/Users/x/repo\n')).toBe('/Users/x/repo');
  });

  it('returns null when the cwd field is missing', () => {
    expect(parseCwd('p123\n')).toBeNull();
  });

  it('accepts the root itself and paths inside it', () => {
    expect(isInsideRoot('/Users/x/repo', '/Users/x/repo')).toBe(true);
    expect(isInsideRoot('/Users/x/repo/.claude/worktrees/w1', '/Users/x/repo')).toBe(true);
  });

  it('rejects sibling directories sharing the root as a prefix', () => {
    expect(isInsideRoot('/Users/x/repo-other', '/Users/x/repo')).toBe(false);
    expect(isInsideRoot('/Users/x/other', '/Users/x/repo')).toBe(false);
  });
});
