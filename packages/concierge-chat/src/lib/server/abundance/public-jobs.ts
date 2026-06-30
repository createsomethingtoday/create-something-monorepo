const DEFAULT_JOBS_MCP_URL = 'https://abundance-jobs-mcp.createsomething.workers.dev/chatgpt/mcp';
const JOBS_LIMIT = 20;
const MCP_PROTOCOL_VERSION = '2024-11-05';

interface PublicJobRow {
	id: string;
	provider: string;
	source_system: string;
	source_url?: string | null;
	title: string;
	employer?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
	location_text?: string | null;
	specialty?: string | null;
	discipline?: string | null;
	employment_type?: string | null;
	shift?: string | null;
	duration?: string | null;
	start_date?: string | null;
	pay_min?: number | null;
	pay_max?: number | null;
	pay_text?: string | null;
	currency?: string | null;
	status: string;
	application_url?: string | null;
	posted_at?: string | null;
	last_seen_at: string;
	fetched_at: string;
	normalized_at: string;
	created_at?: string | null;
}

export interface PublicNursingJob {
	id: string;
	title: string;
	employer?: string;
	location?: string;
	display_location?: string;
	city?: string;
	state?: string;
	specialty?: string;
	discipline?: string;
	employment_type?: string;
	shift?: string;
	duration?: string;
	pay_text?: string;
	pay_min?: number;
	pay_max?: number;
	currency?: string;
	status: string;
	posted_at?: string;
	last_seen_at?: string;
}

export interface PublicJobsResult {
	jobs: PublicNursingJob[];
	limit: number;
	source: 'jobs-db' | 'jobs-mcp' | 'unavailable';
	freshness: {
		newest_last_seen_at?: string;
	};
	error?: string;
}

interface McpRpcResponse {
	result?: {
		content?: Array<{ type?: string; text?: string }>;
	};
	error?: unknown;
}

export async function loadPublicNursingJobs(input: {
	fetch: typeof fetch;
	platform?: App.Platform;
}): Promise<PublicJobsResult> {
	const db = input.platform?.env?.JOBS_DB;
	if (db) {
		const result = await queryJobsDb(db).catch((error: unknown) => ({
			jobs: [],
			limit: JOBS_LIMIT,
			source: 'unavailable' as const,
			freshness: {},
			error: error instanceof Error ? error.message : String(error)
		}));
		if (result.jobs.length > 0) return result;
	}

	return fetchJobsMcp({
		fetch: input.fetch,
		url: input.platform?.env?.ABUNDANCE_JOBS_MCP_URL ?? DEFAULT_JOBS_MCP_URL
	}).catch((error: unknown) => ({
		jobs: [],
		limit: JOBS_LIMIT,
		source: 'unavailable',
		freshness: {},
		error: error instanceof Error ? error.message : String(error)
	}));
}

async function queryJobsDb(db: D1Database): Promise<PublicJobsResult> {
	const { results } = await db
		.prepare(
			`
				SELECT * FROM abundance_public_jobs
				WHERE status = ?
				ORDER BY last_seen_at DESC, posted_at DESC, created_at DESC
				LIMIT ?
			`
		)
		.bind('open', JOBS_LIMIT)
		.all<PublicJobRow>();

	const jobs = results.map(toPublicJob);
	return {
		jobs,
		limit: JOBS_LIMIT,
		source: 'jobs-db',
		freshness: {
			newest_last_seen_at: jobs[0]?.last_seen_at
		}
	};
}

async function fetchJobsMcp(input: {
	fetch: typeof fetch;
	url: string;
}): Promise<PublicJobsResult> {
	const initialize = await postMcp(
		input.fetch,
		input.url,
		{
			jsonrpc: '2.0',
			id: 'abundance-jobs-init',
			method: 'initialize',
			params: {
				protocolVersion: MCP_PROTOCOL_VERSION,
				capabilities: {},
				clientInfo: { name: 'abundance-concierge-chat', version: '0.1.0' }
			}
		}
	);

	const sessionId = initialize.sessionId;
	const call = await postMcp(
		input.fetch,
		input.url,
		{
			jsonrpc: '2.0',
			id: 'abundance-jobs-list',
			method: 'tools/call',
			params: {
				name: 'list_public_jobs',
				arguments: { limit: JOBS_LIMIT, status: 'open' }
			}
		},
		sessionId
	);

	const payloadText = call.body.result?.content?.find((item) => item.type === 'text')?.text;
	if (!payloadText) throw new Error('Jobs MCP returned no text payload.');

	const parsed = JSON.parse(payloadText) as {
		jobs?: PublicNursingJob[];
		limit?: number;
		freshness?: PublicJobsResult['freshness'];
	};

	return {
		jobs: (parsed.jobs ?? []).slice(0, JOBS_LIMIT).map(cleanPublicJob),
		limit: parsed.limit ?? JOBS_LIMIT,
		source: 'jobs-mcp',
		freshness: {
			newest_last_seen_at: parsed.freshness?.newest_last_seen_at
		}
	};
}

async function postMcp(
	fetcher: typeof fetch,
	url: string,
	body: Record<string, unknown>,
	sessionId?: string
): Promise<{ sessionId?: string; body: McpRpcResponse }> {
	const response = await fetcher(url, {
		method: 'POST',
		headers: {
			accept: 'application/json, text/event-stream',
			'content-type': 'application/json',
			...(sessionId ? { 'Mcp-Session-Id': sessionId } : {})
		},
		body: JSON.stringify(body)
	});

	const text = await response.text();
	if (!response.ok) throw new Error(`Jobs MCP request failed with HTTP ${response.status}.`);

	const parsed = parseMcpResponse(text);
	if (parsed.error) throw new Error(`Jobs MCP returned an error: ${JSON.stringify(parsed.error)}`);

	return {
		sessionId: response.headers.get('mcp-session-id') ?? sessionId,
		body: parsed
	};
}

function parseMcpResponse(text: string): McpRpcResponse {
	const trimmed = text.trim();
	if (!trimmed) return {};
	if (trimmed.startsWith('{')) return JSON.parse(trimmed) as McpRpcResponse;

	const dataLine = trimmed
		.split('\n')
		.map((line) => line.trim())
		.find((line) => line.startsWith('data:'));

	if (!dataLine) throw new Error('Jobs MCP response did not include an SSE data line.');
	return JSON.parse(dataLine.slice('data:'.length).trim()) as McpRpcResponse;
}

function toPublicJob(row: PublicJobRow): PublicNursingJob {
	const fallbackLocation = formatLocation(row.city, row.state, row.country);
	return cleanPublicJob({
		id: row.id,
		title: row.title,
		employer: cleanString(row.employer),
		location: cleanString(row.location_text) ?? fallbackLocation,
		city: cleanString(row.city),
		state: cleanString(row.state),
		specialty: cleanString(row.specialty),
		discipline: cleanString(row.discipline),
		employment_type: cleanString(row.employment_type),
		shift: cleanString(row.shift),
		duration: cleanString(row.duration),
		pay_text: cleanString(row.pay_text),
		pay_min: row.pay_min ?? undefined,
		pay_max: row.pay_max ?? undefined,
		currency: cleanString(row.currency),
		status: row.status,
		posted_at: cleanString(row.posted_at),
		last_seen_at: row.last_seen_at
	});
}

function cleanPublicJob(job: PublicNursingJob): PublicNursingJob {
	const state = cleanLocationPart(job.state);
	const city = cleanCity(job.city, state);
	const location = formatLocationText(job.location);
	const cleaned = {
		id: job.id,
		title: job.title,
		employer: cleanString(job.employer),
		location,
		display_location: formatDisplayLocation(city, state, location),
		city,
		state,
		specialty: cleanString(job.specialty),
		discipline: cleanString(job.discipline),
		employment_type: cleanString(job.employment_type),
		shift: cleanString(job.shift),
		duration: cleanString(job.duration),
		pay_text: cleanString(job.pay_text),
		pay_min: job.pay_min,
		pay_max: job.pay_max,
		currency: cleanString(job.currency),
		status: job.status,
		posted_at: cleanString(job.posted_at),
		last_seen_at: cleanString(job.last_seen_at)
	};
	return Object.fromEntries(
		Object.entries(cleaned).filter(([, value]) => value !== undefined && value !== null && value !== '')
	) as unknown as PublicNursingJob;
}

function cleanString(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function formatLocation(city?: string | null, state?: string | null, country?: string | null) {
	return [city, state, country]
		.map((part) => cleanString(part))
		.filter((part) => part && part.toLowerCase() !== 'unavailable')
		.join(', ');
}

function formatLocationText(location?: string) {
	return cleanString(location)
		?.replace(/,\s*UNAVAILABLE$/i, '')
		.replace(/,\s*United States$/i, '')
		.replace(/,\s*USA$/i, '')
		.replace(/,\s*US$/i, '');
}

function cleanLocationPart(value?: string) {
	return cleanString(value)
		?.replace(/,\s*United States$/i, '')
		.replace(/,\s*USA$/i, '')
		.replace(/,\s*US$/i, '');
}

function cleanCity(value?: string, state?: string) {
	const city = cleanLocationPart(value);
	if (!city || !state) return city;
	return city.replace(new RegExp(`,\\s*${escapeRegExp(state)}$`, 'i'), '');
}

function formatDisplayLocation(city?: string, state?: string, location?: string) {
	const cityState = [city, state].filter(Boolean).join(', ');
	return cityState || location;
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
