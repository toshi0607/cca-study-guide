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

function lsof(args) {
  try {
    return execFileSync('lsof', args, { encoding: 'utf8' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    // lsof exits 1 when nothing matches; that is the normal "port free" path.
    return typeof error.stdout === 'string' ? error.stdout : '';
  }
}

export function checkE2ePort() {
  const listenerOutput = lsof(['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN', '-Fp']);
  if (listenerOutput === null) {
    console.warn('check-e2e-port: lsof not found; skipping the stale preview server check.');
    return;
  }

  const root = realpathSync(process.cwd());
  const foreign = [];
  for (const pid of parseListenerPids(listenerOutput)) {
    const cwdOutput = lsof(['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
    const cwd = cwdOutput === null ? null : parseCwd(cwdOutput);
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
