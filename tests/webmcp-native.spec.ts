import { expect, test } from './fixtures/app';
import { WEBMCP_TOOL_NAMES } from './fixtures/webmcp';

// Chromium ships WebMCP behind its experimental-platform flag (the same switch
// as chrome://flags/#enable-webmcp-testing). With it on, `document.modelContext`
// is native and `navigator.modelContextTesting` is the browser's own view of the
// registered tools — the closest thing to a built-in agent this suite has. A
// separate spec because a launch option needs its own browser worker.
test.use({ launchOptions: { args: ['--enable-experimental-web-platform-features'] } });

type NativeTesting = { listTools(): Promise<{ name: string }[]>; executeTool(name: string, inputJson: string): Promise<string> };

test('registers on Chromium\'s native API and answers through the browser\'s own tool runner', async ({ page }) => {
  // #given — the API is genuinely native here: the interface object exists
  expect(await page.evaluate(() => typeof ModelContext)).toBe('function');

  // #then — the browser itself lists the six tools
  await expect.poll(() => page.evaluate(async () => {
    const testing = (navigator as unknown as { modelContextTesting?: NativeTesting }).modelContextTesting;
    return testing ? (await testing.listTools()).map((tool) => tool.name).sort() : [];
  })).toEqual(WEBMCP_TOOL_NAMES);

  // #when — the browser's tool runner executes one (JSON string in, JSON string out)
  const stats = await page.evaluate(async () => {
    const testing = (navigator as unknown as { modelContextTesting: NativeTesting }).modelContextTesting;
    return JSON.parse(await testing.executeTool('get_domain_stats', '{}')) as { domains: { id: string }[]; note: string };
  });
  // #then
  expect(stats.domains.map((domain) => domain.id)).toEqual(['d1', 'd2', 'd3', 'd4', 'd5']);
  expect(stats.note).toContain('No score');
});
