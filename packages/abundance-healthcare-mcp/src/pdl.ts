import { z } from 'zod';

// Professional profile and employment fields. Nested location fields describe the
// employer, never the person's residence.
export const PDL_PROFESSIONAL_FIELDS = [
  'id', 'full_name', 'first_name', 'last_name', 'linkedin_url', 'job_title', 'job_title_role',
  'job_company_name', 'job_company_website', 'job_company_industry', 'job_company_location_name',
  'job_start_date', 'job_last_changed', 'work_email', 'industry',
] as const;
// Personal contact fields from PDL's contact-data bundle plus city/state of residence for
// commute screening. Street address and postal code are deliberately never requested.
export const PDL_PERSONAL_CONTACT_FIELDS = [
  'mobile_phone', 'phone_numbers', 'personal_emails', 'recommended_personal_email',
  'location_locality', 'location_region', 'location_country',
] as const;
/** @deprecated kept for callers that imported the original allowlist name. */
export const PDL_FIELDS = PDL_PROFESSIONAL_FIELDS;

export function normalizeProfile(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname) || url.port || url.username || url.password || !/^\/in\/[a-zA-Z0-9_%\-]+\/?$/.test(url.pathname) || url.search || url.hash) {
    throw new Error('Use an exact HTTPS LinkedIn professional profile URL without query parameters.');
  }
  return 'https://www.linkedin.com' + url.pathname.replace(/\/$/, '').toLowerCase();
}

const text = (max: number) => z.string().trim().min(1).max(max);
const common = {
  confirm_paid_enrichment: z.literal(true),
  /** Request PDL's personal contact bundle (mobile phone, personal emails, home city/state). Default true. */
  include_personal_contact: z.boolean().default(true),
  /** Only pay for a match that carries at least one contact value (PDL `required`). */
  require_contact: z.boolean().default(false),
  /** PDL likelihood floor, 1-10. Defaults: 8 for profile URLs, 6 for name matches. */
  min_likelihood: z.number().int().min(1).max(10).optional(),
  /** Registry NPI this lookup is about. Stored for provenance only; never sent to PDL. */
  subject_npi: z.string().regex(/^\d{10}$/).optional(),
};
const profileInput = z.object({ profile_url: z.string().max(400).url().transform(normalizeProfile), ...common }).strict();
const nameInput = z.object({
  name: text(120),
  locality: text(80).optional(),
  region: text(80).optional(),
  company: text(120).optional(),
  ...common,
}).strict().refine(v => v.locality || v.region || v.company, { message: 'Name matches need at least one of locality, region or company.' });
export const pdlInputSchema = z.union([profileInput, nameInput]);
export type PdlInput = z.input<typeof pdlInputSchema>;
type ParsedInput = z.output<typeof pdlInputSchema>;

export type PdlPersonalContact = {
  mobile_phone: string | null;
  phone_numbers: string[];
  recommended_personal_email: string | null;
  personal_emails: string[];
  home_locality: string | null;
  home_region: string | null;
  home_country: string | null;
};
export type PdlResult = {
  status: 'pending' | 'matched' | 'no_match' | 'ambiguous' | 'unavailable';
  source: 'People Data Labs';
  scope: 'professional_and_personal_contact' | 'professional_profile_only';
  retrieved_at: string;
  subject_npi?: string;
  likelihood?: number;
  matched_on?: string[];
  professional?: Record<string, string | null>;
  personal_contact?: PdlPersonalContact;
  /** returned: values present · none_on_record: PDL holds no contact for this person · masked_by_plan: account lacks the contact bundle · not_requested */
  personal_contact_access: 'returned' | 'none_on_record' | 'masked_by_plan' | 'not_requested';
  provenance: {
    source: 'People Data Labs';
    retrieved_at: string;
    vendor_dataset_version?: string;
    contact_type: 'vendor_reported_personal_contact';
    verification: 'unverified';
    consent_basis: 'not_recorded';
  };
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
export const PDL_DEFAULT_DAILY_LIMIT = 25;
const DAY = 86_400_000;
const HOUR = 3_600_000;
// Vendor/config failures are retried after an hour; definitive outcomes are held for seven days.
const RESULT_TTL: Record<PdlResult['status'], number> = { pending: 7 * DAY, matched: 7 * DAY, no_match: 7 * DAY, ambiguous: 7 * DAY, unavailable: HOUR };
const LIMITATION = 'Vendor-reported profile and contact data; recruiter must confirm identity before use. Contact values are unverified and carry no consent record: a recruiter may place a manual call or send a personal email, but autodialed calls or SMS to a mobile number need prior express consent (TCPA), and any opt-out must be honored. Registry practice_phone remains labeled separately. Does not establish licensure, employment, availability or recruiting readiness.';

const E164 = /^\+[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function str(value: unknown, max = 500): string | null { return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null; }
function strList(value: unknown, test: RegExp, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(v => test.test(v)))].slice(0, max);
}
function nameTokens(value: string): string[] { return value.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter(t => t.length > 1); }

async function sha256(value: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(n => n.toString(16).padStart(2, '0')).join('');
}

function buildRequest(parsed: ParsedInput): Record<string, unknown> {
  const fields: string[] = [...PDL_PROFESSIONAL_FIELDS];
  if (parsed.include_personal_contact) fields.push(...PDL_PERSONAL_CONTACT_FIELDS);
  const body: Record<string, unknown> = { min_likelihood: parsed.min_likelihood ?? ('profile_url' in parsed ? 8 : 6), data_include: fields.join(','), include_if_matched: true };
  if ('profile_url' in parsed) body.profile = parsed.profile_url;
  else {
    body.name = parsed.name;
    if (parsed.locality) body.locality = parsed.locality;
    if (parsed.region) body.region = parsed.region;
    if (parsed.company) body.company = parsed.company;
  }
  if (parsed.require_contact && parsed.include_personal_contact) body.required = 'mobile_phone OR phone_numbers OR personal_emails';
  return body;
}

function identityConfirmed(parsed: ParsedInput, data: Record<string, unknown>, matched: string[]): boolean {
  if ('profile_url' in parsed) {
    if (typeof data.linkedin_url !== 'string') return false;
    try { return normalizeProfile(data.linkedin_url.startsWith('https://') ? data.linkedin_url : 'https://' + data.linkedin_url) === parsed.profile_url; } catch { return false; }
  }
  if (!matched.includes('name')) return false;
  const requested = nameTokens(parsed.name);
  const returned = new Set(nameTokens(typeof data.full_name === 'string' ? data.full_name : `${data.first_name ?? ''} ${data.last_name ?? ''}`));
  const last = requested.at(-1);
  return Boolean(last && returned.has(last) && requested.slice(0, -1).some(t => returned.has(t)));
}

function projectPersonalContact(data: Record<string, unknown>): { contact: PdlPersonalContact; access: PdlResult['personal_contact_access'] } {
  const probe = [data.mobile_phone, data.phone_numbers, data.personal_emails, data.recommended_personal_email];
  // Accounts without the contact bundle receive true/false instead of values.
  if (probe.some(v => typeof v === 'boolean')) {
    return { access: 'masked_by_plan', contact: { mobile_phone: null, phone_numbers: [], recommended_personal_email: null, personal_emails: [], home_locality: str(data.location_locality, 80), home_region: str(data.location_region, 80), home_country: str(data.location_country, 80) } };
  }
  const mobile = str(data.mobile_phone, 20);
  const contact: PdlPersonalContact = {
    mobile_phone: mobile && E164.test(mobile) ? mobile : null,
    phone_numbers: strList(data.phone_numbers, E164, 5),
    recommended_personal_email: (() => { const e = str(data.recommended_personal_email, 254)?.toLowerCase() ?? null; return e && EMAIL.test(e) ? e : null; })(),
    personal_emails: strList(data.personal_emails, EMAIL, 5).map(e => e.toLowerCase()),
    home_locality: str(data.location_locality, 80),
    home_region: str(data.location_region, 80),
    home_country: str(data.location_country, 80),
  };
  const hasValue = Boolean(contact.mobile_phone || contact.phone_numbers.length || contact.recommended_personal_email || contact.personal_emails.length);
  return { access: hasValue ? 'returned' : 'none_on_record', contact };
}

// A singleton Durable Object supplies a transactional store across all MCP sessions.
// Reserve before dispatch. Uncertain outcomes retain their reservation and are never retried automatically.
export async function enrichPdlProfile(input: PdlInput, options: { apiKey?: string; store: PdlStore; fetchFn?: typeof fetch; now?: number; dailyLimit?: number; baseUrl?: string }): Promise<PdlResult> {
  const parsed = pdlInputSchema.parse(input);
  if (!options.apiKey?.trim()) throw new Error('PDL integration is not configured.');
  const now = options.now ?? Date.now();
  const dailyLimit = Math.max(1, Math.floor(options.dailyLimit ?? PDL_DEFAULT_DAILY_LIMIT));
  const requestBody = buildRequest(parsed);
  const cacheKey = 'lookup:' + await sha256(JSON.stringify(requestBody));
  const retrievedAt = new Date(now).toISOString();
  const base: PdlResult = {
    status: 'pending', source: 'People Data Labs',
    scope: parsed.include_personal_contact ? 'professional_and_personal_contact' : 'professional_profile_only',
    retrieved_at: retrievedAt, ...(parsed.subject_npi ? { subject_npi: parsed.subject_npi } : {}),
    personal_contact_access: parsed.include_personal_contact ? 'none_on_record' : 'not_requested',
    provenance: { source: 'People Data Labs', retrieved_at: retrievedAt, contact_type: 'vendor_reported_personal_contact', verification: 'unverified', consent_basis: 'not_recorded' },
    limitation: LIMITATION,
  };
  const existing = await options.store.transaction(async store => {
    const cached = await store.get<{ expires: number; stored_at?: number; result: PdlResult }>(cacheKey);
    // TTL is decided by outcome at read time so an earlier long-lived failure entry does not block a retry.
    const ttl = RESULT_TTL[cached?.result.status ?? 'pending'];
    const storedAt = cached?.stored_at ?? (cached && cached.result.status !== 'unavailable' ? cached.expires - 7 * DAY : Number.NEGATIVE_INFINITY);
    if (cached && now - storedAt < ttl && cached.expires > now) return cached.result;
    const attempts = (await store.get<number[]>('attempts') ?? []).filter(t => t > now - DAY);
    if (attempts.length >= dailyLimit) throw new Error(`PDL daily limit reached: at most ${dailyLimit} new lookups per rolling 24 hours.`);
    await store.put('attempts', [...attempts, now]);
    await store.put(cacheKey, { expires: now + 7 * DAY, stored_at: now, result: base });
    return undefined;
  });
  if (existing) return { ...existing, cached: true };
  let result: PdlResult;
  try {
    const response = await (options.fetchFn ?? fetch)((options.baseUrl ?? 'https://api.peopledatalabs.com') + '/v5/person/enrich', {
      method: 'POST', redirect: 'error',
      headers: { 'X-Api-Key': options.apiKey.trim(), 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) result = { ...base, status: 'no_match' };
    else if (!response.ok) result = { ...base, status: 'unavailable', limitation: `PDL returned HTTP ${response.status}. Check account access or credits; no automatic retry. ${LIMITATION}` };
    else {
      const body = await response.json() as { status?: number; likelihood?: number; matched?: unknown; data?: Record<string, unknown> };
      const data = body.data ?? {};
      const matched = Array.isArray(body.matched) ? body.matched.filter((m): m is string => typeof m === 'string') : [];
      const floor = requestBody.min_likelihood as number;
      if (body.status !== 200 || typeof body.likelihood !== 'number' || !Number.isInteger(body.likelihood) || body.likelihood < floor || body.likelihood > 10 || !identityConfirmed(parsed, data, matched)) {
        result = { ...base, status: 'ambiguous' };
      } else {
        // Project fields again even if the vendor ignores data_include. Never persist the raw response.
        const professional = Object.fromEntries(PDL_PROFESSIONAL_FIELDS.map(field => [field, str(data[field])]));
        const version = str(data.dataset_version, 40);
        result = { ...base, status: 'matched', likelihood: body.likelihood, matched_on: matched, professional, provenance: { ...base.provenance, ...(version ? { vendor_dataset_version: version } : {}) } };
        if (parsed.include_personal_contact) {
          const { contact, access } = projectPersonalContact(data);
          result.personal_contact = contact;
          result.personal_contact_access = access;
        }
      }
    }
  } catch {
    result = { ...base, status: 'unavailable', limitation: `PDL response could not be confirmed. No automatic retry. ${LIMITATION}` };
  }
  await options.store.put(cacheKey, { expires: now + RESULT_TTL[result.status], stored_at: now, result });
  return { ...result, cached: false };
}
