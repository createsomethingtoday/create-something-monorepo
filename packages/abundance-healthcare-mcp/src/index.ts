import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export const SERVER_NAME = 'abundance-healthcare-mcp';
export const SERVER_VERSION = '1.2.0';
export const DEFAULT_AGENCY_BASE_URL = 'https://createsomething.agency';
export const DEFAULT_EXA_AGENT_BASE_URL = 'https://api.exa.ai';

export const NPG_HEALTHCARE_MARKETS = [
  { id: 'npg-family-np-nationwide', label: 'Family nurse practitioners nationwide', refresh_cadence: 'weekly', daily_monitoring: false },
  { id: 'npg-family-np-springfield-mo', label: 'Family nurse practitioners in Springfield, Missouri', state: 'MO', city: 'Springfield', refresh_cadence: 'weekly', daily_monitoring: false },
  { id: 'npg-family-np-arlington-tx', label: 'Family nurse practitioners in Arlington, Texas', state: 'TX', city: 'Arlington', refresh_cadence: 'weekly', daily_monitoring: false },
] as const;

export type HealthcareMarketId = (typeof NPG_HEALTHCARE_MARKETS)[number]['id'];
export interface HealthcareCoverageReport {
  persona: Record<string, unknown>;
  evaluated_at: string;
  market_coverage_status: string;
  direct_outreach_status: 'ready' | 'blocked';
  recruiting_pipeline: { coverage_candidate_count: number; recruiter_ready_count: number; required_evidence_kinds: string[] };
  provider_count: number;
  source: { latest_fetched_at?: string; snapshot_age_days?: number; coverage_limit_reached: boolean };
  [key: string]: unknown;
}
export interface HealthcareProvider { npi: string; name: string; last_updated_date?: string; source_fetched_at: string; [key: string]: unknown }
export interface HealthcareReadiness { npi: string; stage: 'coverage_candidate' | 'recruiter_ready'; evaluated_at: string; gates: Array<Record<string, unknown>>; blocking_reasons: string[] }
export interface HealthcareApiResponse {
  success: boolean;
  data: { report: HealthcareCoverageReport; providers: HealthcareProvider[]; readiness: HealthcareReadiness[]; total: number; limit: number; offset: number; run?: Record<string, unknown> };
}
export interface HealthcareClientOptions {
  agencyApiKey?: string;
  agencyBaseUrl?: string;
  exaApiKey?: string;
  exaAgentBaseUrl?: string;
  exaTimeoutMs?: number;
  exaPollIntervalMs?: number;
  fetchFn?: typeof fetch;
  waitFn?: (milliseconds: number) => Promise<void>;
}

export async function isAcceptedHealthcareBearer(provided: string | undefined, configured: Array<string | undefined>): Promise<boolean> {
  const candidates = configured.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (!provided || candidates.length === 0) return false;
  return (await Promise.all(candidates.map((candidate) => constantTimeEqual(provided, candidate)))).some(Boolean);
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([left, right].map(async (value) => new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  )));
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return diff === 0;
}

const marketIdSchema = z.enum(['npg-family-np-nationwide', 'npg-family-np-springfield-mo', 'npg-family-np-arlington-tx']);
const SUPPORTED_US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD',
  'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'AS', 'GU', 'MP', 'PR', 'VI',
]);
const stateCodeSchema = z.string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'Use a two-letter US state code.')
  .transform((value) => value.toUpperCase())
  .refine((value) => SUPPORTED_US_STATE_CODES.has(value), 'Use a supported US state, district, or territory code.');
const searchCandidatesSchema = z.object({
  market_id: marketIdSchema.default('npg-family-np-nationwide'),
  state: stateCodeSchema.optional(),
  city: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  updated_since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').optional(),
  readiness_state: z.enum(['coverage_candidate', 'recruiter_ready']).optional(),
  limit: z.number().int().min(1).max(25).default(10),
  offset: z.number().int().min(0).max(1_000_000).default(0),
}).strict();
const practitionerSchema = z.object({ market_id: marketIdSchema, npi: z.string().regex(/^\d{10}$/, 'NPI must contain exactly 10 digits.') }).strict();
const providerContactSchema = z.object({
  npi: z.string().regex(/^\d{10}$/, 'NPI must contain exactly 10 digits.'),
  purpose: z.enum(['recruiting_outreach', 'advertising_research']),
}).strict();
const enrichmentContactTypesSchema = z.array(z.enum(['email', 'phone']))
  .min(1).max(2)
  .refine((items) => new Set(items).size === items.length, 'contact_types cannot contain duplicates.');
const providerEnrichmentSchema = z.object({
  npi: z.string().regex(/^\d{10}$/, 'NPI must contain exactly 10 digits.'),
  purpose: z.enum(['recruiting_outreach', 'advertising_research']),
  confirm_paid_enrichment: z.literal(true, { errorMap: () => ({ message: 'Set confirm_paid_enrichment to true to authorize one bounded paid Exa Agent lookup.' }) }),
  contact_types: enrichmentContactTypesSchema.default(['email', 'phone']),
}).strict();
const exaStructuredOutputSchema = z.object({
  match_status: z.enum(['verified_match', 'plausible_match', 'ambiguous', 'no_match']),
  identity_reason: z.string().max(600),
  professional_profile_url: z.string().url().nullable().optional(),
  professional_email: z.string().email().nullable().optional(),
  professional_phone: z.string().max(80).nullable().optional(),
  evidence_summary: z.string().max(600).nullable().optional(),
}).strict();
const providerContactOutputSchema = z.object({
  provider: z.object({
    npi: z.string(), name: z.string(), credential: z.string().optional(),
    enumeration_type: z.string().optional(), taxonomy: z.string().optional(),
  }),
  requested_purpose: z.enum(['recruiting_outreach', 'advertising_research']),
  contact_available: z.boolean(),
  contact: z.object({
    classification: z.enum(['individual_public_registry', 'organization_public_registry', 'public_registry_unclassified']),
    possible_personal_or_residential: z.boolean(),
    practice_phone: z.string().optional(), practice_address_1: z.string().optional(), practice_address_2: z.string().optional(),
    practice_city: z.string().optional(), practice_state: z.string().optional(), practice_postal_code: z.string().optional(),
    practice_country: z.string().optional(),
    source: z.object({ system: z.string(), fetched_at: z.string(), provider_last_updated_date: z.string().optional() }),
  }),
  contact_route_status: z.enum(['public_registry_unverified', 'not_found_in_registry']),
  outreach_authority_status: z.literal('not_established'),
  advertising_eligibility_status: z.literal('not_established'),
  recruiting_readiness_impact: z.literal('none'),
  direct_outreach_status: z.literal('operator_review_required'),
  contact_limitation: z.string(),
});
const providerEnrichmentOutputSchema = z.object({
  provider: z.object({ npi: z.string(), name: z.string(), taxonomy: z.string().optional() }),
  requested_purpose: z.enum(['recruiting_outreach', 'advertising_research']),
  requested_contact_types: enrichmentContactTypesSchema,
  match_status: z.enum(['verified_match', 'plausible_match', 'ambiguous', 'no_match']),
  identity_reason: z.string(),
  professional_contact: z.object({
    profile_url: z.string().url().optional(), email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  evidence_summary: z.string().optional(),
  source_citations: z.array(z.object({ url: z.string() })),
  contact_route_status: z.enum(['unverified_enrichment_candidate', 'no_contact_candidate_found']),
  identity_verification_status: z.enum(['source_grounded', 'operator_review_required']),
  outreach_authority_status: z.literal('not_established'),
  advertising_eligibility_status: z.literal('not_established'),
  recruiting_readiness_impact: z.literal('none'),
  estimated_max_cost_usd: z.number(), actual_cost_usd: z.number().optional(),
  usage: z.record(z.unknown()).optional(),
  enrichment_limitation: z.string(),
});
export type SearchCoverageCandidatesInput = z.input<typeof searchCandidatesSchema>;

export async function getHealthcareCoverage(input: { market_id: HealthcareMarketId }, options: HealthcareClientOptions) {
  const data = await fetchHealthcareMarket(marketIdSchema.parse(input.market_id), { limit: '1' }, options);
  return {
    report: data.report,
    total: data.total,
    limit: data.limit,
    offset: data.offset,
    run: data.run,
  };
}

export async function listHealthcareMarkets(options: HealthcareClientOptions) {
  const reports = await Promise.all(NPG_HEALTHCARE_MARKETS.map((market) => fetchHealthcareMarket(market.id, {}, options)));
  return { markets: NPG_HEALTHCARE_MARKETS.map((market, index) => ({
    ...market,
    latest_fetched_at: reports[index].report.source.latest_fetched_at,
    snapshot_age_days: reports[index].report.source.snapshot_age_days,
    provider_count: reports[index].total,
    market_coverage_status: reports[index].report.market_coverage_status,
    direct_outreach_status: reports[index].report.direct_outreach_status,
  })) };
}

export async function searchCoverageCandidates(input: SearchCoverageCandidatesInput, options: HealthcareClientOptions) {
  const parsed = searchCandidatesSchema.parse(input);
  if (parsed.city && !parsed.state) throw new TypeError('state is required when city is provided.');
  if (parsed.market_id !== 'npg-family-np-nationwide' && (parsed.state || parsed.city)) {
    throw new TypeError('state and city filters can only be combined with the nationwide market.');
  }
  const data = await fetchHealthcareMarket(parsed.market_id, {
    state: parsed.state, city: parsed.city?.toLowerCase(), name: parsed.name, updated_since: parsed.updated_since,
    limit: String(parsed.limit), offset: String(parsed.offset),
  }, options);
  const readinessByNpi = new Map(data.readiness.map((item) => [item.npi, item]));
  const results = data.providers
    .filter((provider) => !parsed.readiness_state || (readinessByNpi.get(provider.npi)?.stage ?? 'coverage_candidate') === parsed.readiness_state)
    .map((provider) => summarizeProvider(provider, readinessByNpi.get(provider.npi)));
  return {
    market_id: parsed.market_id,
    ...(parsed.state ? { location: {
      scope: 'derived_locale',
      label: parsed.city ? `${parsed.city}, ${parsed.state}` : parsed.state,
      state: parsed.state,
      ...(parsed.city ? { city: parsed.city } : {}),
    } } : {}),
    source_latest_fetched_at: data.report.source.latest_fetched_at,
    direct_outreach_status: data.report.direct_outreach_status,
    total: data.total,
    limit: parsed.limit,
    offset: parsed.offset,
    ...(parsed.offset + parsed.limit < data.total ? { next_offset: parsed.offset + parsed.limit } : {}),
    results,
    ...(parsed.readiness_state ? { readiness_filter_note: 'Readiness is evaluated on the returned bounded page; recruiter_ready is fail-closed.' } : {}),
  };
}

export async function getHealthcarePractitioner(input: z.input<typeof practitionerSchema>, options: HealthcareClientOptions) {
  const parsed = practitionerSchema.parse(input);
  const data = await fetchHealthcareMarket(parsed.market_id, { npi: parsed.npi, limit: '1' }, options);
  const provider = data.providers[0];
  if (!provider) throw new Error(`NPI ${parsed.npi} was not found in market ${parsed.market_id}.`);
  const readiness = data.readiness[0] ?? failClosedReadiness(provider.npi, data.report);
  return {
    market_id: parsed.market_id,
    provider: compactObject({
      npi: provider.npi, name: provider.name, first_name: cleanString(provider.first_name), middle_name: cleanString(provider.middle_name),
      last_name: cleanString(provider.last_name), credential: cleanString(provider.credential), status: cleanString(provider.status),
      enumeration_date: cleanString(provider.enumeration_date), last_updated_date: provider.last_updated_date,
      certification_date: cleanString(provider.certification_date), primary_taxonomy_code: cleanString(provider.primary_taxonomy_code),
      primary_taxonomy_description: cleanString(provider.primary_taxonomy_description), license_state: cleanString(provider.license_state),
      license_number: cleanString(provider.license_number), practice_address_1: cleanString(provider.practice_address_1),
      practice_address_2: cleanString(provider.practice_address_2), practice_city: cleanString(provider.practice_city),
      practice_state: cleanString(provider.practice_state), practice_postal_code: cleanString(provider.practice_postal_code),
      practice_country: cleanString(provider.practice_country), practice_phone: cleanString(provider.practice_phone),
      source_system: cleanString(provider.source_system), source_fetched_at: provider.source_fetched_at,
    }),
    readiness,
    direct_outreach_status: readiness.stage === 'recruiter_ready' ? 'ready' : 'blocked',
    source_latest_fetched_at: data.report.source.latest_fetched_at,
    contact_limitation: 'NPPES telephone and address fields are public registry data. For an individual provider they may be personal or residential, and they do not prove a current professional recruiting route, employment, availability, or outreach consent.',
  };
}

export async function getProviderContactInformation(input: z.input<typeof providerContactSchema>, options: HealthcareClientOptions) {
  const parsed = providerContactSchema.parse(input);
  const data = await fetchHealthcareMarket('npg-family-np-nationwide', { npi: parsed.npi, limit: '1' }, options);
  const provider = data.providers[0];
  if (!provider) throw new Error(`NPI ${parsed.npi} was not found in the nationwide Family Nurse Practitioner snapshot.`);
  const enumerationType = cleanString(provider.enumeration_type);
  const classification = enumerationType === 'NPI-1'
    ? 'individual_public_registry'
    : enumerationType === 'NPI-2'
      ? 'organization_public_registry'
      : 'public_registry_unclassified';
  const contact = compactObject({
    classification,
    possible_personal_or_residential: enumerationType !== 'NPI-2',
    practice_phone: cleanString(provider.practice_phone),
    practice_address_1: cleanString(provider.practice_address_1),
    practice_address_2: cleanString(provider.practice_address_2),
    practice_city: cleanString(provider.practice_city),
    practice_state: cleanString(provider.practice_state),
    practice_postal_code: cleanString(provider.practice_postal_code),
    practice_country: cleanString(provider.practice_country),
    source: {
      system: cleanString(provider.source_system) ?? 'nppes_npi_registry_v2_1',
      fetched_at: provider.source_fetched_at,
      provider_last_updated_date: provider.last_updated_date,
    },
  });
  const contactAvailable = Boolean(contact.practice_phone || contact.practice_address_1);
  return {
    provider: compactObject({
      npi: provider.npi,
      name: provider.name,
      credential: cleanString(provider.credential),
      enumeration_type: enumerationType,
      taxonomy: cleanString(provider.primary_taxonomy_description),
    }),
    requested_purpose: parsed.purpose,
    contact_available: contactAvailable,
    contact,
    contact_route_status: contactAvailable ? 'public_registry_unverified' : 'not_found_in_registry',
    outreach_authority_status: 'not_established',
    advertising_eligibility_status: 'not_established',
    recruiting_readiness_impact: 'none',
    direct_outreach_status: 'operator_review_required',
    contact_limitation: 'Public NPPES contact fields may be personal, residential, stale, or shared. Their presence does not establish consent, current employment, availability, advertising eligibility, or recruiting readiness. An operator must validate the route and apply the governing outreach policy before use.',
  };
}

export async function enrichProviderProfessionalContact(input: z.input<typeof providerEnrichmentSchema>, options: HealthcareClientOptions) {
  const parsed = providerEnrichmentSchema.parse(input);
  const exaApiKey = options.exaApiKey?.trim();
  if (!exaApiKey) throw new Error('EXA_API_KEY is not configured for the healthcare MCP. Use the no-cost get_provider_contact_information tool instead, or configure Exa before requesting paid enrichment.');
  const data = await fetchHealthcareMarket('npg-family-np-nationwide', { npi: parsed.npi, limit: '1' }, options);
  const provider = data.providers[0];
  if (!provider) throw new Error(`NPI ${parsed.npi} was not found in the nationwide Family Nurse Practitioner snapshot.`);
  const requestedEmail = parsed.contact_types.includes('email');
  const requestedPhone = parsed.contact_types.includes('phone');
  const contactProperties: Record<string, unknown> = {};
  if (requestedEmail) contactProperties.professional_email = { type: ['string', 'null'], format: 'email' };
  if (requestedPhone) contactProperties.professional_phone = { type: ['string', 'null'], format: 'phone' };
  const outputSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
      'match_status', 'identity_reason', 'professional_profile_url',
      'evidence_summary', ...Object.keys(contactProperties),
    ],
    properties: {
      match_status: { type: 'string', enum: ['verified_match', 'plausible_match', 'ambiguous', 'no_match'] },
      identity_reason: { type: 'string', maxLength: 600 },
      professional_profile_url: { type: ['string', 'null'], format: 'uri' },
      ...contactProperties,
      evidence_summary: { type: ['string', 'null'], maxLength: 600 },
    },
  };
  const createBody = {
    query: 'Find public professional profile and requested professional contact candidates for exactly the one healthcare practitioner in input.data. Resolve identity using the NPI, full name, Family Nurse Practitioner taxonomy, and listed market. Do not return residential addresses. Use verified_match only when evidence connects the source to this exact practitioner; otherwise use plausible_match, ambiguous, or no_match. Unsupported fields must be null.',
    systemPrompt: 'Return only source-grounded professional information for the one supplied practitioner. Never infer employment, availability, interest, consent, advertising eligibility, or recruiting readiness. Prefer official employer, licensing, professional association, and clearly attributable professional profile sources. Treat name-only similarity as ambiguous.',
    effort: 'minimal',
    input: { data: [{
      npi: provider.npi,
      name: provider.name,
      taxonomy: cleanString(provider.primary_taxonomy_description),
      city: cleanString(provider.practice_city),
      state: cleanString(provider.practice_state),
    }] },
    outputSchema,
  };
  const run = await createAndAwaitExaRun(createBody, exaApiKey, options);
  const structuredResult = exaStructuredOutputSchema.safeParse(run.output?.structured);
  if (!structuredResult.success) {
    const reportedCost = typeof run.costDollars?.total === 'number'
      ? ` Reported cost: $${run.costDollars.total.toFixed(3)}.`
      : '';
    throw new Error(`Exa Agent run ${run.id} completed but returned unusable structured output.${reportedCost} No contact result was accepted; do not retry until the completed run is reviewed in Exa.`);
  }
  const structured = structuredResult.data;
  const normalizedCitations = Array.isArray(run.output?.grounding)
    ? run.output.grounding.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
  const matchAllowsCandidate = structured.match_status === 'verified_match' || structured.match_status === 'plausible_match';
  const sourceCitations = matchAllowsCandidate
    ? collectGroundedCitationUrls(normalizedCitations, provider.npi, requestedPhone)
    : [];
  const acceptedProfileUrl = matchAllowsCandidate
    ? cleanPublicHttpsUrl(structured.professional_profile_url, provider.npi, requestedPhone)
    : undefined;
  const acceptedEmail = matchAllowsCandidate && requestedEmail ? structured.professional_email : undefined;
  const acceptedPhone = matchAllowsCandidate && requestedPhone ? cleanProfessionalPhone(structured.professional_phone) : undefined;
  const hasCandidate = Boolean(acceptedEmail || acceptedPhone);
  const estimatedMaxCostUsd = 0.012 + (requestedEmail ? 0.02 : 0) + (requestedPhone ? 0.07 : 0);
  return {
    provider: compactObject({ npi: provider.npi, name: provider.name, taxonomy: cleanString(provider.primary_taxonomy_description) }),
    requested_purpose: parsed.purpose,
    requested_contact_types: parsed.contact_types,
    match_status: structured.match_status,
    identity_reason: safeIdentityReason(structured.match_status),
    professional_contact: compactObject({
      profile_url: acceptedProfileUrl ?? undefined,
      email: acceptedEmail ?? undefined,
      phone: acceptedPhone ?? undefined,
    }),
    evidence_summary: `Exa returned ${sourceCitations.length} validated citation URL${sourceCitations.length === 1 ? '' : 's'} for operator review.`,
    source_citations: sourceCitations,
    contact_route_status: hasCandidate ? 'unverified_enrichment_candidate' : 'no_contact_candidate_found',
    identity_verification_status: structured.match_status === 'verified_match' && hasGroundedSourceUrl(sourceCitations) ? 'source_grounded' : 'operator_review_required',
    outreach_authority_status: 'not_established',
    advertising_eligibility_status: 'not_established',
    recruiting_readiness_impact: 'none',
    estimated_max_cost_usd: Number(estimatedMaxCostUsd.toFixed(3)),
    actual_cost_usd: typeof run.costDollars?.total === 'number' ? run.costDollars.total : undefined,
    usage: sanitizeExaUsage(run.usage),
    enrichment_limitation: 'Exa enrichment returns source-backed professional contact candidates, not verified ownership, current employment, availability, consent, advertising eligibility, or recruiting readiness. An operator must resolve identity and validate the route before any use.',
  };
}

function hasGroundedSourceUrl(value: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (Array.isArray(value)) return value.some((item) => hasGroundedSourceUrl(item, depth + 1));
  if (!value || typeof value !== 'object') return false;
  const citation = value as Record<string, unknown>;
  if (typeof citation.url === 'string' && isUsableHttpsUrl(citation.url)) return true;
  return Array.isArray(citation.citations) && hasGroundedSourceUrl(citation.citations, depth + 1);
}

function collectGroundedCitationUrls(
  value: unknown,
  allowedNpi: string,
  allowPhone: boolean,
  depth = 0,
  seen = new Set<string>(),
): Array<{ url: string }> {
  if (depth > 6) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectGroundedCitationUrls(item, allowedNpi, allowPhone, depth + 1, seen));
  }
  if (!value || typeof value !== 'object') return [];
  const citation = value as Record<string, unknown>;
  const results: Array<{ url: string }> = [];
  const safeUrl = cleanPublicHttpsUrl(citation.url, allowedNpi, allowPhone);
  if (safeUrl && !seen.has(safeUrl)) {
    seen.add(safeUrl);
    results.push({ url: safeUrl });
  }
  if (Array.isArray(citation.citations)) {
    results.push(...collectGroundedCitationUrls(citation.citations, allowedNpi, allowPhone, depth + 1, seen));
  }
  return results;
}

function cleanPublicHttpsUrl(value: unknown, allowedNpi: string, allowPhone: boolean): string | undefined {
  if (typeof value !== 'string' || !isUsableHttpsUrl(value)) return undefined;
  const url = new URL(value);
  if (url.search || url.hash) return undefined;
  let decodedPathname: string;
  try { decodedPathname = decodeURIComponent(url.pathname); } catch { return undefined; }
  if (/@/.test(decodedPathname)) return undefined;
  if (!allowPhone) {
    const phoneLikeTokens = `${url.hostname}${decodedPathname}`.match(/\+?\d[\d().\s\/-]{6,}\d/g) ?? [];
    if (phoneLikeTokens.some((token) => token.replace(/\D/g, '') !== allowedNpi)) return undefined;
  }
  return url.toString();
}

function sanitizeExaUsage(value: Record<string, unknown> | undefined): Record<string, number> | undefined {
  if (!value) return undefined;
  const allowedKeys = ['agentComputeUnits', 'searches', 'emails', 'phoneNumbers'] as const;
  const entries = allowedKeys.flatMap((key) => {
    const count = value[key];
    return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? [[key, count] as const] : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function isUsableHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password;
  } catch {
    return false;
  }
}

function cleanProfessionalPhone(value: string | null | undefined): string | undefined {
  const phone = cleanString(value);
  if (!phone) return undefined;
  const northAmericanPhone = /^(?:\+?1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?[2-9]\d{2}[\s.-]?\d{4}$/;
  return northAmericanPhone.test(phone) ? phone : undefined;
}

function safeIdentityReason(status: z.infer<typeof exaStructuredOutputSchema>['match_status']): string {
  if (status === 'verified_match') return 'Exa reported an exact identity match; verify it against the cited sources before use.';
  if (status === 'plausible_match') return 'Exa reported a plausible identity match; operator review of the cited sources is required.';
  if (status === 'ambiguous') return 'Exa reported ambiguous identity evidence; no contact candidate was accepted.';
  return 'Exa reported no identity match; no contact candidate was accepted.';
}

const requiredKinds = ['license_or_privilege', 'discipline', 'exclusion', 'practice_or_employment', 'contact_route', 'outreach_authority', 'recruiter_approval'];
function summarizeProvider(provider: HealthcareProvider, readiness?: HealthcareReadiness): Record<string, unknown> {
  const stage = readiness?.stage ?? 'coverage_candidate';
  return compactObject({
    npi: provider.npi, name: provider.name, credential: cleanString(provider.credential), status: cleanString(provider.status),
    last_updated_date: provider.last_updated_date, primary_taxonomy_description: cleanString(provider.primary_taxonomy_description),
    practice_city: cleanString(provider.practice_city), practice_state: cleanString(provider.practice_state),
    source_fetched_at: provider.source_fetched_at, recruiting_stage: stage,
    direct_outreach_status: stage === 'recruiter_ready' ? 'ready' : 'blocked',
    missing_evidence_kinds: readiness ? readiness.gates.filter((gate) => gate.status !== 'passed').map((gate) => gate.kind) : requiredKinds,
  });
}
function failClosedReadiness(npi: string, report: HealthcareCoverageReport): HealthcareReadiness {
  return { npi, stage: 'coverage_candidate', evaluated_at: report.evaluated_at, gates: requiredKinds.map((kind) => ({ kind, status: 'missing' })), blocking_reasons: ['Per-provider recruiting evidence was unavailable, so readiness remains fail-closed.'] };
}
function cleanString(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function compactObject(value: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)); }

async function fetchHealthcareMarket(marketId: HealthcareMarketId, params: Record<string, string | undefined>, options: HealthcareClientOptions): Promise<HealthcareApiResponse['data']> {
  const market = NPG_HEALTHCARE_MARKETS.find((candidate) => candidate.id === marketId)!;
  const agencyApiKey = options.agencyApiKey?.trim();
  if (!agencyApiKey) throw new Error('AGENCY_INTERNAL_API_KEY is not configured for the healthcare MCP.');
  const baseUrl = (options.agencyBaseUrl?.trim() || DEFAULT_AGENCY_BASE_URL).replace(/\/$/, '');
  const url = new URL(`${baseUrl}/api/abundance/healthcare-providers/nationwide`);
  if ('state' in market && market.state) url.searchParams.set('state', market.state);
  if ('city' in market && market.city) url.searchParams.set('city', market.city);
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, value);
  const response = await (options.fetchFn ?? fetch)(url, { headers: { Authorization: `Bearer ${agencyApiKey}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`Agency healthcare API returned HTTP ${response.status}: ${text.slice(0, 300)}`);
  let payload: HealthcareApiResponse;
  try { payload = JSON.parse(text) as HealthcareApiResponse; } catch { throw new Error('Agency healthcare API returned invalid JSON.'); }
  if (!payload.success || !payload.data?.report || !Array.isArray(payload.data.providers)) throw new Error('Agency healthcare API returned a malformed nationwide coverage response.');
  return payload.data;
}

interface ExaAgentRun {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  stopReason?: string | null;
  output?: { structured?: unknown; grounding?: unknown[] };
  usage?: Record<string, unknown>;
  costDollars?: { total?: number; [key: string]: unknown };
}

class ExaRequestTimeoutError extends Error {}

class ExaRunHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ExaRunHttpError';
  }
}

async function createAndAwaitExaRun(body: Record<string, unknown>, apiKey: string, options: HealthcareClientOptions): Promise<ExaAgentRun> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = (options.exaAgentBaseUrl?.trim() || DEFAULT_EXA_AGENT_BASE_URL).replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey };
  const timeoutMs = Math.min(Math.max(options.exaTimeoutMs ?? 45_000, 1_000), 55_000);
  const overallDeadline = Date.now() + timeoutMs;
  const cleanupReserveMs = Math.min(1_000, Math.max(100, Math.floor(timeoutMs * 0.2)));
  const executionDeadline = overallDeadline - cleanupReserveMs;
  let run: ExaAgentRun;
  try {
    run = await fetchAndReadExaRun(
      fetchFn,
      `${baseUrl}/agent/runs`,
      { method: 'POST', headers, body: JSON.stringify(body) },
      Math.min(Math.max(executionDeadline - Date.now(), 1), 15_000),
      'create',
    );
  } catch (error) {
    if (error instanceof ExaRunHttpError && error.status >= 400 && error.status < 500) {
      throw error;
    }
    throw new Error('Exa Agent create result is indeterminate. A paid run may be active, but no run ID was received; do not retry until the Exa dashboard is reviewed.');
  }
  if (run.status === 'completed') return run;
  if (run.status === 'failed' || run.status === 'cancelled') {
    throw new Error(formatTerminalExaRunError(run));
  }
  const pollIntervalMs = Math.min(Math.max(options.exaPollIntervalMs ?? 1_000, 100), 5_000);
  const waitFn = options.waitFn ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  while (Date.now() < executionDeadline) {
    await waitFn(Math.min(pollIntervalMs, Math.max(executionDeadline - Date.now(), 0)));
    const remainingMs = executionDeadline - Date.now();
    if (remainingMs <= 0) break;
    try {
      run = await fetchAndReadExaRun(
        fetchFn,
        `${baseUrl}/agent/runs/${encodeURIComponent(run.id)}`,
        { headers: { 'x-api-key': apiKey } },
        Math.min(remainingMs, 10_000),
        'poll',
      );
    } catch {
      const cancellationConfirmed = await cancelExaRun(fetchFn, baseUrl, run.id, apiKey, overallDeadline - Date.now());
      if (cancellationConfirmed) {
        throw new Error('Exa Agent polling failed and the paid run was cancelled. Retry later or use the no-cost registry contact tool.');
      }
      throw new Error('Exa Agent polling failed, and cancellation could not be confirmed. The paid run may still be active; do not retry until its Exa run status is reviewed.');
    }
    if (run.status === 'completed') return run;
    if (run.status === 'failed' || run.status === 'cancelled') {
      throw new Error(formatTerminalExaRunError(run));
    }
  }
  const cancellationConfirmed = await cancelExaRun(fetchFn, baseUrl, run.id, apiKey, overallDeadline - Date.now());
  if (cancellationConfirmed) {
    throw new Error(`Exa Agent enrichment did not complete within ${timeoutMs}ms and was cancelled. Retry later or use the no-cost registry contact tool.`);
  }
  throw new Error(`Exa Agent enrichment did not complete within ${timeoutMs}ms, and cancellation could not be confirmed. The paid run may still be active; do not retry until its Exa run status is reviewed.`);
}

function formatTerminalExaRunError(run: ExaAgentRun): string {
  const reportedCost = typeof run.costDollars?.total === 'number'
    ? ` Reported cost: $${run.costDollars.total.toFixed(3)}.`
    : '';
  return `Exa Agent run ${run.id} ended with terminal status ${run.status}.${reportedCost} No contact result was accepted; do not retry until the terminal run is reviewed in Exa.`;
}

async function fetchAndReadExaRun(
  fetchFn: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number,
  operation: 'create' | 'poll',
): Promise<ExaAgentRun> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new ExaRequestTimeoutError(`Exa Agent ${operation} timed out.`));
      controller.abort();
    }, Math.max(timeoutMs, 1));
  });
  try {
    return await Promise.race([
      (async () => readExaRun(await fetchFn(input, { ...init, signal: controller.signal }), operation))(),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchWithTimeout(
  fetchFn: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new ExaRequestTimeoutError('Exa Agent request timed out.'));
      controller.abort();
    }, Math.max(timeoutMs, 1));
  });
  try {
    return await Promise.race([
      fetchFn(input, { ...init, signal: controller.signal }),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function cancelExaRun(
  fetchFn: typeof fetch,
  baseUrl: string,
  runId: string,
  apiKey: string,
  timeoutMs: number,
): Promise<boolean> {
  if (timeoutMs <= 0) return false;
  try {
    const cancellation = await fetchWithTimeout(
      fetchFn,
      `${baseUrl}/agent/runs/${encodeURIComponent(runId)}/cancel`,
      { method: 'POST', headers: { 'x-api-key': apiKey } },
      timeoutMs,
    );
    return cancellation.ok;
  } catch {
    return false;
  }
}

async function readExaRun(response: Response, operation: 'create' | 'poll'): Promise<ExaAgentRun> {
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    throw new ExaRunHttpError(
      response.status,
      `Exa Agent ${operation} returned HTTP ${response.status}${requestId ? ` (request ${requestId})` : ''}. No contact result was accepted.`,
    );
  }
  let payload: unknown;
  try { payload = await response.json(); } catch { throw new Error(`Exa Agent ${operation} returned invalid JSON.`); }
  if (!payload || typeof payload !== 'object') throw new Error(`Exa Agent ${operation} returned a malformed run.`);
  const run = payload as Partial<ExaAgentRun>;
  if (typeof run.id !== 'string' || !['queued', 'running', 'completed', 'failed', 'cancelled'].includes(run.status ?? '')) {
    throw new Error(`Exa Agent ${operation} returned a malformed run.`);
  }
  return run as ExaAgentRun;
}

export function createAbundanceHealthcareServer(options: HealthcareClientOptions): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerAbundanceHealthcareTools(server, options);
  return server;
}
export function registerAbundanceHealthcareTools(server: McpServer, options: HealthcareClientOptions): void {
  server.resource('abundance-healthcare-status', 'abundance-healthcare://status', { description: 'Healthcare MCP status and approved NPG market IDs. Contains no secret values.', mimeType: 'application/json' }, async () => ({ contents: [{ uri: 'abundance-healthcare://status', mimeType: 'application/json', text: JSON.stringify({ name: SERVER_NAME, version: SERVER_VERSION, tools: ['list_healthcare_markets', 'get_healthcare_coverage', 'search_coverage_candidates', 'get_healthcare_practitioner', 'get_provider_contact_information', 'enrich_provider_professional_contact'], market_ids: NPG_HEALTHCARE_MARKETS.map((market) => market.id), coverage_model: 'monthly_full_plus_weekly_incremental', refresh_policy: 'weekly_default_daily_locale_opt_in', contact_enrichment_policy: 'owned_registry_first_explicit_paid_exa_fallback' }, null, 2) }] }));
  server.registerTool('list_healthcare_markets', { description: 'List nationwide and approved derived NPG healthcare views with source freshness and outreach status. Read-only.', inputSchema: z.object({}).strict(), annotations: readOnlyAnnotations() }, async () => structuredJson(await listHealthcareMarkets(options)));
  server.registerTool('search_coverage_candidates', { description: 'Search the nationwide Family NP snapshot by optional US state and city, or search an approved named local view. Results are bounded and omit practice phone and street address. Read-only.', inputSchema: searchCandidatesSchema, annotations: readOnlyAnnotations() }, async (input) => structuredJson(await searchCoverageCandidates(input, options)));
  server.registerTool('get_healthcare_practitioner', { description: 'Read one practitioner by NPI, including public NPPES practice fields and fail-closed evidence gates. Read-only.', inputSchema: practitionerSchema, annotations: readOnlyAnnotations() }, async (input) => structuredJson(await getHealthcarePractitioner(input, options)));
  server.registerTool('get_provider_contact_information', { description: 'Read public NPPES phone and address fields for one exact Family NP NPI. Classifies individual records as possibly personal or residential and never establishes consent, employment, advertising eligibility, or recruiting readiness. Read-only.', inputSchema: providerContactSchema, outputSchema: providerContactOutputSchema, annotations: readOnlyAnnotations() }, async (input) => structuredJson(await getProviderContactInformation(input, options)));
  server.registerTool('enrich_provider_professional_contact', { description: 'Run one bounded paid Exa Agent lookup for an exact Family NP NPI when registry contact is missing or unsuitable. Requires explicit paid-enrichment confirmation, requests at most one email and one phone, returns citations, and never establishes consent, employment, advertising eligibility, or recruiting readiness.', inputSchema: providerEnrichmentSchema, outputSchema: providerEnrichmentOutputSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } }, async (input) => structuredJson(await enrichProviderProfessionalContact(input, options)));
  server.registerTool('get_healthcare_coverage', { description: 'Read aggregate nationwide or derived-local coverage, snapshot provenance, and fail-closed recruiting state. Read-only.', inputSchema: z.object({ market_id: marketIdSchema }).strict(), annotations: readOnlyAnnotations() }, async (input) => structuredJson(await getHealthcareCoverage(input, options)));
}
function readOnlyAnnotations() { return { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const; }
function structuredJson(data: Record<string, unknown>): CallToolResult { return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data }; }
