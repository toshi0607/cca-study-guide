import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// Must match the webServer port in playwright.config.ts. The port is shared
// across every worktree of this repository, so a leftover `astro preview`
// started from another worktree serves *its* dist to this worktree's tests.
const PORT = 4325;

export function parseListenerPids(lsofOutput) {
  // `lsof -Fp` emits one `p<pid>` line per matching file descriptor; a
  // dual-stack listener repeats the same PID for IPv4 and IPv6.
  const pids = new Set();
  for (const line of lsofOutput.split('\n')) {
    if (line.startsWith('p')) {
      pids.add(Number(line.slice(1)));
    }
  }
  return [...pids];
}

export function parseCwd(lsofOutput) {
  // `lsof -Fn -d cwd` emits field lines: `p<pid>`, `fcwd`, `n<path>`.
  const lines = lsofOutput.split('\n');
  const cwdIndex = lines.indexOf('fcwd');
  const pathLine = cwdIndex === -1 ? undefined : lines[cwdIndex + 1];
  return pathLine?.startsWith('n') ? pathLine.slice(1) : null;
}

export function isSameWorktree(cwd, root) {
  if (cwd !== root && !cwd.startsWith(root + sep)) {
    return false;
  }
  // Linked worktrees live under <main checkout>/.claude/worktrees/<session>, so
  // a path inside the main checkout can still belong to a different checkout.
  const remainder = cwd.slice(root.length + 1);
  const worktreesDir = `.claude${sep}worktrees`;
  return remainder !== worktreesDir && !remainder.startsWith(worktreesDir + sep);
}

// `-w` silences filesystem warnings so that a stderr message reliably signals a
// real failure rather than benign noise.
const LSOF_BASE_ARGS = ['-w', '-nP'];

export function runLsof(args, exec) {
  try {
    return { status: 'ok', stdout: exec('lsof', args, { encoding: 'utf8' }) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { status: 'missing', stdout: '' };
    }
    const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
    // lsof exits 1 with no diagnostics when nothing matches the query. That is
    // the normal path for a free port, and for a PID that exited between the
    // listener lookup and its cwd lookup. Every other failure (bad options,
    // permission trouble, a broken lsof) must fail the check rather than be
    // mistaken for "no listener" — this check exists to fail closed.
    if (error.status === 1 && stderr === '') {
      return { status: 'nomatch', stdout: '' };
    }
    throw new Error(
      `The stale preview server check could not run: \`lsof ${args.join(' ')}\` exited with ` +
        `${error.status === undefined ? `signal ${error.signal ?? 'unknown'}` : `code ${error.status}`}.` +
        (stderr ? `\nlsof reported:\n${stderr}` : '') +
        `\nNext step — run that lsof command yourself to see why it fails. Until it works, verify by hand ` +
        `that no preview server from another worktree holds port ${PORT} before running the E2E suite.`,
    );
  }
}

export function checkE2ePort({ exec = execFileSync } = {}) {
  const listenerArgs = [...LSOF_BASE_ARGS, `-iTCP:${PORT}`, '-sTCP:LISTEN', '-Fp'];
  const listeners = runLsof(listenerArgs, exec);
  if (listeners.status === 'missing') {
    console.warn('check-e2e-port: lsof not found; skipping the stale preview server check.');
    return;
  }

  const root = realpathSync(process.cwd());
  const foreign = [];
  for (const pid of parseListenerPids(listeners.stdout)) {
    const cwdArgs = [...LSOF_BASE_ARGS, '-a', '-p', String(pid), '-d', 'cwd', '-Fn'];
    const cwdResult = runLsof(cwdArgs, exec);
    if (cwdResult.status !== 'ok') {
      // The process exited between the two queries, so it no longer holds the
      // port. A missing lsof cannot occur here (the first call succeeded).
      continue;
    }

    const cwd = parseCwd(cwdResult.stdout);
    let resolvedCwd = cwd;
    try {
      resolvedCwd = cwd === null ? null : realpathSync(cwd);
    } catch {
      // The reported cwd may have been deleted; judge it by the raw path.
    }
    if (resolvedCwd === null || !isSameWorktree(resolvedCwd, root)) {
      foreign.push({ pid, cwd: resolvedCwd ?? '(unknown)' });
    }
  }

  if (foreign.length) {
    throw new Error(
      `Port ${PORT} is held by a preview server that was NOT started from this worktree:\n` +
        foreign.map(({ pid, cwd }) => `  PID ${pid} (cwd: ${cwd})`).join('\n') +
        `\nReusing it would silently run the E2E suite against another worktree's build.\n` +
        `Next step — kill the foreign listener (it is a throwaway static preview server), then re-run:\n` +
        foreign.map(({ pid }) => `  kill ${pid}`).join('\n'),
    );
  }
}

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedUrl) {
  checkE2ePort();
}
