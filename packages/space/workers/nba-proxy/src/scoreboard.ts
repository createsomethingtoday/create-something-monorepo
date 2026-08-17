export type ScoreboardSource = 'nba' | 'espn';

export interface ScoreboardCapabilities {
	playByPlay: boolean;
	boxScore: boolean;
	advancedAnalytics: boolean;
}

export interface ScoreboardMetadata {
	source: ScoreboardSource;
	degraded: boolean;
	stale: boolean;
	fetchedAt: string;
	capabilities: ScoreboardCapabilities;
	primaryError?: string;
}

export interface CanonicalTeamScore {
	teamId: number;
	teamName: string;
	teamCity: string;
	teamTricode: string;
	score: number;
}

export interface CanonicalGameSummary {
	gameId: string;
	gameStatus: 1 | 2 | 3;
	gameStatusText: string;
	period: number;
	gameClock: string;
	homeTeam: CanonicalTeamScore;
	awayTeam: CanonicalTeamScore;
	gameTimeUTC: string;
	arenaName?: string;
}

export interface CanonicalScoreboard {
	scoreboard: {
		gameDate: string;
		games: CanonicalGameSummary[];
	};
}

export interface ScoreboardFetchResult {
	data: CanonicalScoreboard;
	metadata: ScoreboardMetadata;
	cached: boolean;
}

export interface ScoreboardReadiness {
	status: 'ready' | 'degraded' | 'unavailable';
	checkedAt: string;
	primary: 'available' | 'unavailable' | 'not_checked';
	servingSource?: ScoreboardSource;
	error?: string;
}

export interface ScoreboardCache {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl: number }): Promise<void>;
}

export interface ScoreboardDependencies {
	today: string;
	cache: ScoreboardCache;
	fetchImpl: typeof fetch;
	nbaApiBaseUrl: string;
	espnApiBaseUrl: string;
	now?: () => Date;
}

const NBA_CAPABILITIES: ScoreboardCapabilities = {
	playByPlay: true,
	boxScore: true,
	advancedAnalytics: true,
};

const SCOREBOARD_ONLY_CAPABILITIES: ScoreboardCapabilities = {
	playByPlay: false,
	boxScore: false,
	advancedAnalytics: false,
};

// ESPN's edge rejects the Workers/undici user agent. Keep a curl-compatible
// prefix while retaining an explicit CREATE SOMETHING client identity.
const ESPN_USER_AGENT = 'curl/8.7.1 CREATE-SOMETHING-NBA-Proxy/2.0';

export const READINESS_CACHE_KEY = 'nba:scoreboard:v2:readiness';

function scoreboardCacheKey(date: string): string {
	return `nba:scoreboard:v2:${date}`;
}

function lastGoodCacheKey(date: string): string {
	return `nba:scoreboard:v2:last-good:${date}`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function readStoredResult(
	cache: ScoreboardCache,
	key: string
): Promise<ScoreboardFetchResult | null> {
	const stored = await cache.get(key);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as ScoreboardFetchResult;
	} catch {
		return null;
	}
}

async function storeResult(
	cache: ScoreboardCache,
	key: string,
	result: ScoreboardFetchResult,
	expirationTtl: number
): Promise<void> {
	await cache.put(key, JSON.stringify(result), { expirationTtl });
}

async function storeReadiness(
	cache: ScoreboardCache,
	readiness: ScoreboardReadiness
): Promise<void> {
	await cache.put(READINESS_CACHE_KEY, JSON.stringify(readiness), { expirationTtl: 900 });
}

async function fetchJson(
	url: string,
	fetchImpl: typeof fetch,
	provider: ScoreboardSource
): Promise<unknown> {
	const response = await fetchImpl(url, {
		headers:
			provider === 'nba'
				? {
						Accept: 'application/json',
						'User-Agent': 'CREATE-SOMETHING-NBA-Proxy/2.0',
						Referer: 'https://www.nba.com/',
					}
				: {
						Accept: 'application/json',
						'User-Agent': ESPN_USER_AGENT,
					},
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText || 'Upstream error'}`);
	return response.json();
}

function assertNbaScoreboard(data: unknown): CanonicalScoreboard {
	if (
		!data ||
		typeof data !== 'object' ||
		!('scoreboard' in data) ||
		!data.scoreboard ||
		typeof data.scoreboard !== 'object' ||
		!('games' in data.scoreboard) ||
		!Array.isArray(data.scoreboard.games)
	) {
		throw new Error('NBA scoreboard response was incomplete');
	}
	return data as CanonicalScoreboard;
}

interface EspnCompetitor {
	id?: string;
	homeAway?: 'home' | 'away';
	score?: string;
	team?: {
		id?: string;
		location?: string;
		name?: string;
		abbreviation?: string;
	};
}

interface EspnEvent {
	id?: string;
	date?: string;
	status?: {
		displayClock?: string;
		period?: number;
		type?: {
			state?: 'pre' | 'in' | 'post';
			completed?: boolean;
			description?: string;
		};
	};
	competitions?: Array<{
		venue?: { fullName?: string };
		competitors?: EspnCompetitor[];
	}>;
}

interface EspnScoreboardResponse {
	events?: EspnEvent[];
}

function espnStatus(event: EspnEvent): 1 | 2 | 3 {
	if (event.status?.type?.completed || event.status?.type?.state === 'post') return 3;
	if (event.status?.type?.state === 'in') return 2;
	return 1;
}

function adaptTeam(competitor: EspnCompetitor | undefined): CanonicalTeamScore {
	const abbreviation = competitor?.team?.abbreviation ?? 'TBD';
	const nbaAbbreviation: Record<string, string> = {
		GS: 'GSW',
		NY: 'NYK',
		NO: 'NOP',
		SA: 'SAS',
		UTAH: 'UTA',
	};
	return {
		teamId: Number(competitor?.team?.id ?? competitor?.id ?? 0),
		teamName: competitor?.team?.name ?? 'Unknown',
		teamCity: competitor?.team?.location ?? '',
		teamTricode: nbaAbbreviation[abbreviation] ?? abbreviation,
		score: Number(competitor?.score ?? 0),
	};
}

export function adaptEspnScoreboard(data: unknown, requestedDate: string): CanonicalScoreboard {
	const response = data as EspnScoreboardResponse;
	const events = Array.isArray(response?.events) ? response.events : [];

	return {
		scoreboard: {
			gameDate: requestedDate,
			games: events.flatMap((event) => {
				const competition = event.competitions?.[0];
				const home = competition?.competitors?.find((team) => team.homeAway === 'home');
				const away = competition?.competitors?.find((team) => team.homeAway === 'away');
				if (!event.id || !event.date || !home || !away) return [];
				const status = espnStatus(event);

				return [
					{
						gameId: `espn:${event.id}`,
						gameStatus: status,
						gameStatusText: event.status?.type?.description ?? (status === 3 ? 'Final' : 'Scheduled'),
						period: event.status?.period ?? 0,
						gameClock: event.status?.displayClock ?? '',
						homeTeam: adaptTeam(home),
						awayTeam: adaptTeam(away),
						gameTimeUTC: event.date,
						arenaName: competition?.venue?.fullName,
					},
				];
			}),
		},
	};
}

export function nbaScoreboardResult(
	data: unknown,
	fetchedAt: string,
	options: { cached?: boolean; stale?: boolean; primaryError?: string } = {}
): ScoreboardFetchResult {
	return {
		data: assertNbaScoreboard(data),
		cached: options.cached ?? false,
		metadata: {
			source: 'nba',
			degraded: options.stale ?? false,
			stale: options.stale ?? false,
			fetchedAt,
			capabilities: NBA_CAPABILITIES,
			primaryError: options.primaryError,
		},
	};
}

export async function fetchScoreboardForDate(
	date: string,
	dependencies: ScoreboardDependencies
): Promise<ScoreboardFetchResult> {
	const now = dependencies.now?.() ?? new Date();
	const checkedAt = now.toISOString();
	const cacheKey = scoreboardCacheKey(date);
	const cached = await readStoredResult(dependencies.cache, cacheKey);
	if (cached) return { ...cached, cached: true };

	let primaryError: string | undefined;
	if (date === dependencies.today) {
		try {
			const nbaData = await fetchJson(
				`${dependencies.nbaApiBaseUrl}/liveData/scoreboard/todaysScoreboard_00.json`,
				dependencies.fetchImpl,
				'nba'
			);
			const result = nbaScoreboardResult(nbaData, checkedAt);
			await storeResult(dependencies.cache, cacheKey, result, 60);
			await storeResult(dependencies.cache, lastGoodCacheKey(date), result, 604800);
			await storeReadiness(dependencies.cache, {
				status: 'ready',
				checkedAt,
				primary: 'available',
				servingSource: 'nba',
			});
			return result;
		} catch (error) {
			primaryError = errorMessage(error);
		}
	}

	try {
		const espnDate = date.replaceAll('-', '');
		const espnData = await fetchJson(
			`${dependencies.espnApiBaseUrl}/scoreboard?dates=${espnDate}&limit=100`,
			dependencies.fetchImpl,
			'espn'
		);
		const result: ScoreboardFetchResult = {
			data: adaptEspnScoreboard(espnData, date),
			cached: false,
			metadata: {
				source: 'espn',
				degraded: true,
				stale: false,
				fetchedAt: checkedAt,
				capabilities: SCOREBOARD_ONLY_CAPABILITIES,
				primaryError,
			},
		};
		await storeResult(dependencies.cache, cacheKey, result, date === dependencies.today ? 300 : 3600);
		await storeResult(dependencies.cache, lastGoodCacheKey(date), result, 604800);
		if (date === dependencies.today) {
			await storeReadiness(dependencies.cache, {
				status: 'degraded',
				checkedAt,
				primary: primaryError ? 'unavailable' : 'not_checked',
				servingSource: 'espn',
				error: primaryError,
			});
		}
		return result;
	} catch (fallbackError) {
		const fallbackMessage = errorMessage(fallbackError);
		const stale = await readStoredResult(dependencies.cache, lastGoodCacheKey(date));
		if (stale) {
			const result = {
				...stale,
				cached: true,
				metadata: {
					...stale.metadata,
					degraded: true,
					stale: true,
					primaryError: [primaryError, fallbackMessage].filter(Boolean).join('; '),
				},
			};
			if (date === dependencies.today) {
				await storeReadiness(dependencies.cache, {
					status: 'degraded',
					checkedAt,
					primary: primaryError ? 'unavailable' : 'not_checked',
					servingSource: result.metadata.source,
					error: result.metadata.primaryError,
				});
			}
			return result;
		}

		const message = [primaryError, fallbackMessage].filter(Boolean).join('; ');
		if (date === dependencies.today) {
			await storeReadiness(dependencies.cache, {
				status: 'unavailable',
				checkedAt,
				primary: primaryError ? 'unavailable' : 'not_checked',
				error: message,
			});
		}
		throw new Error(`Scoreboard unavailable: ${message}`);
	}
}
