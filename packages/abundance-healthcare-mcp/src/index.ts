import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export const SERVER_NAME = 'abundance-healthcare-mcp';
export const SERVER_VERSION = '1.1.0';
export const DEFAULT_AGENCY_BASE_URL = 'https://createsomething.agency';

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
export interface HealthcareClientOptions { agencyApiKey?: string; agencyBaseUrl?: string; fetchFn?: typeof fetch }

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
const searchCandidatesSchema = z.object({
  market_id: marketIdSchema,
  name: z.string().trim().min(1).max(100).optional(),
  updated_since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').optional(),
  readiness_state: z.enum(['coverage_candidate', 'recruiter_ready']).optional(),
  limit: z.number().int().min(1).max(25).default(10),
  offset: z.number().int().min(0).max(1_000_000).default(0),
}).strict();
const practitionerSchema = z.object({ market_id: marketIdSchema, npi: z.string().regex(/^\d{10}$/, 'NPI must contain exactly 10 digits.') }).strict();
export type SearchCoverageCandidatesInput = z.input<typeof searchCandidatesSchema>;

export async function getHealthcareCoverage(input: { market_id: HealthcareMarketId }, options: HealthcareClientOptions) {
  return fetchHealthcareMarket(marketIdSchema.parse(input.market_id), {}, options);
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
  const data = await fetchHealthcareMarket(parsed.market_id, {
    name: parsed.name, updated_since: parsed.updated_since, limit: String(parsed.limit), offset: String(parsed.offset),
  }, options);
  const readinessByNpi = new Map(data.readiness.map((item) => [item.npi, item]));
  const results = data.providers
    .filter((provider) => !parsed.readiness_state || (readinessByNpi.get(provider.npi)?.stage ?? 'coverage_candidate') === parsed.readiness_state)
    .map((provider) => summarizeProvider(provider, readinessByNpi.get(provider.npi)));
  return {
    market_id: parsed.market_id,
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
    contact_limitation: 'The NPPES practice telephone and address are organization-level practice fields. They do not prove a personal recruiting route, current employment, availability, or outreach consent.',
  };
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

export function createAbundanceHealthcareServer(options: HealthcareClientOptions): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerAbundanceHealthcareTools(server, options);
  return server;
}
export function registerAbundanceHealthcareTools(server: McpServer, options: HealthcareClientOptions): void {
  server.resource('abundance-healthcare-status', 'abundance-healthcare://status', { description: 'Healthcare MCP status and approved NPG market IDs. Contains no secret values.', mimeType: 'application/json' }, async () => ({ contents: [{ uri: 'abundance-healthcare://status', mimeType: 'application/json', text: JSON.stringify({ name: SERVER_NAME, version: SERVER_VERSION, tools: ['list_healthcare_markets', 'get_healthcare_coverage', 'search_coverage_candidates', 'get_healthcare_practitioner'], market_ids: NPG_HEALTHCARE_MARKETS.map((market) => market.id), coverage_model: 'monthly_full_plus_weekly_incremental', refresh_policy: 'weekly_default_daily_locale_opt_in' }, null, 2) }] }));
  server.registerTool('list_healthcare_markets', { description: 'List nationwide and approved derived NPG healthcare views with source freshness and outreach status. Read-only.', inputSchema: z.object({}).strict(), annotations: readOnlyAnnotations() }, async () => structuredJson(await listHealthcareMarkets(options)));
  server.registerTool('search_coverage_candidates', { description: 'Search the nationwide Family NP snapshot or an approved local view. Results are bounded and omit practice phone and street address. Read-only.', inputSchema: searchCandidatesSchema, annotations: readOnlyAnnotations() }, async (input) => structuredJson(await searchCoverageCandidates(input, options)));
  server.registerTool('get_healthcare_practitioner', { description: 'Read one practitioner by NPI, including public NPPES practice fields and fail-closed evidence gates. Read-only.', inputSchema: practitionerSchema, annotations: readOnlyAnnotations() }, async (input) => structuredJson(await getHealthcarePractitioner(input, options)));
  server.registerTool('get_healthcare_coverage', { description: 'Read aggregate nationwide or derived-local coverage, snapshot provenance, and fail-closed recruiting state. Read-only.', inputSchema: z.object({ market_id: marketIdSchema }).strict(), annotations: readOnlyAnnotations() }, async (input) => structuredJson(await getHealthcareCoverage(input, options)));
}
function readOnlyAnnotations() { return { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const; }
function structuredJson(data: Record<string, unknown>): CallToolResult { return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data }; }
