/** Public-only, single-page boundary for the authenticated Are.na v3 search API. */
export interface CandidateBlock {
  id: number;
  class: 'Image' | 'Text' | 'Link' | 'Media';
  title?: string;
  generated_title?: string;
  content?: string;
  description?: string;
  source?: { url: string; title?: string };
  imageUrl?: string;
}

export type ArenaPremiumSearchErrorCode =
  | 'missing_token'
  | 'invalid_query'
  | 'invalid_limit'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'upstream_unavailable'
  | 'upstream_error'
  | 'invalid_response'
  | 'timeout'
  | 'network_error';

/** Codes and messages are safe to return to operators; provider bodies are never retained. */
export class ArenaPremiumSearchError extends Error {
  readonly name = 'ArenaPremiumSearchError';
  constructor(public readonly code: ArenaPremiumSearchErrorCode) {
    super(`Are.na search failed (${code}).`);
  }
}

export interface ArenaPremiumSearchOptions {
  query: string;
  accessToken: string;
  per?: number;
  fetch?: typeof globalThis.fetch;
}

const TIMEOUT_MS = 10_000;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password)
      return url.href;
  } catch {
    /* Untrusted provider field: omit invalid URLs. */
  }
}

function candidate(value: unknown): CandidateBlock | undefined {
  if (
    !object(value) ||
    value.visibility !== 'public' ||
    !Number.isSafeInteger(value.id) ||
    Number(value.id) <= 0
  )
    return;
  const classes: Record<string, CandidateBlock['class']> = {
    Image: 'Image',
    Text: 'Text',
    Link: 'Link',
    Media: 'Media',
    Embed: 'Media'
  };
  const kind =
    typeof value.type === 'string' && Object.hasOwn(classes, value.type)
      ? classes[value.type]
      : undefined;
  if (!kind) return;
  const block: CandidateBlock = { id: value.id as number, class: kind };
  for (const field of ['title', 'generated_title', 'content', 'description'] as const) {
    if (typeof value[field] === 'string') block[field] = value[field].slice(0, 20_000);
  }
  if (object(value.source)) {
    const url = safeUrl(value.source.url);
    if (url)
      block.source = {
        url,
        ...(typeof value.source.title === 'string'
          ? { title: value.source.title.slice(0, 2_000) }
          : {})
      };
  }
  if (object(value.image)) {
    const url = safeUrl(value.image.src);
    if (url) block.imageUrl = url;
  }
  return block;
}

export async function searchPublicArenaBlocks(
  options: ArenaPremiumSearchOptions
): Promise<{ blocks: CandidateBlock[] }> {
  const { accessToken, fetch: request = globalThis.fetch, per = 20 } = options;
  const query = typeof options.query === 'string' ? options.query.trim() : '';
  if (!accessToken?.trim()) throw new ArenaPremiumSearchError('missing_token');
  if (!query || query.length > 200) throw new ArenaPremiumSearchError('invalid_query');
  if (!Number.isInteger(per) || per < 1 || per > 50)
    throw new ArenaPremiumSearchError('invalid_limit');
  const url = new URL('https://api.are.na/v3/search');
  url.search = new URLSearchParams({
    query,
    type: 'Block',
    page: '1',
    per: String(per)
  }).toString();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ArenaPremiumSearchError('timeout'));
      controller.abort();
    }, TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      timeout,
      (async () => {
        const response = await request(url.href, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
          signal: controller.signal,
          redirect: 'error'
        });
        if (!response.ok) {
          const code =
            response.status === 401
              ? 'unauthorized'
              : response.status === 403
                ? 'forbidden'
                : response.status === 429
                  ? 'rate_limited'
                  : response.status >= 500
                    ? 'upstream_unavailable'
                    : 'upstream_error';
          throw new ArenaPremiumSearchError(code);
        }
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          throw new ArenaPremiumSearchError('invalid_response');
        }
        if (!object(body) || !Array.isArray(body.data))
          throw new ArenaPremiumSearchError('invalid_response');
        return {
          blocks: body.data
            .slice(0, per)
            .map(candidate)
            .filter((block): block is CandidateBlock => block !== undefined)
        };
      })()
    ]);
  } catch (error) {
    if (error instanceof ArenaPremiumSearchError) throw error;
    throw new ArenaPremiumSearchError('network_error');
  } finally {
    clearTimeout(timer);
  }
}
