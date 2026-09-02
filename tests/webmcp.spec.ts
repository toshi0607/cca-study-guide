import type { Page } from '@playwright/test';
import { cardIndex } from '../src/content/card-index';
import { studyGuideSections } from '../src/content/study-guide';
import { createEmptyStudyData } from '../src/lib/storage-schema';
import { expect, test } from './fixtures/app';
import { seedStorage, STORAGE_KEY } from './fixtures/storage';
import { registeredToolNames, WEBMCP_TOOL_NAMES as TOOL_NAMES } from './fixtures/webmcp';

const section = studyGuideSections[0];

// The package's ModelContext type does not declare executeTool, so the tests
// name the surface they use. The spec's form takes an input object; the bridge's
// takes and returns JSON strings (Chrome's modelContextTesting convention).
type SpecModelContext = { getTools(): Promise<{ name: string }[]>; executeTool(tool: { name: string }, input: object): Promise<unknown> };
type BridgeModelContext = { getTools(): Promise<{ name: string }[]>; executeTool(tool: { name: string }, inputJson: string): Promise<string | null> };

// Records every request — and every WebSocket, which `request` does not report —
// that leaves the page's own origin from now on.
function trackExternalRequests(page: Page): string[] {
  const external: string[] = [];
  const origin = new URL(page.url()).origin;
  page.on('request', (request) => {
    if (!request.url().startsWith(origin)) external.push(request.url());
  });
  page.on('websocket', (socket) => external.push(socket.url()));
  return external;
}

// Runs one tool through the bridge's Chrome-style executeTool (JSON in, JSON out).
async function executeThroughBridge<T>(page: Page, name: string, input: Record<string, unknown>): Promise<T | null> {
  return page.evaluate(async ([toolName, toolInput]) => {
    const context = document.modelContext as unknown as BridgeModelContext;
    const tool = (await context.getTools()).find((candidate) => candidate.name === toolName)!;
    const raw = await context.executeTool(tool, JSON.stringify(toolInput));
    return raw === null ? null : JSON.parse(raw) as T;
  }, [name, input] as const);
}

test('registers its tools on a native document.modelContext without any request leaving the origin', async ({ page }) => {
  // #given — a browser whose native API is a non-configurable stub: the bridge
  // cannot replace it, so the registrations land on the stub exactly as they
  // would on a real implementation
  await page.addInitScript(() => {
    type StubTool = { name: string; description: string; inputSchema?: object; annotations?: object; execute: (input: object, options: { signal: AbortSignal }) => Promise<unknown> };
    const tools = new Map<string, StubTool>();
    Object.defineProperty(document, 'modelContext', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: {
        registerTool(tool: StubTool, options?: { signal?: AbortSignal }) {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener('abort', () => tools.delete(tool.name));
          return Promise.resolve();
        },
        getTools() {
          return Promise.resolve([...tools.values()].map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })));
        },
        executeTool(tool: { name: string }, input: object = {}) {
          return tools.get(tool.name)!.execute(input, { signal: new AbortController().signal });
        },
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
      },
    });
  });
  const external = trackExternalRequests(page);
  await page.reload();

  // #then — all six tools are registered
  await expect.poll(() => registeredToolNames(page)).toEqual(TOOL_NAMES);

  // #when — a read tool is executed in-page
  const stats = await page.evaluate(async () => {
    const context = document.modelContext as unknown as SpecModelContext;
    const tool = (await context.getTools()).find((candidate) => candidate.name === 'get_domain_stats')!;
    return context.executeTool(tool, {}) as Promise<{ note: string; domains: { id: string }[] }>;
  });
  // #then — it answers from the app's own content, counts only
  expect(stats.domains.map((domain) => domain.id)).toEqual(['d1', 'd2', 'd3', 'd4', 'd5']);
  expect(stats.note).toContain('No score');

  // #when — the navigation tool opens a Study Guide section
  const opened = await page.evaluate(async (sectionId) => {
    const context = document.modelContext as unknown as SpecModelContext;
    const tool = (await context.getTools()).find((candidate) => candidate.name === 'open_view')!;
    return context.executeTool(tool, { view: 'guide', id: sectionId }) as Promise<{ ok: boolean; deepLink: string }>;
  }, section.id);
  // #then — the app navigated exactly as the equivalent deep link would: the
  // section is open and focused. (The address bar is untouched on purpose — a
  // session that started without a hash never gains one, see useDeepLinkRouting.)
  expect(opened).toEqual({ ok: true, view: 'guide', deepLink: `#/guide/${section.id}` });
  const details = page.locator(`#guide-section-${section.id}`);
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('summary')).toBeFocused();
  expect(await page.evaluate(() => window.location.hash)).toBe('');

  // #then — nothing left the origin while the tools were loaded, registered, and run
  expect(external).toEqual([]);
});

test('serves the tools through the bundled bridge when the browser has no native API, still without leaving the origin', async ({ page }) => {
  // #given — Playwright's Chromium ships no WebMCP, so document.modelContext is
  // the bridge's own object, installed by the app after idle; the page is
  // reloaded with the network watched so the bridge's own start-up is covered
  const external = trackExternalRequests(page);
  await page.reload();
  await expect.poll(() => registeredToolNames(page)).toEqual(TOOL_NAMES);
  const isBridge = await page.evaluate(() => 'syncNativeTools' in (document.modelContext ?? {}));
  expect(isBridge).toBe(true);

  // #when — a search runs through the bridge
  const result = await executeThroughBridge<{ matched: { cards: number }; hits: { kind: string; deepLink: string }[] }>(page, 'search_content', { query: 'mcp', kind: 'card', limit: 2 });
  // #then
  expect(result).not.toBeNull();
  expect(result!.matched.cards).toBeGreaterThan(0);
  expect(result!.hits).toHaveLength(2);
  expect(result!.hits[0]).toMatchObject({ kind: 'card' });
  expect(result!.hits[0]!.deepLink).toMatch(/^#\/practice\//);
  expect(external).toEqual([]);
});

// The WebMCP browser extension's content script speaks MCP to the page over
// window.postMessage — the envelope @mcp-b/transports' TabClientTransport
// produces. Speaking it from the page itself exercises the same wire path an
// MCP host such as Claude arrives through, with the page origin the extension
// would carry (which is what `allowedOrigins: [location.origin]` must admit).
test('answers an MCP client over the postMessage wire the WebMCP extension uses', async ({ page }) => {
  await expect.poll(() => registeredToolNames(page)).toEqual(TOOL_NAMES);

  const result = await page.evaluate(async () => {
    type Rpc = { jsonrpc: '2.0'; id?: number; method?: string; params?: unknown; result?: unknown; error?: unknown };
    const channel = 'mcp-default';
    const waiters = new Map<number, (message: Rpc) => void>();
    let ready = false;
    window.addEventListener('message', (event) => {
      const data = event.data as { channel?: string; type?: string; direction?: string; payload?: unknown } | null;
      if (!data || data.channel !== channel || data.type !== 'mcp' || data.direction !== 'server-to-client') return;
      if (data.payload === 'mcp-server-ready') { ready = true; return; }
      const message = data.payload as Rpc;
      if (typeof message === 'object' && message && typeof message.id === 'number') waiters.get(message.id)?.(message);
    });
    const send = (payload: unknown) => window.postMessage({ channel, type: 'mcp', direction: 'client-to-server', payload }, window.location.origin);
    const call = (id: number, method: string, params: unknown) => new Promise<Rpc>((resolve) => { waiters.set(id, resolve); send({ jsonrpc: '2.0', id, method, params }); });

    // The server announces readiness once its transport starts; ask until it answers.
    for (let attempt = 0; attempt < 50 && !ready; attempt += 1) {
      send('mcp-check-ready');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) return { ready };

    const initialized = await call(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e-client', version: '0.0.0' } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const listed = await call(2, 'tools/list', {});
    const called = await call(3, 'tools/call', { name: 'get_due_reviews', arguments: { limit: 2 } });
    const tools = (listed.result as { tools: { name: string }[] }).tools.map((tool) => tool.name).sort();
    const content = (called.result as { isError?: boolean; content: { type: string; text: string }[] });
    return {
      ready,
      serverName: (initialized.result as { serverInfo?: { name: string } }).serverInfo?.name,
      tools,
      isError: content.isError ?? false,
      payload: JSON.parse(content.content[0]!.text) as { total: number; cards: unknown[] },
    };
  });

  expect(result.ready).toBe(true);
  expect(result.serverName).toContain('webmcp');
  expect(result.tools).toEqual(TOOL_NAMES);
  expect(result.isError).toBe(false);
  expect(result.payload!.cards).toHaveLength(2);
  expect(result.payload!.total).toBeGreaterThanOrEqual(2);
});

test('opening every reachable view through open_view leaves the stored study record byte-identical', async ({ page }) => {
  // #given — a study record with one review, so a rewrite would be observable
  const card = cardIndex[0]!;
  await seedStorage(page, STORAGE_KEY, {
    ...createEmptyStudyData(),
    reviews: { [card.id]: { cardId: card.id, cardRevisionSeen: card.revision, dueAt: '2099-01-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' } },
  });
  await page.reload();
  await expect.poll(() => registeredToolNames(page)).toEqual(TOOL_NAMES);
  const before = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(before).not.toBeNull();

  // #when — every view a tool can open is opened, and each is given time to
  // mount: a mount effect is exactly what could write, so the next call waits
  // until the new view's own heading has replaced the previous one
  const heading = () => page.locator('main h2').first().innerText();
  for (const input of [
    { view: 'guide', id: section.id },
    { view: 'hands-on' },
    { view: 'official-scenarios' },
    { view: 'practice', id: card.id },
    { view: 'quiz' },
    { view: 'progress' },
    { view: 'today' },
  ]) {
    const previous = await heading();
    const result = await executeThroughBridge<{ ok: boolean }>(page, 'open_view', input);
    expect(result, JSON.stringify(input)).toMatchObject({ ok: true });
    await expect.poll(heading, { message: JSON.stringify(input) }).not.toBe(previous);
  }
  // #then — the mock exam is refused (mounting it can finalise an expired
  // session), and nothing above touched the document
  await expect(executeThroughBridge<{ ok: boolean }>(page, 'open_view', { view: 'mock-exam' })).resolves.toMatchObject({ ok: false });
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
});
