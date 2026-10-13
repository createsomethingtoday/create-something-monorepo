export type SiteTool = { name: string; description: string; inputSchema: Record<string, unknown>; annotations: { readOnlyHint: boolean }; execute: (args: unknown, context?: { signal?: AbortSignal }) => Promise<unknown> };
export type SiteDocument = Document & {
  modelContext?: { registerTool: (tool: SiteTool, options: { signal: AbortSignal }) => void | Promise<void> };
  oai?: { annotation?: { request: (target: Element, options: { initialComment: string }) => { accepted: boolean } } };
};
export function registerSearchTools(doc: SiteDocument, operations: {
  search: (args: unknown, signal?: AbortSignal) => Promise<unknown>;
  read: () => unknown;
  select: (id: string) => Promise<unknown>;
}, status: (value: 'available' | 'unavailable' | 'failed') => void) {
  const lifetime = new AbortController();
  const context = doc.modelContext;
  if (typeof context?.registerTool !== 'function' || doc.defaultView?.top !== doc.defaultView) {
    status('unavailable');
    return () => lifetime.abort();
  }
  const tools: SiteTool[] = [
    { name: 'search_agency', description: 'Search the public Agency preview catalog. Opens the visible search and updates its query, category, results and local browser history. Empty query lists the catalog. No remote search or private records.', inputSchema: { type: 'object', properties: { query: { type: 'string', maxLength: 160 }, category: { type: 'string', enum: ['all', 'overview', 'guides'] } }, required: ['query'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (args, context) => lifetime.signal.aborted ? { status: 'cancelled' } : operations.search(args, context?.signal) },
    { name: 'read_agency_search', description: 'Read the current visible Agency search state and selected public result.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: async () => lifetime.signal.aborted ? { status: 'cancelled' } : operations.read() },
    { name: 'select_agency_result', description: 'Display the public excerpt for an ID in the current completed search. Updates the visible selection and local browser history; does not leave the preview or open an external website.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input, context) => {
      if (context?.signal?.aborted || lifetime.signal.aborted) return { status: 'cancelled' };
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => key !== 'id') || typeof (input as { id?: unknown }).id !== 'string') throw new Error('Expected a current result ID.');
      return operations.select((input as { id: string }).id);
    } }
  ];
  void (async () => {
    try {
      for (const tool of tools) {
        if (lifetime.signal.aborted) return;
        await context.registerTool(tool, { signal: lifetime.signal });
      }
      if (!lifetime.signal.aborted) status('available');
    } catch {
      lifetime.abort();
      status('failed');
    }
  })();
  return () => lifetime.abort();
}
