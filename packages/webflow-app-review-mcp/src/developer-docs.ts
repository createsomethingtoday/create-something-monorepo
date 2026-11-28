import { AirtableClientError } from './airtable.js';

/**
 * Search of the Webflow developer docs (developers.webflow.com) for a review.
 *
 * Two sources:
 * - `passages`: the docs index Worker (packages/webflow-docs-index), through a
 *   service binding. Returns exact text from the docs with the section URL.
 * - `answer`: the docs site's own MCP tool `searchDocs`. Returns a generated
 *   summary with footnote URLs. Measured on 2026-11-27 (webflow-docs-index/eval):
 *   it refused one security question, and 21 of 30 answers cited a v2 beta or
 *   v1 URL, so its text is for orientation and not for quoting.
 */

export const DOCS_SEARCH_MODES = ['passages', 'answer'] as const;
export type DocsSearchMode = (typeof DOCS_SEARCH_MODES)[number];

export interface DocsPassage {
  url: string;
  headingPath: string;
  text: string;
  version: string;
  checkedAt: string | null;
  score: number;
}

/** The `search` RPC method of the webflow-docs-index Worker. */
export interface DocsIndexBinding {
  search(input: { query: string; topK?: number; includeBeta?: boolean }): Promise<{ passages: DocsPassage[]; degraded: string[] }>;
}

export interface DeveloperDocsConfig {
  /** Service binding to the docs index. Unset = only the `answer` mode works. */
  index?: DocsIndexBinding | null;
  /** Override for tests; defaults to the docs site MCP endpoint. */
  docsSiteMcpUrl?: string;
  fetchFn?: typeof fetch;
}

export interface DocsSearchParams {
  query: string;
  mode?: DocsSearchMode;
  topK?: number;
  includeBeta?: boolean;
}

export interface DocsPassagesResult {
  mode: 'passages';
  passages: Array<{ url: string; section: string; text: string; version: string; checked_at: string | null; score: number }>;
  note?: string;
}

export interface DocsAnswerResult {
  mode: 'answer';
  generated: true;
  answer: string;
  sources: string[];
  note: string;
  /** Set when the caller did not ask for this mode. */
  fallback_reason?: string;
}

const DOCS_SITE_MCP_URL = 'https://developers.webflow.com/_mcp/server';
const DOCS_SITE_TIMEOUT_MS = 45_000;
const DEFAULT_TOP_K = 5;

function unavailable(message: string, details?: unknown): AirtableClientError {
  return new AirtableClientError('DEVELOPER_DOCS_SEARCH_UNAVAILABLE', message, 502, details);
}

async function findPassages(index: DocsIndexBinding, params: DocsSearchParams): Promise<DocsPassagesResult> {
  const result = await index.search({ query: params.query, topK: params.topK ?? DEFAULT_TOP_K, includeBeta: params.includeBeta });
  const notes: string[] = [];
  if (result.passages.length === 0) notes.push('No passage matched. Ask again with other words or the exact identifier, or use mode "answer".');
  if (result.degraded.length > 0) notes.push(`Search ran without: ${result.degraded.join(', ')}. The order of the passages is less exact.`);
  return {
    mode: 'passages',
    passages: result.passages.map((passage) => ({
      url: passage.url,
      section: passage.headingPath,
      text: passage.text,
      version: passage.version,
      checked_at: passage.checkedAt,
      score: passage.score,
    })),
    ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
  };
}

/** The JSON-RPC message of a Streamable HTTP response: a `data:` line of an event stream, or plain JSON. */
function parseRpcMessage(raw: string): unknown {
  const dataLine = raw.split('\n').find((line) => line.startsWith('data:'));
  return JSON.parse(dataLine ? dataLine.slice(5) : raw);
}

async function askDocsSite(config: DeveloperDocsConfig, params: DocsSearchParams): Promise<DocsAnswerResult> {
  const fetchFn = config.fetchFn ?? fetch;
  let raw: string;
  try {
    const response = await fetchFn(config.docsSiteMcpUrl ?? DOCS_SITE_MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'searchDocs', arguments: { query: params.query, topK: params.topK ?? DEFAULT_TOP_K } },
      }),
      signal: AbortSignal.timeout(DOCS_SITE_TIMEOUT_MS),
    });
    if (!response.ok) throw unavailable(`The docs site search failed with status ${response.status}.`);
    raw = await response.text();
  } catch (error) {
    if (error instanceof AirtableClientError) throw error;
    throw unavailable('The docs site search did not answer.', { reason: error instanceof Error ? error.message : String(error) });
  }

  let message: { result?: { content?: Array<{ text?: unknown }>; isError?: boolean }; error?: { message?: unknown } };
  try {
    message = parseRpcMessage(raw) as typeof message;
  } catch {
    throw unavailable('The docs site search returned a response that is not JSON-RPC.');
  }
  const answer = (message.result?.content ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
  if (message.error || message.result?.isError || !answer) {
    throw unavailable('The docs site search returned an error.', {
      reason: typeof message.error?.message === 'string' ? message.error.message.slice(0, 300) : answer.slice(0, 300),
    });
  }

  const sources = [...new Set([...answer.matchAll(/^\[\^\d+\]:\s*(https:\/\/developers\.webflow\.com\/\S+)/gm)].map((match) => match[1]))];
  const hasOldVersion = sources.some((url) => /\/v2\.0\.0-beta\/|\/v1\.0\.0\//.test(url));
  return {
    mode: 'answer',
    generated: true,
    answer,
    sources,
    note:
      'The docs site wrote this summary. Read the source page before you cite a rule, and quote the page, not the summary.' +
      (hasOldVersion ? ' Some sources are v2 beta or v1 pages: confirm the rule on the current page.' : ''),
  };
}

/**
 * Search the developer docs. With no `mode`, passages from the index are the
 * result, and the docs site answer is the fallback when the index is not bound
 * or fails. An explicit `mode` is not replaced by the other one.
 */
export async function searchDeveloperDocs(config: DeveloperDocsConfig, params: DocsSearchParams): Promise<DocsPassagesResult | DocsAnswerResult> {
  if (params.mode === 'answer') return askDocsSite(config, params);

  if (!config.index) {
    if (params.mode === 'passages') {
      throw new AirtableClientError(
        'DEVELOPER_DOCS_INDEX_UNAVAILABLE',
        'The docs index is not connected to this MCP runtime. Use mode "answer".',
        503,
      );
    }
    return { ...(await askDocsSite(config, params)), fallback_reason: 'The docs index is not connected to this MCP runtime.' };
  }

  try {
    return await findPassages(config.index, params);
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300);
    if (params.mode === 'passages') {
      throw new AirtableClientError('DEVELOPER_DOCS_INDEX_UNAVAILABLE', 'The docs index failed. Use mode "answer".', 502, { reason });
    }
    return { ...(await askDocsSite(config, params)), fallback_reason: `The docs index failed: ${reason}` };
  }
}
