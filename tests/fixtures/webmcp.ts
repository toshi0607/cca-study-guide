import type { Page } from '@playwright/test';

// Sorted, because every reader below sorts what the page reports.
export const WEBMCP_TOOL_NAMES = ['get_content_item', 'get_domain_stats', 'get_due_reviews', 'get_study_summary', 'open_view', 'search_content'];

// Registration is scheduled for browser idle time, so callers poll this.
export async function registeredToolNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const context = document.modelContext;
    if (!context) return [];
    const tools = await context.getTools();
    return tools.map((tool) => tool.name).sort();
  });
}
