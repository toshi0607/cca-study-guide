import { describe, expect, it, vi } from 'vitest';
import { checkE2ePort, isSameWorktree, parseCwd, parseListenerPids } from './check-e2e-port.mjs';

function lsofFailure({ status = 1, stderr = '', code } = {}) {
  const error = new Error('lsof failed');
  error.status = status;
  error.stderr = stderr;
  if (code) {
    error.code = code;
  }
  return error;
}

function execReturning(...outcomes) {
  const queue = [...outcomes];
  return vi.fn(() => {
    const outcome = queue.shift();
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  });
}

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

describe('lsof failure handling', () => {
  it('skips the check when lsof is not installed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const exec = execReturning(lsofFailure({ status: undefined, code: 'ENOENT' }));

    expect(() => checkE2ePort({ exec })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('lsof not found'));
    warn.mockRestore();
  });

  it('treats the no-match exit (code 1, no diagnostics) as a free port', () => {
    expect(() => checkE2ePort({ exec: execReturning(lsofFailure()) })).not.toThrow();
  });

  it('fails the check when lsof exits unexpectedly instead of assuming a free port', () => {
    const exec = execReturning(lsofFailure({ status: 1, stderr: 'lsof: illegal option character: -' }));

    expect(() => checkE2ePort({ exec })).toThrow(/could not run.*illegal option character/s);
  });

  it('fails the check on a non-1 exit code even without diagnostics', () => {
    expect(() => checkE2ePort({ exec: execReturning(lsofFailure({ status: 9 })) })).toThrow(/could not run/);
  });

  it('ignores a listener whose process exits before its cwd can be read', () => {
    const exec = execReturning('p123\n', lsofFailure());

    expect(() => checkE2ePort({ exec })).not.toThrow();
  });

  it('fails the check when the cwd lookup itself errors', () => {
    const exec = execReturning('p123\n', lsofFailure({ stderr: 'lsof: no pwd entry for UID' }));

    expect(() => checkE2ePort({ exec })).toThrow(/could not run.*no pwd entry/s);
  });

  it('reports a foreign listener with its PID and a kill command', () => {
    const exec = execReturning('p123\np123\n', 'p123\nfcwd\nn/definitely/not/this/worktree\n');

    expect(() => checkE2ePort({ exec })).toThrow(/PID 123.*kill 123/s);
  });

  it('accepts a listener started from the current worktree', () => {
    const exec = execReturning('p123\n', `p123\nfcwd\nn${process.cwd()}\n`);

    expect(() => checkE2ePort({ exec })).not.toThrow();
  });
});
