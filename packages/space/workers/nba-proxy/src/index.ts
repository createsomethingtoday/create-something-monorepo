/**
 * NBA Proxy Worker
 *
 * Proxies NBA.com Stats API with rate limiting and caching.
 * Stores daily snapshots for historical data access.
 * Part of the meta-experiment testing spec-driven development.
 *
 * Features:
 * - Rate limiting (10 req/min to NBA.com)
 * - KV caching with 30s TTL for live data
 * - D1 storage for historical snapshots (captured nightly at 2am ET)
 * - Error handling with correlation IDs
 * - Endpoints: /games/today, /games/:date, /game/:id/pbp, /game/:id/boxscore, /baselines, /league-averages/:season
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
async function handleGamesToday(env: Env, correlationId: string): Promise<Response> {
	try {
		// NBA.com scoreboard endpoint
		const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
		const url = `${env.NBA_API_BASE_URL}/liveData/scoreboard/todaysScoreboard_00.json`;
		const cacheKey = `nba:scoreboard:${today}`;

		const { data, cached } = await fetchFromNBA(url, env, correlationId, cacheKey);
		return successResponse(data, correlationId, cached);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] Games today error:`, message);
		return errorResponse(message, correlationId, message.includes('Rate limited') ? 429 : 500);
	}
}

async function handleGamesByDate(
	date: string,
	env: Env,
	correlationId: string
): Promise<Response> {
	try {
		const today = new Date().toISOString().slice(0, 10);

		// If requesting today's games, fetch live data
		if (date === today) {
			return handleGamesToday(env, correlationId);
		}

		// Check D1 for historical data
		console.log(`[${correlationId}] Checking D1 for historical data: ${date}`);
		const snapshot = await env.DB.prepare(
			'SELECT scoreboard_json, captured_at FROM game_snapshots WHERE date = ?'
		)
			.bind(date)
			.first();

		if (snapshot) {
			console.log(`[${correlationId}] Found historical data for ${date}`);
			const data = JSON.parse(snapshot.scoreboard_json as string);
			return successResponse(data, correlationId, true);
		}

		// No historical data available
		return errorResponse(
			`No data available for ${date}. Historical data is captured nightly starting from the day this feature was deployed.`,
			correlationId,
			404
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] Games by date error for ${date}:`, message);
		return errorResponse(message, correlationId, 500);
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

// Daily snapshot capture (runs at 2am ET via cron)
async function captureSnapshot(env: Env): Promise<void> {
	const correlationId = generateCorrelationId();

	// Capture previous day's games (cron runs at 2am, so games from "yesterday" are complete)
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const date = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

	console.log(`[${correlationId}] Starting daily snapshot capture for ${date}`);

	try {
		// Update metadata to pending
		await env.DB.prepare(
			'INSERT INTO snapshot_metadata (date, status, attempt_count, last_attempt_at) VALUES (?, ?, 0, ?) ON CONFLICT(date) DO UPDATE SET status = ?, attempt_count = attempt_count + 1, last_attempt_at = ?'
		)
			.bind(date, 'pending', Date.now(), 'pending', Date.now())
			.run();

		// Fetch today's scoreboard (which has yesterday's completed games)
		const url = `${env.NBA_API_BASE_URL}/liveData/scoreboard/todaysScoreboard_00.json`;
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
		const gameCount = data?.scoreboard?.games?.length || 0;

		// Store snapshot
		await env.DB.prepare(
			'INSERT INTO game_snapshots (date, scoreboard_json, game_count, captured_at) VALUES (?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET scoreboard_json = ?, game_count = ?, captured_at = ?'
		)
			.bind(
				date,
				JSON.stringify(data),
				gameCount,
				Date.now(),
				JSON.stringify(data),
				gameCount,
				Date.now()
			)
			.run();

		// Update metadata to captured
		await env.DB.prepare(
			'UPDATE snapshot_metadata SET status = ?, error_message = NULL WHERE date = ?'
		)
			.bind('captured', date)
			.run();

		console.log(`[${correlationId}] Successfully captured ${gameCount} games for ${date}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[${correlationId}] Snapshot capture failed for ${date}:`, message);

		// Update metadata to failed
		await env.DB.prepare(
			'UPDATE snapshot_metadata SET status = ?, error_message = ? WHERE date = ?'
		)
			.bind('failed', message, date)
			.run();

		// Re-throw to trigger retry
		throw error;
	}
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
			return handleGamesToday(env, correlationId);
		}

		// /games/:date (YYYY-MM-DD format)
		const gamesDateMatch = path.match(/^\/games\/(\d{4}-\d{2}-\d{2})$/);
		if (gamesDateMatch) {
			return handleGamesByDate(gamesDateMatch[1], env, correlationId);
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

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(captureSnapshot(env));
	},
};
