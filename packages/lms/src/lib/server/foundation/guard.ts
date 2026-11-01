import type { RequestEvent } from '@sveltejs/kit';

export const RATE_LIMIT = 60;
export const MAX_BODY_BYTES = 8192;
export class BodyTooLargeError extends Error {}
export const RATE_SQL = `INSERT INTO foundation_rate_limits (bucket, window, hits) VALUES (?, ?, 1)
  ON CONFLICT(bucket, window) DO UPDATE SET hits = MIN(hits + 1, 61) RETURNING hits`;
export const EXPIRE_SQL = 'DELETE FROM foundation_rate_limits WHERE window < ?';

export function apiJson(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', ...extra
  } });
}

export function preflight() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version', 'Access-Control-Max-Age': '600'
  } });
}

export async function guard(event: RequestEvent, mcp = false): Promise<Response | null> {
  if (event.url.href.length > 2048) return apiJson({ error: 'URL too long.' }, 414);
  if (mcp) {
    const origin = event.request.headers.get('origin');
    // Browser MCP is same-origin. Server/desktop clients omit Origin. Public HTTP GET supports CORS.
    if (origin && origin !== event.url.origin && origin !== 'https://learn.createsomething.space') return apiJson({ error: 'Unsupported MCP browser origin. Use the public HTTP GET API or a desktop MCP client.' }, 403);
  }
  const db = event.platform?.env.DB;
  if (!db) return apiJson({ error: 'Foundation request control unavailable. Retry later.' }, 503, { 'Retry-After': '60' });
  const window = Math.floor(Date.now() / 60000);
  try {
    const address = event.getClientAddress();
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${window}:${address}`));
    const bucket = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
    const results = await db.batch([
      db.prepare(EXPIRE_SQL).bind(window - 2),
      db.prepare(RATE_SQL).bind(bucket, window)
    ]);
    const hits = (results[1].results[0] as { hits?: number } | undefined)?.hits;
    if (typeof hits !== 'number') throw new Error('Missing quota result');
    if (hits > RATE_LIMIT) return apiJson({ error: 'Request limit reached. Wait before retrying.', limitPerMinute: RATE_LIMIT }, 429, { 'Retry-After': String(60 - Math.floor(Date.now() / 1000) % 60) });
  } catch {
    return apiJson({ error: 'Foundation request control unavailable. Retry later.' }, 503, { 'Retry-After': '60' });
  }
  return null;
}

/** Count streamed bytes as well as Content-Length; a missing header cannot bypass the cap. */
export async function readBoundedJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new BodyTooLargeError('Request body exceeds 8192 bytes.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('A JSON request body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MAX_BODY_BYTES) { await reader.cancel(); throw new BodyTooLargeError('Request body exceeds 8192 bytes.'); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
