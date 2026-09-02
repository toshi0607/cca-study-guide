// Registers the page's tools on `document.modelContext`, loading the MCP bridge
// (@mcp-b/global) first so that browsers without a native WebMCP implementation
// get one, and so that MCP hosts outside the browser (through the WebMCP browser
// extension or local relay) can reach the tools. Everything here runs inside the
// page and no request leaves the tab (see ASSETS_AND_ANALYTICS.md).
import { createWebMcpTools, type WebMcpBridge } from './webmcp-tools';

export async function registerWebMcpTools(bridge: WebMcpBridge, signal: AbortSignal): Promise<void> {
  // The bridge module initialises itself on import unless told not to, and the
  // options object is read at that moment — so it is set before the import and
  // the bridge is then initialised explicitly with this origin's settings.
  window.__webModelContextOptions = { autoInitialize: false };
  const { initializeWebModelContext, cleanupWebModelContext } = await import('@mcp-b/global');
  if (signal.aborted) return;
  try {
    initializeWebModelContext({
      // Inbound messages are accepted from this document only, and the page is
      // never framed (CSP frame-ancestors 'none'). The channel is this window's
      // own postMessage, so a script the page itself runs can observe it — the
      // same trust boundary `document.modelContext` already has.
      transport: { tabServer: { allowedOrigins: [window.location.origin] }, iframeServer: false },
      // `navigator.modelContextTesting` was a Chromium preview API that has
      // since been removed; the spec surface on `document.modelContext` is
      // the one agents are expected to use.
      installTestingShim: false,
    });
    // Aborting unregisters the tools; the bridge's own teardown (restore the
    // previous `document.modelContext`, close the transport) rides the same signal.
    signal.addEventListener('abort', cleanupWebModelContext, { once: true });
  } catch (error) {
    // A browser with a native implementation still gets the tools; only the
    // out-of-browser reach is lost.
    console.warn('[webmcp] bridge unavailable, registering on the native API only:', error);
  }

  // Registered after the bridge has taken over `document.modelContext`, so the
  // registrations are visible to the bridge as well as to the browser.
  const context = document.modelContext;
  if (!context) {
    console.warn('[webmcp] document.modelContext is unavailable; no tools registered');
    return;
  }
  for (const tool of createWebMcpTools(bridge)) {
    if (signal.aborted) return;
    await context.registerTool(tool, { signal });
  }
}
