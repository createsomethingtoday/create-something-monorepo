import { ingestInboundJob } from './abundance-inbound-jobs';
import { getComposioClient, type PlatformEnv } from './partner-auth';
import type { InboundJob } from '../types/abundance';

const ADZUNA_API_BASE_URL = 'https://api.adzuna.com/v1/api';
const ADZUNA_DEFAULT_COUNTRY = 'us';
const ADZUNA_DEFAULT_RESULTS = 20;
const ADZUNA_MAX_RESULTS = 50;
const EXA_DEFAULT_RESULTS = 10;
const EXA_MAX_RESULTS = 25;
const EXA_TOOLKIT = 'exa';
const DEFAULT_PUBLIC_JOB_QUERY = 'travel nurse';
const DEFAULT_EXA_DOMAINS = [
	'ayahealthcare.com',
	'nomadhealth.com',
	'trustedhealth.com',
	'amnhealthcare.com'
];

interface AdzunaSearchResponse {
	results?: AdzunaJob[];
}

interface AdzunaJob {
	id?: string | number;
	title?: string;
	description?: string;
	redirect_url?: string;
	created?: string;
	salary_min?: number;
	salary_max?: number;
	contract_type?: string;
	contract_time?: string;
	company?: {
		display_name?: string;
	};
	location?: {
		display_name?: string;
		area?: string[];
	};
	category?: {
		label?: string;
		tag?: string;
	};
}

interface ToolkitToolDef {
	slug: string;
	name: string;
	description: string;
	parameters: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
}

interface ResolvedToolkitRoute {
	slug: string;
	name: string;
	parameters: ToolkitToolDef['parameters'];
}

export type PublicJobImportSource = 'adzuna' | 'exa';

export interface PublicJobImportInput {
	db: D1Database;
	env: PlatformEnv;
	source: PublicJobImportSource;
	query?: string | null;
	location?: string | null;
	country?: string | null;
	limit?: number;
	page?: number;
	domains?: string[];
	sourceRunId?: string | null;
}

export interface PublicJobImportResult {
	source: PublicJobImportSource;
	query: string;
	fetched: number;
	created: number;
	duplicate: number;
	jobs: InboundJob[];
	warnings: string[];
}

interface PublicJobsConfig {
	adzuna: {
		appId: string | null;
		appKey: string | null;
	};
	exa: {
		userId: string | null;
		connectedAccountId: string | null;
		toolSlug: string | null;
	};
}

const toolkitToolCache = new Map<string, Promise<ToolkitToolDef[]>>();

export function getPublicJobsConfig(env: PlatformEnv): PublicJobsConfig {
	return {
		adzuna: {
			appId: normalizeNullableString(env.ABUNDANCE_ADZUNA_APP_ID),
			appKey: normalizeNullableString(env.ABUNDANCE_ADZUNA_APP_KEY)
		},
		exa: {
			userId:
				normalizeNullableString(env.ABUNDANCE_COMPOSIO_USER_ID) ??
				normalizeNullableString(env.FUNNEL_AUTOMATION_COMPOSIO_USER_ID),
			connectedAccountId: normalizeNullableString(env.ABUNDANCE_EXA_CONNECTED_ACCOUNT_ID),
			toolSlug: normalizeNullableString(env.ABUNDANCE_EXA_TOOL_SLUG)
		}
	};
}

export async function importPublicJobs(input: PublicJobImportInput): Promise<PublicJobImportResult> {
	if (input.source === 'adzuna') {
		return importAdzunaJobs(input);
	}

	return importExaJobs(input);
}

export async function importAdzunaJobs(input: Omit<PublicJobImportInput, 'source'>): Promise<PublicJobImportResult> {
	const config = getPublicJobsConfig(input.env);
	if (!config.adzuna.appId || !config.adzuna.appKey) {
		throw new Error('ABUNDANCE_ADZUNA_APP_ID and ABUNDANCE_ADZUNA_APP_KEY are required for Adzuna imports.');
	}

	const query = normalizeNullableString(input.query) ?? DEFAULT_PUBLIC_JOB_QUERY;
	const country = normalizeCountry(input.country);
	const page = clampPositiveInt(input.page, 1);
	const resultsPerPage = clampPositiveInt(input.limit, ADZUNA_DEFAULT_RESULTS, ADZUNA_MAX_RESULTS);
	const sourceRunId =
		normalizeNullableString(input.sourceRunId) ??
		`adzuna:${country}:${page}:${new Date().toISOString()}`;
	const warnings: string[] = [];

	const params = new URLSearchParams({
		app_id: config.adzuna.appId,
		app_key: config.adzuna.appKey,
		results_per_page: String(resultsPerPage),
		sort_by: 'date',
		what: query,
		'content-type': 'application/json'
	});

	const location = normalizeNullableString(input.location);
	if (location) {
		params.set('where', location);
	}

	const response = await fetch(`${ADZUNA_API_BASE_URL}/jobs/${country}/search/${page}?${params.toString()}`, {
		headers: {
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Adzuna import failed with ${response.status} ${response.statusText}`);
	}

	const payload = (await response.json()) as AdzunaSearchResponse;
	const jobs = Array.isArray(payload.results) ? payload.results : [];

	if (jobs.length === 0) {
		warnings.push('Adzuna returned no listings for the current query.');
	}

	const results = await Promise.all(
		jobs
			.filter((job) => normalizeNullableString(job.title))
			.map((job) =>
				ingestInboundJob(
					input.db,
					mapAdzunaJobToInboundJob(job, {
						query,
						sourceRunId
					})
				)
			)
	);

	return buildImportResult('adzuna', query, warnings, results);
}

export async function importExaJobs(input: Omit<PublicJobImportInput, 'source'>): Promise<PublicJobImportResult> {
	const config = getPublicJobsConfig(input.env);
	if (!config.exa.userId) {
		throw new Error(
			'ABUNDANCE_COMPOSIO_USER_ID (or FUNNEL_AUTOMATION_COMPOSIO_USER_ID) is required for Exa imports.'
		);
	}

	const query = normalizeNullableString(input.query) ?? DEFAULT_PUBLIC_JOB_QUERY;
	const includeDomains = sanitizeDomains(input.domains);
	const searchDomains = includeDomains.length > 0 ? includeDomains : DEFAULT_EXA_DOMAINS;
	const sourceRunId =
		normalizeNullableString(input.sourceRunId) ??
		`exa:${searchDomains.join('|')}:${new Date().toISOString()}`;
	const route = await resolveToolkitRoute(input.env, EXA_TOOLKIT, {
		requiredParams: ['query'],
		preferredSlugs: [config.exa.toolSlug ?? '', 'exa_search', 'EXA_SEARCH'],
		phrases: [['search'], ['exa', 'search']]
	});

	const payload = await executeComposioTool(
		input.env,
		route.slug,
		{
			query,
			numResults: clampPositiveInt(input.limit, EXA_DEFAULT_RESULTS, EXA_MAX_RESULTS),
			type: 'neural',
			useAutoprompt: true,
			includeDomains: searchDomains
		},
		config.exa.userId,
		config.exa.connectedAccountId ?? undefined
	);

	const searchResults = extractExaResults(payload);
	const warnings: string[] = [];
	if (searchResults.length === 0) {
		warnings.push('Exa returned no public job listings for the current query.');
	}

	const results = await Promise.all(
		searchResults
			.filter((result) => normalizeNullableString(result.title) && normalizeNullableString(result.url))
			.map((result) =>
				ingestInboundJob(
					input.db,
					mapExaResultToInboundJob(result, {
						query,
						sourceRunId
					})
				)
			)
	);

	return buildImportResult('exa', query, warnings, results);
}

function buildImportResult(
	source: PublicJobImportSource,
	query: string,
	warnings: string[],
	results: Array<{ job: InboundJob; created: boolean; duplicate: boolean }>
): PublicJobImportResult {
	return {
		source,
		query,
		fetched: results.length,
		created: results.filter((result) => result.created).length,
		duplicate: results.filter((result) => result.duplicate).length,
		jobs: results.map((result) => result.job),
		warnings
	};
}

export function mapAdzunaJobToInboundJob(
	job: AdzunaJob,
	context: { query: string; sourceRunId: string }
) {
	const title = normalizeNullableString(job.title) ?? 'Public job listing';
	const description = normalizeNullableString(job.description) ?? '';
	const combinedText = [title, description].filter(Boolean).join(' ');
	const pay = extractPayRange(combinedText, {
		defaultMin: normalizeNullableNumber(job.salary_min),
		defaultMax: normalizeNullableNumber(job.salary_max),
		defaultPeriod: job.salary_min || job.salary_max ? 'year' : null
	});

	return {
		source_agent: 'public-adzuna',
		source_run_id: context.sourceRunId,
		source_system: 'adzuna',
		external_job_id: job.id === undefined ? undefined : String(job.id),
		job_url: normalizeNullableString(job.redirect_url) ?? undefined,
		employer: normalizeNullableString(job.company?.display_name) ?? undefined,
		location: normalizeNullableString(job.location?.display_name) ?? undefined,
		title,
		category:
			normalizeNullableString(job.category?.label) ??
			normalizeNullableString(job.category?.tag) ??
			undefined,
		specialty: extractNurseSpecialty(combinedText) ?? undefined,
		employment_type: normalizeEmploymentType(job.contract_type, job.contract_time) ?? undefined,
		pay_min: pay.payMin ?? undefined,
		pay_max: pay.payMax ?? undefined,
		pay_period: pay.payPeriod ?? undefined,
		shift: extractShift(combinedText) ?? undefined,
		duration_weeks: extractDurationWeeks(combinedText) ?? undefined,
		start_date: extractStartDate(combinedText) ?? undefined,
		openings: extractOpenings(combinedText) ?? undefined,
		source_posted_at: normalizeNullableDateString(job.created) ?? undefined,
		raw_payload: {
			query: context.query,
			...job
		}
	};
}

export function mapExaResultToInboundJob(
	result: Record<string, unknown>,
	context: { query: string; sourceRunId: string }
) {
	const title = normalizeNullableString(result.title) ?? 'Public job listing';
	const url = normalizeNullableString(result.url);
	const text = [
		title,
		normalizeNullableString(result.snippet),
		normalizeNullableString(result.text),
		normalizeNullableString(result.description)
	]
		.filter(Boolean)
		.join(' ');
	const pay = extractPayRange(text);

	return {
		source_agent: 'public-exa',
		source_run_id: context.sourceRunId,
		source_system: 'exa',
		external_job_id: normalizeNullableString(result.id) ?? url ?? undefined,
		job_url: url ?? undefined,
		employer: inferEmployerFromUrl(url) ?? undefined,
		location: extractLocation(text) ?? undefined,
		title,
		category: 'Public job discovery',
		specialty: extractNurseSpecialty(text) ?? undefined,
		pay_min: pay.payMin ?? undefined,
		pay_max: pay.payMax ?? undefined,
		pay_period: pay.payPeriod ?? undefined,
		shift: extractShift(text) ?? undefined,
		duration_weeks: extractDurationWeeks(text) ?? undefined,
		start_date: extractStartDate(text) ?? undefined,
		openings: extractOpenings(text) ?? undefined,
		source_posted_at:
			normalizeNullableDateString(result.publishedDate) ??
			normalizeNullableDateString(result.published_date) ??
			undefined,
		raw_payload: {
			query: context.query,
			...result
		}
	};
}

function extractExaResults(payload: Record<string, unknown>): Record<string, unknown>[] {
	const candidates = [
		payload.results,
		isPlainObject(payload.data) ? payload.data.results : null,
		isPlainObject(payload.result) ? payload.result.results : null,
		payload.searchResults
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate.filter(isPlainObject);
		}
	}

	return [];
}

export function extractNurseSpecialty(text: string): string | null {
	const specialties = [
		{ label: 'ER', patterns: [/\ber\b/i, /emergency room/i, /emergency department/i] },
		{ label: 'ICU', patterns: [/\bicu\b/i, /intensive care/i] },
		{ label: 'PICU', patterns: [/\bpicu\b/i] },
		{ label: 'NICU', patterns: [/\bnicu\b/i] },
		{ label: 'Telemetry', patterns: [/\btelemetry\b/i, /\bms\/tele\b/i, /med surg tele/i, /med surg\/tele/i] },
		{ label: 'Med Surg', patterns: [/med surg/i, /med-surg/i, /medical surgical/i] },
		{ label: 'Labor & Delivery', patterns: [/labor\s*&\s*delivery/i, /labour\s*&\s*delivery/i, /\bl&d\b/i] },
		{ label: 'OR', patterns: [/operating room/i, /perioperative/i, /\bor nurse\b/i] },
		{ label: 'PACU', patterns: [/\bpacu\b/i] },
		{ label: 'PCU', patterns: [/\bpcu\b/i, /progressive care/i] },
		{ label: 'Home Health', patterns: [/home health/i] },
		{ label: 'Skilled Nursing', patterns: [/skilled nursing/i, /\bsnf\b/i] }
	];

	for (const specialty of specialties) {
		if (specialty.patterns.some((pattern) => pattern.test(text))) {
			return specialty.label;
		}
	}

	const haystack = text.toLowerCase();
	return haystack.includes('travel nurse') || haystack.includes('registered nurse') ? 'RN' : null;
}

function normalizeEmploymentType(contractType: string | undefined, contractTime: string | undefined): string | null {
	const parts = [normalizeNullableString(contractType), normalizeNullableString(contractTime)].filter(Boolean);
	return parts.length > 0 ? parts.join(' / ') : null;
}

function extractShift(text: string): string | null {
	const match = text.match(
		/\b(days?|nights?|evenings?|rotating|weekends?|3x12(?:s)?|4x10(?:s)?|5x8(?:s)?)\b/i
	);
	return normalizeNullableString(match?.[0]);
}

function extractDurationWeeks(text: string): number | null {
	const match = text.match(/\b(\d{1,2})\s*weeks?\b/i);
	return match ? Number.parseInt(match[1], 10) : null;
}

function extractStartDate(text: string): string | null {
	const verbose = text.match(
		/\bstarts?\s+(?:on\s+)?([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})\b/i
	);
	if (verbose?.[1]) {
		return normalizeNullableDateString(verbose[1]);
	}

	const numeric = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
	if (numeric?.[1]) {
		return normalizeNullableDateString(numeric[1]);
	}

	return null;
}

function extractOpenings(text: string): number | null {
	const match = text.match(/\b(\d{1,2})\s+(?:openings?|positions?)\b/i);
	return match ? Number.parseInt(match[1], 10) : null;
}

function extractLocation(text: string): string | null {
	const match = text.match(/\b([A-Z][a-zA-Z.'-]+,\s*[A-Z]{2})\b/);
	return normalizeNullableString(match?.[1]);
}

function inferEmployerFromUrl(value: string | null): string | null {
	if (!value) {
		return null;
	}

	try {
		const hostname = new URL(value).hostname.replace(/^www\./, '');
		if (hostname.includes('ayahealthcare.com')) return 'Aya Healthcare';
		if (hostname.includes('trustedhealth.com')) return 'Trusted Health';
		if (hostname.includes('nomadhealth.com')) return 'Nomad Health';
		if (hostname.includes('amnhealthcare.com')) return 'AMN Healthcare';
		return hostname;
	} catch {
		return null;
	}
}

export function extractPayRange(
	text: string,
	defaults: { defaultMin?: number | null; defaultMax?: number | null; defaultPeriod?: string | null } = {}
): { payMin: number | null; payMax: number | null; payPeriod: string | null } {
	const rangeMatch = text.match(
		/\$(\d[\d,]*(?:\.\d{1,2})?)\s*(?:-|to)\s*\$?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/|\bper\b)?\s*(wk|week|weekly|hr|hour|hourly|mo|month|monthly|yr|year|yearly)\b/i
	);
	if (rangeMatch) {
		return {
			payMin: normalizeNullableNumber(rangeMatch[1]),
			payMax: normalizeNullableNumber(rangeMatch[2]),
			payPeriod: normalizePayPeriod(rangeMatch[3])
		};
	}

	const singleMatch = text.match(
		/\$(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/|\bper\b)?\s*(wk|week|weekly|hr|hour|hourly|mo|month|monthly|yr|year|yearly)\b/i
	);
	if (singleMatch) {
		const amount = normalizeNullableNumber(singleMatch[1]);
		return {
			payMin: amount,
			payMax: amount,
			payPeriod: normalizePayPeriod(singleMatch[2])
		};
	}

	return {
		payMin: defaults.defaultMin ?? null,
		payMax: defaults.defaultMax ?? null,
		payPeriod: normalizePayPeriod(defaults.defaultPeriod)
	};
}

function normalizePayPeriod(value: string | null | undefined): string | null {
	const normalized = normalizeNullableString(value)?.toLowerCase();
	if (!normalized) {
		return null;
	}

	if (normalized.startsWith('wk') || normalized.startsWith('week')) return 'week';
	if (normalized.startsWith('hr') || normalized.startsWith('hour')) return 'hour';
	if (normalized.startsWith('mo') || normalized.startsWith('month')) return 'month';
	if (normalized.startsWith('yr') || normalized.startsWith('year')) return 'year';
	return normalized;
}

async function resolveToolkitRoute(
	env: PlatformEnv,
	toolkit: string,
	input: {
		requiredParams?: string[];
		preferredSlugs: string[];
		phrases: string[][];
	}
): Promise<ResolvedToolkitRoute> {
	const tools = await listToolkitTools(env, toolkit);
	let bestMatch: { tool: ToolkitToolDef; score: number } | null = null;

	for (const tool of tools) {
		const haystack = `${tool.slug} ${tool.name} ${tool.description}`.toLowerCase();
		let score = 0;

		for (const phrase of input.phrases) {
			if (phrase.every((term) => haystack.includes(term.toLowerCase()))) {
				score = Math.max(score, phrase.length);
			}
		}

		if (input.requiredParams && !hasAnyParameter(tool.parameters, input.requiredParams)) {
			continue;
		}

		const preferenceIndex = input.preferredSlugs.findIndex(
			(slug) => slug && slug.toLowerCase() === tool.slug.toLowerCase()
		);
		if (preferenceIndex >= 0) {
			score += (input.preferredSlugs.length - preferenceIndex) * 100;
		}

		if (score > 0 && (!bestMatch || score > bestMatch.score)) {
			bestMatch = { tool, score };
		}
	}

	if (!bestMatch) {
		throw new Error(`Unable to resolve a Composio route for toolkit "${toolkit}".`);
	}

	return {
		slug: bestMatch.tool.slug,
		name: bestMatch.tool.name,
		parameters: bestMatch.tool.parameters
	};
}

async function listToolkitTools(env: PlatformEnv, toolkit: string): Promise<ToolkitToolDef[]> {
	const cacheKey = `${env.COMPOSIO_API_KEY ?? ''}::${env.COMPOSIO_BASE_URL ?? ''}::${toolkit}`;
	const cached = toolkitToolCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const promise = loadToolkitTools(env, toolkit);
	toolkitToolCache.set(cacheKey, promise);

	try {
		return await promise;
	} catch (error) {
		toolkitToolCache.delete(cacheKey);
		throw error;
	}
}

async function loadToolkitTools(env: PlatformEnv, toolkit: string): Promise<ToolkitToolDef[]> {
	const composio = getComposioClient(env);
	const raw = await (
		composio.tools as unknown as {
			getRawComposioTools: (args: Record<string, unknown>) => Promise<unknown>;
		}
	).getRawComposioTools({
		toolkits: [toolkit],
		important: false,
		limit: 250
	});

	const items: unknown[] = Array.isArray(raw)
		? [...raw]
		: Array.isArray((raw as Record<string, unknown>)?.items)
			? [...((raw as Record<string, unknown>).items as unknown[])]
			: [];

	return items
		.filter(isPlainObject)
		.map((tool) => ({
			slug: String(tool.slug ?? tool.enum ?? ''),
			name: String(tool.name ?? tool.displayName ?? tool.slug ?? ''),
			description: String(tool.description ?? ''),
			parameters: normalizeToolkitParameters(tool.inputParameters ?? tool.parameters)
		}))
		.filter((tool) => tool.slug.length > 0);
}

async function executeComposioTool(
	env: PlatformEnv,
	toolSlug: string,
	args: Record<string, unknown>,
	userId: string,
	connectedAccountId?: string
): Promise<Record<string, unknown>> {
	const composio = getComposioClient(env);
	const result = await (
		composio.tools as unknown as {
			execute: (
				slug: string,
				input: {
					userId: string;
					arguments: Record<string, unknown>;
					dangerouslySkipVersionCheck: boolean;
					connectedAccountId?: string;
				}
			) => Promise<unknown>;
		}
	).execute(toolSlug, {
		userId,
		arguments: args,
		dangerouslySkipVersionCheck: true,
		...(connectedAccountId ? { connectedAccountId } : {})
	});

	return isPlainObject(result) ? result : { result };
}

function hasAnyParameter(
	parameters: ToolkitToolDef['parameters'],
	requiredParams: string[]
): boolean {
	const properties = parameters.properties ?? {};
	return requiredParams.every((name) => name in properties);
}

function normalizeToolkitParameters(raw: unknown): ToolkitToolDef['parameters'] {
	if (!isPlainObject(raw)) {
		return {
			type: 'object',
			properties: {}
		};
	}

	const properties = isPlainObject(raw.properties) ? raw.properties : {};
	const required = Array.isArray(raw.required)
		? raw.required.filter((value): value is string => typeof value === 'string')
		: undefined;

	return {
		type: 'object',
		properties,
		...(required && required.length > 0 ? { required } : {})
	};
}

function normalizeCountry(value: string | null | undefined): string {
	const normalized = normalizeNullableString(value)?.toLowerCase();
	return normalized ?? ADZUNA_DEFAULT_COUNTRY;
}

function clampPositiveInt(value: number | undefined | null, fallback: number, max: number = Number.MAX_SAFE_INTEGER): number {
	if (!Number.isFinite(value)) {
		return fallback;
	}

	return Math.max(1, Math.min(Math.trunc(value as number), max));
}

function sanitizeDomains(domains: string[] | undefined): string[] {
	return (domains ?? [])
		.map((domain) => domain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, ''))
		.filter(Boolean);
}

function normalizeNullableString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized ? normalized : null;
}

function normalizeNullableNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim().replace(/[$,]/g, '');
	if (!normalized) {
		return null;
	}

	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableDateString(value: unknown): string | null {
	const normalized = normalizeNullableString(value);
	if (!normalized) {
		return null;
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		return normalized;
	}

	if (!/[tT:]/.test(normalized)) {
		const parsedDateOnly = new Date(normalized);
		if (!Number.isNaN(parsedDateOnly.getTime())) {
			return parsedDateOnly.toISOString().slice(0, 10);
		}
	}

	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
}

function isPlainObject(value: unknown): value is Record<string, any> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
