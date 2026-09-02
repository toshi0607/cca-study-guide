import { useEffect, useRef } from 'preact/hooks';
import type { Locale } from '../../i18n/locales';
import type { DeepLink } from '../../lib/deep-link';
import type { StudyData } from '../../lib/storage';

// How long a busy tab may postpone registration before it runs anyway, so an
// agent that arrives soon after load does not find the tools missing.
const IDLE_TIMEOUT_MS = 2000;

// Safari has no requestIdleCallback; a short timeout keeps the same intent there
// (let first paint and the learner's first interaction go first).
function scheduleWhenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(task, 1000);
  return () => window.clearTimeout(handle);
}

// Registers the app's WebMCP tools once the island is live, and only after the
// browser is idle: the registration module and the MCP bridge it loads are
// dynamic imports, so neither reaches the initial landing bundle.
//
// The tools read through `latest` rather than closing over props, so a state
// change never re-registers them (there is no unregister call in the API — a
// tool is removed only by aborting the signal it was registered with, which is
// why one AbortController spans the whole mount).
export function useWebMcp({ ready, locale, data, now, dataUnreadable, practiceSessionActive, applyDeepLink }: {
  ready: boolean;
  locale: Locale;
  data: StudyData;
  now: Date | null;
  dataUnreadable: boolean;
  practiceSessionActive: boolean;
  applyDeepLink: (link: DeepLink) => void;
}): void {
  const latest = useRef({ data, now, dataUnreadable, practiceSessionActive, applyDeepLink });
  latest.current = { data, now, dataUnreadable, practiceSessionActive, applyDeepLink };

  useEffect(() => {
    if (!ready) return undefined;
    const controller = new AbortController();
    const start = () => {
      if (controller.signal.aborted) return;
      void import('../../lib/webmcp/webmcp-register')
        .then(({ registerWebMcpTools }) => registerWebMcpTools({
          locale,
          getData: () => latest.current.data,
          getNow: () => latest.current.now ?? new Date(),
          isDataUnreadable: () => latest.current.dataUnreadable,
          isPracticeSessionActive: () => latest.current.practiceSessionActive,
          applyDeepLink: (link) => latest.current.applyDeepLink(link),
        }, controller.signal))
        .catch((error: unknown) => {
          // A browser without the API, or a bridge that failed to load, leaves
          // the app exactly as it was — the tools are an addition, never a dependency.
          console.warn('[webmcp] tools unavailable:', error);
        });
    };
    const cancelIdle = scheduleWhenIdle(start);
    return () => {
      cancelIdle();
      controller.abort();
    };
  }, [ready, locale]);
}
