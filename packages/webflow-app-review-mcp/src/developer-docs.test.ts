import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { AirtableClient } from './airtable.js';
import { searchDeveloperDocs, type DocsIndexBinding } from './developer-docs.js';
import { registerTools } from './tools.js';

const PASSAGE = {
  url: 'https://developers.webflow.com/apps/docs/marketplace-guidelines#token-security',
  headingPath: 'Marketplace Guidelines > Guidelines > Authentication / Permissions > Token security',
  text: '1. Store OAuth tokens in secure, server-side storage.',
  version: 'current',
  checkedAt: '2026-11-27T12:00:00.000Z',
  score: 0.98,
  matched: ['keyword', 'semantic'],
};

function indexReturning(result: { passages: unknown[]; degraded: string[] } | Error): DocsIndexBinding & { search: ReturnType<typeof vi.fn> } {
  return { search: vi.fn(async () => (result instanceof Error ? Promise.reject(result) : result)) } as never;
}

/** The docs site answers as an event stream with one JSON-RPC message. */
function docsSite(answer: string, init: { status?: number; isError?: boolean } = {}) {
  const fetchFn = vi.fn(async () => {
    const message = { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: answer }], isError: init.isError } };
    return new Response(`event: message\ndata: ${JSON.stringify(message)}\n\n`, { status: init.status ?? 200 });
  });
  return fetchFn as unknown as typeof fetch & typeof fetchFn;
}

const ANSWER = 'Tokens stay on the server [^1].\n\n[^1]: https://developers.webflow.com/data/v2.0.0-beta/apps/docs/marketplace-guidelines';

describe('searchDeveloperDocs', () => {
  it('returns exact passages from the index by default and does not call the docs site', async () => {
    const index = indexReturning({ passages: [PASSAGE], degraded: [] });
    const fetchFn = docsSite(ANSWER);
    const result = await searchDeveloperDocs({ index, fetchFn }, { query: 'Where must tokens be stored?', topK: 3, includeBeta: true });
    expect(index.search).toHaveBeenCalledWith({ query: 'Where must tokens be stored?', topK: 3, includeBeta: true });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toEqual({
      mode: 'passages',
      passages: [
        {
          url: PASSAGE.url,
          section: PASSAGE.headingPath,
          text: PASSAGE.text,
          version: 'current',
          checked_at: PASSAGE.checkedAt,
          score: 0.98,
        },
      ],
    });
  });

  it('says so when no passage matched or a search stage did not run', async () => {
    const empty = await searchDeveloperDocs({ index: indexReturning({ passages: [], degraded: [] }) }, { query: 'zzz' });
    expect(empty).toMatchObject({ mode: 'passages', passages: [], note: expect.stringContaining('No passage matched') });
    const degraded = await searchDeveloperDocs({ index: indexReturning({ passages: [PASSAGE], degraded: ['rerank'] }) }, { query: 'tokens' });
    expect(degraded).toMatchObject({ note: expect.stringContaining('Search ran without: rerank') });
  });

  it('asks the docs site in answer mode and marks the text as generated', async () => {
    const index = indexReturning({ passages: [PASSAGE], degraded: [] });
    const fetchFn = docsSite(ANSWER);
    const result = await searchDeveloperDocs({ index, fetchFn }, { query: 'Where must tokens be stored?', mode: 'answer' });
    expect(index.search).not.toHaveBeenCalled();
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://developers.webflow.com/_mcp/server');
    expect(JSON.parse(String(init.body))).toMatchObject({
      method: 'tools/call',
      params: { name: 'searchDocs', arguments: { query: 'Where must tokens be stored?', topK: 5 } },
    });
    expect(result).toMatchObject({
      mode: 'answer',
      generated: true,
      answer: ANSWER,
      sources: ['https://developers.webflow.com/data/v2.0.0-beta/apps/docs/marketplace-guidelines'],
      note: expect.stringContaining('v2 beta or v1 pages'),
    });
    expect(result).not.toHaveProperty('fallback_reason');
  });

  it('falls back to the docs site answer, with the reason, when the index is not bound or fails', async () => {
    const unbound = await searchDeveloperDocs({ fetchFn: docsSite(ANSWER) }, { query: 'tokens' });
    expect(unbound).toMatchObject({ mode: 'answer', fallback_reason: 'The docs index is not connected to this MCP runtime.' });

    const failing = await searchDeveloperDocs({ index: indexReturning(new Error('D1 is down')), fetchFn: docsSite(ANSWER) }, { query: 'tokens' });
    expect(failing).toMatchObject({ mode: 'answer', fallback_reason: 'The docs index failed: D1 is down' });
  });

  it('does not replace an explicit passages request with a generated answer', async () => {
    const fetchFn = docsSite(ANSWER);
    await expect(searchDeveloperDocs({ fetchFn }, { query: 'tokens', mode: 'passages' })).rejects.toMatchObject({
      code: 'DEVELOPER_DOCS_INDEX_UNAVAILABLE',
      status: 503,
    });
    await expect(
      searchDeveloperDocs({ index: indexReturning(new Error('D1 is down')), fetchFn }, { query: 'tokens', mode: 'passages' }),
    ).rejects.toMatchObject({ code: 'DEVELOPER_DOCS_INDEX_UNAVAILABLE', status: 502 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reports a docs site failure as an error, not as an empty answer', async () => {
    for (const fetchFn of [
      docsSite(ANSWER, { status: 500 }),
      docsSite('tool failed', { isError: true }),
      docsSite(''),
      vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch,
      vi.fn(async () => Promise.reject(new Error('network'))) as unknown as typeof fetch,
    ]) {
      await expect(searchDeveloperDocs({ fetchFn }, { query: 'tokens', mode: 'answer' })).rejects.toMatchObject({
        code: 'DEVELOPER_DOCS_SEARCH_UNAVAILABLE',
      });
    }
  });

  it('keeps only docs site URLs as sources', async () => {
    const answer = 'See [^1] and [^2].\n\n[^1]: https://developers.webflow.com/data/reference/scopes\n[^2]: https://example.com/phish';
    const result = await searchDeveloperDocs({ fetchFn: docsSite(answer) }, { query: 'scopes', mode: 'answer' });
    expect(result).toMatchObject({ sources: ['https://developers.webflow.com/data/reference/scopes'] });
    expect((result as { note: string }).note).not.toContain('v2 beta');
  });
});

describe('app_review_search_developer_docs', () => {
  type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>;

  function harness(docs: Parameters<typeof registerTools>[6]) {
    const handlers = new Map<string, ToolHandler>();
    const server = {
      tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
        handlers.set(name, handler);
      },
    } as unknown as McpServer;
    registerTools(server, () => ({}) as AirtableClient, undefined, undefined, undefined, undefined, docs);
    const call = async (args: Record<string, unknown>) => JSON.parse((await handlers.get('app_review_search_developer_docs')!(args)).content[0].text);
    return { call };
  }

  it('returns passages through the tool with the snake_case parameters mapped', async () => {
    const index = indexReturning({ passages: [PASSAGE], degraded: [] });
    const { call } = harness(() => ({ index }));
    const payload = await call({ query: 'token storage', top_k: 2, include_beta: true });
    expect(index.search).toHaveBeenCalledWith({ query: 'token storage', topK: 2, includeBeta: true });
    expect(payload).toMatchObject({ ok: true, data: { mode: 'passages', passages: [{ url: PASSAGE.url, text: PASSAGE.text }] } });
  });

  it('returns a tool error, not a throw, when the search is not available', async () => {
    const { call } = harness(() => ({}));
    const payload = await call({ query: 'token storage', mode: 'passages' });
    expect(payload).toMatchObject({ ok: false, error: { code: 'DEVELOPER_DOCS_INDEX_UNAVAILABLE', status: 503 } });
  });
});
