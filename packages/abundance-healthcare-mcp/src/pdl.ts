import { z } from 'zod';

export const PDL_FIELDS = ['id', 'full_name', 'linkedin_url', 'job_title', 'job_company_name', 'job_company_website'] as const;
export function normalizeProfile(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname) || url.port || url.username || url.password || !/^\/in\/[a-zA-Z0-9_%\-]+\/?$/.test(url.pathname) || url.search || url.hash) {
    throw new Error('Use an exact HTTPS LinkedIn professional profile URL without query parameters.');
  }
  return 'https://www.linkedin.com' + url.pathname.replace(/\/$/, '').toLowerCase();
}
export const pdlInputSchema = z.object({
  profile_url: z.string().max(400).url().transform(normalizeProfile),
  confirm_paid_enrichment: z.literal(true),
}).strict();
export type PdlInput = z.input<typeof pdlInputSchema>;
export type PdlResult = {
  status: 'pending' | 'matched' | 'no_match' | 'ambiguous' | 'unavailable';
  source: 'People Data Labs';
  scope: 'professional_profile_only';
  retrieved_at: string;
  likelihood?: number;
  profile?: Record<string, string | null>;
  limitation: string;
  cached?: boolean;
};
export interface PdlTransaction {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<unknown>;
}
export interface PdlStore extends PdlTransaction {
  transaction<T>(fn: (store: PdlTransaction) => Promise<T>): Promise<T>;
}
const DAY = 86_400_000;
const LIMITATION = 'Vendor-reported professional profile; employer and identity require review. No private contacts or residential data are requested or returned. Does not establish licensure, availability, consent or recruiting readiness.';

// A singleton Durable Object supplies a transactional store across all MCP sessions.
// Reserve before dispatch. Uncertain outcomes retain their reservation and are never retried automatically.
export async function enrichPdlProfile(input: PdlInput, options: { apiKey?: string; store: PdlStore; fetchFn?: typeof fetch; now?: number }): Promise<PdlResult> {
  const parsed = pdlInputSchema.parse(input);
  if (!options.apiKey?.trim()) throw new Error('PDL integration is not configured.');
  const now = options.now ?? Date.now();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parsed.profile_url)))].map(n => n.toString(16).padStart(2, '0')).join('');
  const cacheKey = 'profile:' + hash;
  const base: PdlResult = { status: 'pending', source: 'People Data Labs', scope: 'professional_profile_only', retrieved_at: new Date(now).toISOString(), limitation: LIMITATION };
  const existing = await options.store.transaction(async store => {
    const cached = await store.get<{ expires: number; result: PdlResult }>(cacheKey);
    if (cached && cached.expires > now) return cached.result;
    const attempts = (await store.get<number[]>('attempts') ?? []).filter(t => t > now - DAY);
    if (attempts.length >= 5) throw new Error('PDL daily limit reached: at most five new profile requests per rolling 24 hours.');
    await store.put('attempts', [...attempts, now]);
    await store.put(cacheKey, { expires: now + 7 * DAY, result: base });
    return undefined;
  });
  if (existing) return { ...existing, cached: true };
  let result: PdlResult;
  try {
    const response = await (options.fetchFn ?? fetch)('https://api.peopledatalabs.com/v5/person/enrich', {
      method: 'POST', redirect: 'error',
      headers: { 'X-Api-Key': options.apiKey.trim(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: parsed.profile_url, min_likelihood: 8, data_include: PDL_FIELDS.join(',') }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) result = { ...base, status: 'no_match' };
    else if (!response.ok) result = { ...base, status: 'unavailable', limitation: `PDL returned HTTP ${response.status}. Check account access or credits; no automatic retry. ${LIMITATION}` };
    else {
      const body = await response.json() as { status?: number; likelihood?: number; data?: Record<string, unknown> };
      const data = body.data;
      let sameProfile = false;
      if (typeof data?.linkedin_url === 'string') {
        try { sameProfile = normalizeProfile(data.linkedin_url.startsWith('https://') ? data.linkedin_url : 'https://' + data.linkedin_url) === parsed.profile_url; } catch { /* ambiguous identity */ }
      }
      if (body.status !== 200 || typeof body.likelihood !== 'number' || body.likelihood < 8 || body.likelihood > 10 || !Number.isInteger(body.likelihood) || !sameProfile) {
        result = { ...base, status: 'ambiguous' };
      } else {
        // Project fields again even if the vendor ignores data_include. Never persist the raw response.
        const profile = Object.fromEntries(PDL_FIELDS.map(field => [field, typeof data?.[field] === 'string' ? (data[field] as string).slice(0, 500) : null]));
        result = { ...base, status: 'matched', likelihood: body.likelihood, profile };
      }
    }
  } catch {
    result = { ...base, status: 'unavailable', limitation: `PDL response could not be confirmed. No automatic retry. ${LIMITATION}` };
  }
  await options.store.put(cacheKey, { expires: now + 7 * DAY, result });
  return { ...result, cached: false };
}
