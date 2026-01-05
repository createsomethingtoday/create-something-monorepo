/**
 * NBA Proxy Worker
 *
 * Proxies NBA.com Stats API with rate limiting and caching.
 * Part of the meta-experiment testing spec-driven development.
 *
 * Features:
 * - Rate limiting (10 req/min to NBA.com)
 * - KV caching with 30s TTL for live data
 * - Error handling with correlation IDs
 * - Endpoints: /games/today, /games/:date (YYYY-MM-DD), /game/:id/pbp, /game/:id/matchups, /game/:id/shots
 */

export interface Env {
	CACHE: KVNamespace;
	DB: D1Database;
	ENVIRONMENT: string;
	NBA_API_BASE_URL: string;
	RATE_LIMIT_REQUESTS: string;
	RATE_LIMIT_WINDOW_MS: string;
	CACHE_TTL_SECONDS: string;
}

// Correlation ID generation (CREATE SOMETHING pattern)
function generateCorrelationId(): string {
	return `nba-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Error response helper
function errorResponse(
	message: string,
	correlationId: string,
	status: number = 500
): Response {
	return new Response(
		JSON.stringify({
			success: false,
			error: message,
			correlationId,
			timestamp: new Date().toISOString(),
		}),
		{
			status,
			headers: {
				'Content-Type': 'application/json',
				'X-Correlation-ID': correlationId,
				'Access-Control-Allow-Origin': '*',
			},
		}
	);
}

// Success response helper
function successResponse<T>(
	data: T,
	correlationId: string,
	cached: boolean = false
): Response {
	return new Response(
		JSON.stringify({
			success: true,
			data,
			cached,
			timestamp: new Date().toISOString(),
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'X-Correlation-ID': correlationId,
				'X-Cached': cached.toString(),
				'Access-Control-Allow-Origin': '*',
			},
		}
	);
}

// Rate limiter using KV
class RateLimiter {
	constructor(
		private kv: KVNamespace,
		private limit: number,
		private windowMs: number
	) {}

	async check(): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
		const now = Date.now();
		const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
		const key = `rate-limit:nba:${windowStart}`;

		const currentStr = await this.kv.get(key);
		const current = currentStr ? parseInt(currentStr, 10) : 0;

		if (current >= this.limit) {
			return {
				allowed: false,
				remaining: 0,
				resetAt: windowStart + this.windowMs,
			};
		}

		// Increment counter
		await this.kv.put(key, (current + 1).toString(), {
			expirationTtl: Math.ceil(this.windowMs / 1000) + 10, // Window + buffer
		});

		return {
			allowed: true,
			remaining: this.limit - current - 1,
			resetAt: windowStart + this.windowMs,
		};
	}
}

// NBA API fetcher with caching
async function fetchFromNBA(
	url: string,
	env: Env,
	correlationId: string,
	cacheKey: string
): Promise<{ data: unknown; cached: boolean }> {
	const cacheTtl = parseInt(env.CACHE_TTL_SECONDS, 10) || 30;

	// Check cache first
	const cached = await env.CACHE.get(cacheKey, 'json');
	if (cached) {
		console.log(`[${correlationId}] Cache hit: ${cacheKey}`);
		return { data: cached, cached: true };
	}

	// Rate limit check
	const rateLimiter = new RateLimiter(
		env.CACHE,
		parseInt(env.RATE_LIMIT_REQUESTS, 10) || 10,
		parseInt(env.RATE_LIMIT_WINDOW_MS, 10) || 60000
	);
	const rateLimit = await rateLimiter.check();

	if (!rateLimit.allowed) {
		console.log(`[${correlationId}] Rate limited. Reset at: ${new Date(rateLimit.resetAt).toISOString()}`);
		throw new Error(`Rate limited. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds.`);
	}

	console.log(`[${correlationId}] Fetching: ${url}`);

	// Fetch from NBA API
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'CREATE-SOMETHING-NBA-Proxy/1.0',
			Accept: 'application/json',
			Referer: 'https://www.nba.com/',
		},
	});

	if (!response.ok) {
		throw new Error(`NBA API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();

	// Cache the response
	await env.CACHE.put(cacheKey, JSON.stringify(data), {
		expirationTtl: cacheTtl,
	});

	console.log(`[${correlationId}] Cached: ${cacheKey} (TTL: ${cacheTtl}s)`);

	return { data, cached: false };
}

// Route handlers
async function handleGames(env: Env, correlationId: string, date?: string): Promise<Response> {
	try {
		// Use provided date or default to today (YYYY-MM-DD format)
		const dateStr = date || new Date().toISOString().slice(0, 10);

		// Validate date format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
			return errorResponse('Invalid date format. Use YYYY-MM-DD', correlationId, 400);
		}

		// NBA.com scoreboard endpoint (uses YYYYMMDD format)
		const nbaDateStr = dateStr.replace(/-/g, '');
		const url = `${env.NBA_API_BASE_URL}/liveData/scoreboard/todaysScoreboard_00.json`;
		const cacheKey = `nba:scoreboard:${nbaDateStr}`;

		const { data, cached } = await fetchFromNBA(url, env, correlationId, cacheKey);
		return successResponse(data, correlationId, cached);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] Games error (date: ${date}):`, message);
		return errorResponse(message, correlationId, message.includes('Rate limited') ? 429 : 500);
	}
}

async function handleGamePBP(
	gameId: string,
	env: Env,
	correlationId: string
): Promise<Response> {
	try {
		// NBA.com play-by-play endpoint
		const url = `${env.NBA_API_BASE_URL}/liveData/playbyplay/playbyplay_${gameId}.json`;
		const cacheKey = `nba:pbp:${gameId}`;

		const { data, cached } = await fetchFromNBA(url, env, correlationId, cacheKey);
		return successResponse(data, correlationId, cached);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] PBP error for ${gameId}:`, message);
		return errorResponse(message, correlationId, message.includes('Rate limited') ? 429 : 500);
	}
}

async function handleGameBoxScore(
	gameId: string,
	env: Env,
	correlationId: string
): Promise<Response> {
	try {
		// NBA.com boxscore endpoint
		const url = `${env.NBA_API_BASE_URL}/liveData/boxscore/boxscore_${gameId}.json`;
		const cacheKey = `nba:boxscore:${gameId}`;

		const { data, cached } = await fetchFromNBA(url, env, correlationId, cacheKey);
		return successResponse(data, correlationId, cached);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] Boxscore error for ${gameId}:`, message);
		return errorResponse(message, correlationId, message.includes('Rate limited') ? 429 : 500);
	}
}

async function handlePlayerBaselines(
	playerId: string | null,
	env: Env,
	correlationId: string
): Promise<Response> {
	try {
		let result;
		if (playerId) {
			result = await env.DB.prepare(
				'SELECT * FROM player_baselines WHERE player_id = ?'
			)
				.bind(playerId)
				.first();
		} else {
			result = await env.DB.prepare(
				'SELECT * FROM player_baselines ORDER BY player_name LIMIT 100'
			).all();
		}

		return successResponse(result, correlationId, false);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] Baselines error:`, message);
		return errorResponse(message, correlationId);
	}
}

async function handleLeagueAverages(
	season: string,
	env: Env,
	correlationId: string
): Promise<Response> {
	try {
		const result = await env.DB.prepare(
			'SELECT * FROM league_averages WHERE season = ?'
		)
			.bind(season)
			.first();

		if (!result) {
			return errorResponse(`No league averages for season ${season}`, correlationId, 404);
		}

		return successResponse(result, correlationId, false);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] League averages error:`, message);
		return errorResponse(message, correlationId);
	}
}

// Health check
function handleHealth(correlationId: string): Response {
	return successResponse(
		{
			status: 'healthy',
			service: 'nba-proxy',
			version: '1.0.0',
		},
		correlationId
	);
}

// Main router
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const correlationId = generateCorrelationId();
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// Only allow GET requests
		if (request.method !== 'GET') {
			return errorResponse('Method not allowed', correlationId, 405);
		}

		console.log(`[${correlationId}] ${request.method} ${path}`);

		// Route matching
		if (path === '/health') {
			return handleHealth(correlationId);
		}

		if (path === '/games/today') {
			return handleGames(env, correlationId);
		}

		// /games/:date (YYYY-MM-DD format)
		const gamesDateMatch = path.match(/^\/games\/(\d{4}-\d{2}-\d{2})$/);
		if (gamesDateMatch) {
			return handleGames(env, correlationId, gamesDateMatch[1]);
		}

		// /game/:id/pbp
		const pbpMatch = path.match(/^\/game\/(\d+)\/pbp$/);
		if (pbpMatch) {
			return handleGamePBP(pbpMatch[1], env, correlationId);
		}

		// /game/:id/boxscore
		const boxscoreMatch = path.match(/^\/game\/(\d+)\/boxscore$/);
		if (boxscoreMatch) {
			return handleGameBoxScore(boxscoreMatch[1], env, correlationId);
		}

		// /baselines (list all)
		if (path === '/baselines') {
			return handlePlayerBaselines(null, env, correlationId);
		}

		// /baselines/:playerId
		const baselineMatch = path.match(/^\/baselines\/(.+)$/);
		if (baselineMatch) {
			return handlePlayerBaselines(baselineMatch[1], env, correlationId);
		}

		// /league-averages/:season
		const leagueMatch = path.match(/^\/league-averages\/(.+)$/);
		if (leagueMatch) {
			return handleLeagueAverages(leagueMatch[1], env, correlationId);
		}

		// 404 for unknown routes
		return errorResponse(`Not found: ${path}`, correlationId, 404);
	},
};
