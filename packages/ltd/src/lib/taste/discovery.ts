import {
	ArenaPremiumSearchError,
	searchPublicArenaBlocks
} from '../integrations/arena/premium-search';
import {
	DEFAULT_PERFORMANCE_LAB_CANDIDATE_QUERIES,
	PERFORMANCE_LAB_OPERATOR_ACTIONS,
	rankPerformanceLabCandidates
} from './ona-candidates';

interface DiscoveryIdentity {
	subject: string;
	email: string | null;
	claims: { email_verified?: unknown };
}
interface DiscoveryOptions {
	url: URL;
	token: string | null;
	allowedEmails?: string;
	accessToken?: string;
}
interface DiscoveryDependencies {
	verify: (token: string) => Promise<DiscoveryIdentity | null>;
	search?: typeof searchPublicArenaBlocks;
}
const respond = (body: unknown, status = 200) =>
	Response.json(body, {
		status,
		headers: { 'Cache-Control': 'private, no-store' }
	});

/** Paid discovery is an operator-only read. No provider fallback, persistence, or curation. */
export async function discoverTasteCandidates(
	options: DiscoveryOptions,
	deps: DiscoveryDependencies
): Promise<Response> {
	if (!options.token) return respond({ error: 'Authentication required' }, 401);
	let identity: DiscoveryIdentity | null;
	try {
		identity = await deps.verify(options.token);
	} catch {
		return respond({ error: 'Identity verification unavailable' }, 503);
	}
	if (!identity) return respond({ error: 'Invalid identity' }, 401);
	const allowed = (options.allowedEmails ?? '')
		.split(',')
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);
	if (
		!identity.email ||
		identity.claims.email_verified !== true ||
		!allowed.includes(identity.email.toLowerCase())
	) {
		return respond({ error: 'Discovery operator access required' }, 403);
	}
	const direct = options.url.searchParams.getAll('q');
	const queries = [
		...new Set(
			(direct.length
				? direct.flatMap((query) => query.split(/[|,]/))
				: DEFAULT_PERFORMANCE_LAB_CANDIDATE_QUERIES
			)
				.map((query) => query.trim())
				.filter(Boolean)
		)
	];
	if (!queries.length || queries.length > 8 || queries.some((query) => query.length > 200)) {
		return respond({ error: 'Provide 1–8 queries of at most 200 characters each' }, 400);
	}
	const bounded = (key: string, fallback: number, max: number) => {
		const value = options.url.searchParams.get(key);
		if (value === null) return fallback;
		const number = Number(value);
		return Number.isInteger(number) && number >= 1 && number <= max ? number : null;
	};
	const limit = bounded('limit', 12, 24);
	const per = bounded('perQuery', 10, 20);
	if (limit === null || per === null) return respond({ error: 'Invalid result limit' }, 400);
	if (!options.accessToken) return respond({ error: 'Premium discovery is not configured' }, 503);
	const search = deps.search ?? searchPublicArenaBlocks;
	const blocks = [];
	const errors: { query: string; code: string }[] = [];
	for (const query of queries) {
		try {
			blocks.push(...(await search({ query, per, accessToken: options.accessToken })).blocks);
		} catch (error) {
			errors.push({
				query,
				code: error instanceof ArenaPremiumSearchError ? error.code : 'search_failed'
			});
		}
	}
	const degraded = errors.length === queries.length;
	return respond(
		{
			version: '2.0.0',
			mode: 'proposal-only',
			status: degraded ? 'degraded' : errors.length ? 'partial' : 'ok',
			generatedAt: new Date().toISOString(),
			source: 'are.na-v3-search',
			queries,
			evidence: { ranking: 'metadata-only', visualInspection: 'required' },
			writePolicy: {
				writesEnabled: false,
				allowedActions: PERFORMANCE_LAB_OPERATOR_ACTIONS,
				note: 'Human approval and visual inspection are required before a candidate enters the curated TASTE library.'
			},
			candidates: rankPerformanceLabCandidates(blocks, limit),
			errors
		},
		degraded ? 502 : 200
	);
}
