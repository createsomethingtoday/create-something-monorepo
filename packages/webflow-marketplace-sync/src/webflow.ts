import type { Env, WebflowItem } from './types';

const API_BASE = 'https://api.webflow.com/v2';

/** Token for single-item fetches triggered by webhooks (site token). */
export function webflowWriteToken(env: Env): string {
  const token = env.WEBFLOW_API_TOKEN ?? env.CMS_READ_ONLY;
  if (!token) throw new Error('No Webflow API token configured.');
  return token;
}

/** Token for bulk reconciler reads; falls back to the site token. */
export function webflowReadToken(env: Env): string {
  const token = env.CMS_READ_ONLY ?? env.WEBFLOW_API_TOKEN;
  if (!token) throw new Error('No Webflow API token configured.');
  return token;
}

async function webflowFetch(token: string, path: string, attempt = 0): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (response.status === 429 && attempt < 3) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '5');
    await sleep(Math.min(retryAfter, 30) * 1000);
    return webflowFetch(token, path, attempt + 1);
  }
  return response;
}

export async function getItem(env: Env, itemId: string): Promise<WebflowItem | null> {
  const response = await webflowFetch(
    webflowWriteToken(env),
    `/collections/${env.WEBFLOW_TEMPLATES_COLLECTION_ID}/items/${itemId}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Webflow getItem ${itemId} failed: ${response.status}`);
  return (await response.json()) as WebflowItem;
}

export interface ListOptions {
  sortBy?: 'createdOn' | 'lastUpdated' | 'lastPublished';
  sortOrder?: 'asc' | 'desc';
  /** Stop paginating once shouldStop returns true for an item (items arrive in sort order). */
  shouldStop?: (item: WebflowItem) => boolean;
  /** Delay between pages in ms; keeps us inside the 60 req/min token limit. */
  pageDelayMs?: number;
  onPage?: (items: WebflowItem[]) => void | Promise<void>;
}

/** Paginate the staged items endpoint (includes drafts + archived: the full universe). */
export async function listItems(env: Env, options: ListOptions = {}): Promise<WebflowItem[]> {
  const token = webflowReadToken(env);
  const limit = 100;
  const all: WebflowItem[] = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (options.sortBy) {
      params.set('sortBy', options.sortBy);
      params.set('sortOrder', options.sortOrder ?? 'desc');
    }
    const response = await webflowFetch(
      token,
      `/collections/${env.WEBFLOW_TEMPLATES_COLLECTION_ID}/items?${params}`,
    );
    if (!response.ok) throw new Error(`Webflow listItems failed at offset ${offset}: ${response.status}`);
    const body = (await response.json()) as { items?: WebflowItem[]; pagination?: { total?: number } };
    const items = body.items ?? [];
    let stopped = false;
    for (const item of items) {
      if (options.shouldStop?.(item)) {
        stopped = true;
        break;
      }
      all.push(item);
    }
    if (options.onPage) await options.onPage(items);
    const total = body.pagination?.total ?? 0;
    offset += items.length;
    if (stopped || items.length === 0 || offset >= total) break;
    await sleep(options.pageDelayMs ?? 1100);
  }
  return all;
}

// Verifies a Webflow webhook signature (HMAC-SHA256, hex-encoded, x-webflow-signature header).
// Same verification the webflow-template-search worker uses in production.
export async function verifyWebflowSignature(secret: string, rawBody: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'verify',
    ]);
    const sigBytes = new Uint8Array((signature.match(/../g) ?? []).map((h) => parseInt(h, 16)));
    if (sigBytes.length === 0) return false;
    return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));
  } catch {
    return false;
  }
}

export async function verifyAgainstSecrets(env: Env, rawBody: string, signature: string): Promise<boolean> {
  if (!env.WEBFLOW_WEBHOOK_SECRET) return true; // validation disabled until secrets are configured
  const secrets = env.WEBFLOW_WEBHOOK_SECRET.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const secret of secrets) {
    if (await verifyWebflowSignature(secret, rawBody, signature)) return true;
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
