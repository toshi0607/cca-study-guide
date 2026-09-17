import { expect, test } from './fixtures/app';
import { WEBMCP_TOOL_NAMES } from './fixtures/webmcp';

// Chromium ships WebMCP behind its experimental-platform flag (the same switch
// as chrome://flags/#enable-webmcp-testing). With it on, `document.modelContext`
// is the browser's own native implementation — not the bundled bridge and not a
// stub — so this is the closest thing to a built-in agent this suite has. A
// separate spec because a launch option needs its own browser worker.
//
// `navigator.modelContextTesting`, which this spec used to read, was removed in
// Chromium 153 (crrev 6cc2423914a1, "WebMCP: Remove the ModelContextTesting
// API"); no flag brings it back. The registry it exposed is the same one
// `document.modelContext.getTools()` reads, which is what upstream migrated its
// own tests to, and what `webmcp-register.ts` already targets.
test.use({ launchOptions: { args: ['--enable-experimental-web-platform-features'] } });

type NativeModelContext = {
  getTools(): Promise<{ name: string }[]>;
  executeTool(tool: { name: string }, inputJson: string): Promise<string>;
};

test('registers on Chromium\'s native API and answers through the browser\'s own tool runner', async ({ page }) => {
  // #given — the API is genuinely native here: the interface object exists
  expect(await page.evaluate(() => typeof ModelContext)).toBe('function');

  // #then — the browser itself lists the six tools
  await expect.poll(() => page.evaluate(async () => {
    const context = document.modelContext as unknown as NativeModelContext | undefined;
    return context ? (await context.getTools()).map((tool) => tool.name).sort() : [];
  })).toEqual(WEBMCP_TOOL_NAMES);

  // #when — the browser's tool runner executes one (JSON string in, JSON string out)
  const stats = await page.evaluate(async () => {
    const context = document.modelContext as unknown as NativeModelContext;
    const tool = (await context.getTools()).find((candidate) => candidate.name === 'get_domain_stats')!;
    return JSON.parse(await context.executeTool(tool, '{}')) as { domains: { id: string }[]; note: string };
  });
  // #then
  expect(stats.domains.map((domain) => domain.id)).toEqual(['d1', 'd2', 'd3', 'd4', 'd5']);
  expect(stats.note).toContain('No score');
});
