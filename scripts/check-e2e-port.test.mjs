import { describe, expect, it } from 'vitest';
import { isSameWorktree, parseCwd, parseListenerPids } from './check-e2e-port.mjs';

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
    expect(isSameWorktree('/Users/x/repo', '/Users/x/repo')).toBe(true);
    expect(isSameWorktree('/Users/x/repo/dist', '/Users/x/repo')).toBe(true);
  });

  it('rejects sibling directories sharing the root as a prefix', () => {
    expect(isSameWorktree('/Users/x/repo-other', '/Users/x/repo')).toBe(false);
    expect(isSameWorktree('/Users/x/other', '/Users/x/repo')).toBe(false);
  });

  it('rejects a linked-worktree listener when running from the main checkout', () => {
    expect(isSameWorktree('/Users/x/repo/.claude/worktrees/w1', '/Users/x/repo')).toBe(false);
    expect(isSameWorktree('/Users/x/repo/.claude/worktrees/w1/dist', '/Users/x/repo')).toBe(false);
    expect(isSameWorktree('/Users/x/repo/.claude/worktrees', '/Users/x/repo')).toBe(false);
  });

  it('accepts a listener started from the current linked worktree', () => {
    const worktree = '/Users/x/repo/.claude/worktrees/w1';
    expect(isSameWorktree(worktree, worktree)).toBe(true);
    expect(isSameWorktree(`${worktree}/dist`, worktree)).toBe(true);
  });

  it('rejects a listener from a different linked worktree', () => {
    expect(isSameWorktree('/Users/x/repo/.claude/worktrees/w2', '/Users/x/repo/.claude/worktrees/w1')).toBe(false);
  });
});
