/**
 * NBA API Client
 *
 * Server-side client for fetching NBA data from the proxy worker.
 * Used by SvelteKit load functions.
 */

import type {
	Game,
	GameStatus,
	NBAScoreboardResponse,
	NBAPlayByPlayResponse,
	NBABoxScoreResponse,
	NBAApiResult,
	NBAApiError,
	PlayByPlayAction,
	ActionType,
	ShotType,
	Player,
	PlayerBaseline,
	Shot,
	ShotZone,
} from './types';

// Configuration
const NBA_PROXY_URL = 'https://nba-proxy.createsomething.workers.dev';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Generate a correlation ID for tracking requests
 */
function generateCorrelationId(): string {
	return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Create an error result
 */
function createError(message: string, correlationId: string, retryable = false): NBAApiError {
	return {
		code: 'API_ERROR',
		message,
		correlationId,
		retryable,
	};
}

/**
 * Fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout<T>(
	url: string,
	timeout: number = DEFAULT_TIMEOUT
): Promise<NBAApiResult<T>> {
	const correlationId = generateCorrelationId();
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: 'application/json',
			},
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const isRetryable = response.status >= 500 || response.status === 429;
			return {
				success: false,
				error: createError(
					`HTTP ${response.status}: ${response.statusText}`,
					correlationId,
					isRetryable
				),
			};
		}

		const json = (await response.json()) as {
			success: boolean;
			data?: T;
			error?: string;
			correlationId?: string;
			cached?: boolean;
			timestamp?: string;
		};

		// Proxy returns { success, data, cached, timestamp }
		if (json.success === false) {
			return {
				success: false,
				error: createError(json.error || 'Unknown error', json.correlationId || correlationId),
			};
		}

		return {
			success: true,
			data: json.data as T,
			cached: json.cached || false,
			timestamp: json.timestamp || new Date().toISOString(),
		};
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof Error && error.name === 'AbortError') {
			return {
				success: false,
				error: createError('Request timeout', correlationId, true),
			};
		}

		return {
			success: false,
			error: createError(
				error instanceof Error ? error.message : 'Unknown error',
				correlationId,
				true
			),
		};
	}
}

/**
 * Convert NBA API game status to our GameStatus type
 */
function parseGameStatus(status: number): GameStatus {
	switch (status) {
		case 1:
			return 'scheduled';
		case 2:
			return 'live';
		case 3:
			return 'final';
		default:
			return 'scheduled';
	}
}

/**
 * Convert NBA API action type to our ActionType
 */
function parseActionType(actionType: string): ActionType {
	const normalized = actionType.toLowerCase();
	if (normalized.includes('shot') || normalized.includes('dunk') || normalized.includes('layup')) {
		return 'shot';
	}
	if (normalized.includes('foul')) return 'foul';
	if (normalized.includes('turnover')) return 'turnover';
	if (normalized.includes('rebound')) return 'rebound';
	if (normalized.includes('free throw')) return 'freethrow';
	if (normalized.includes('substitution')) return 'substitution';
	if (normalized.includes('timeout')) return 'timeout';
	if (normalized.includes('jump ball')) return 'jumpball';
	if (normalized.includes('violation')) return 'violation';
	if (normalized.includes('ejection')) return 'ejection';
	if (normalized.includes('period')) return actionType.includes('start') ? 'period_start' : 'period_end';
	return 'shot'; // Default fallback
}

/**
 * Parse shot type from description
 */
function parseShotType(description: string, subType?: string): ShotType {
	const desc = (description + ' ' + (subType || '')).toLowerCase();
	if (desc.includes('dunk')) return 'dunk';
	if (desc.includes('layup')) return 'layup';
	if (desc.includes('hook')) return 'hook';
	if (desc.includes('alley oop')) return 'alley_oop';
	if (desc.includes('tip')) return 'tip';
	if (desc.includes('floating')) return 'floating_jump_shot';
	if (desc.includes('pullup') || desc.includes('pull-up')) return 'pullup_jump_shot';
	if (desc.includes('step back')) return 'step_back_jump_shot';
	if (desc.includes('fadeaway')) return 'fadeaway';
	if (desc.includes('turnaround')) return 'turnaround';
	if (desc.includes('3pt') || desc.includes('three')) return '3pt';
	return 'jump_shot';
}

/**
 * Determine shot zone from coordinates
 */
function determineShotZone(x: number, y: number, distance: number): ShotZone {
	// NBA court coordinates: x is sideline-to-sideline, y is baseline-to-baseline
	// Distance is in feet
	if (distance <= 4) return 'restricted_area';
	if (distance <= 14 && Math.abs(y) < 8) return 'paint_non_ra';
	if (distance >= 22) {
		// 3-point territory
		if (Math.abs(y) < 8) {
			// Corner 3: determine left vs right based on x coordinate
			return x < 0 ? 'left_corner_3' : 'right_corner_3';
		}
		return 'above_break_3';
	}
	return 'mid_range';
}

// ============================================
// Public API Functions
// ============================================

/**
 * Fetch today's games
 */
export async function fetchLiveGames(): Promise<NBAApiResult<Game[]>> {
	const correlationId = generateCorrelationId();
	const result = await fetchWithTimeout<NBAScoreboardResponse>(`${NBA_PROXY_URL}/games/today`);

	if (!result.success) {
		console.error('[fetchLiveGames] Failed to fetch games', {
			correlationId,
			error: result.error
		});
		return result;
	}

	try {
		const games: Game[] = result.data.scoreboard.games.map((g) => ({
			id: g.gameId,
			homeTeam: {
				id: g.homeTeam.teamId.toString(),
				name: g.homeTeam.teamName,
				abbreviation: g.homeTeam.teamTricode,
				city: g.homeTeam.teamCity,
				conference: 'East', // Would need additional API call for this
			},
			awayTeam: {
				id: g.awayTeam.teamId.toString(),
				name: g.awayTeam.teamName,
				abbreviation: g.awayTeam.teamTricode,
				city: g.awayTeam.teamCity,
				conference: 'East',
			},
			homeScore: g.homeTeam.score,
			awayScore: g.awayTeam.score,
			status: parseGameStatus(g.gameStatus),
			quarter: g.period,
			gameClock: g.gameClock || '',
			startTime: g.gameTimeUTC,
			arena: g.arenaName,
		}));

		console.log('[fetchLiveGames] Successfully fetched games', {
			correlationId,
			gameCount: games.length,
			live: games.filter(g => g.status === 'live').length,
			final: games.filter(g => g.status === 'final').length
		});

		return {
			success: true,
			data: games,
			cached: result.cached,
			timestamp: result.timestamp,
		};
	} catch (error) {
		console.error('[fetchLiveGames] Failed to parse games', {
			correlationId,
			error
		});
		return {
			success: false,
			error: createError(
				error instanceof Error ? error.message : 'Failed to parse games',
				correlationId
			),
		};
	}
}

/**
 * Fetch play-by-play for a game
 */
export async function fetchGamePBP(
	gameId: string
): Promise<NBAApiResult<PlayByPlayAction[]>> {
	const correlationId = generateCorrelationId();
	const result = await fetchWithTimeout<NBAPlayByPlayResponse>(
		`${NBA_PROXY_URL}/game/${gameId}/pbp`
	);

	if (!result.success) {
		console.error(`[fetchGamePBP] Failed to fetch PBP for ${gameId}`, {
			correlationId,
			error: result.error
		});
		return result;
	}

	try {
		const actions: PlayByPlayAction[] = result.data.game.actions.map((a) => {
			const actionType = parseActionType(a.actionType);
			const isShot = actionType === 'shot';

			return {
				actionId: a.actionNumber.toString(),
				gameId: result.data.game.gameId,
				period: a.period,
				clock: a.clock,
				teamId: a.teamId?.toString() || '',
				playerId: a.personId?.toString() || '',
				playerName: a.playerName || a.playerNameI || '',
				actionType,
				description: a.description,
				scoreHome: parseInt(a.scoreHome, 10) || 0,
				scoreAway: parseInt(a.scoreAway, 10) || 0,
				...(isShot && {
					shotType: parseShotType(a.description, a.subType),
					shotResult: a.shotResult === 'Made' ? 'made' : 'missed',
					shotDistance: a.shotDistance,
					shotX: a.xLegacy,
					shotY: a.yLegacy,
				}),
				...(a.assistPersonId && {
					assistPlayerId: a.assistPersonId.toString(),
					assistPlayerName: a.assistPlayerNameInitial,
				}),
			};
		});

		const shotActions = actions.filter(a => a.actionType === 'shot');
		console.log(`[fetchGamePBP] Successfully parsed PBP for ${gameId}`, {
			correlationId,
			totalActions: actions.length,
			shotActions: shotActions.length
		});

		return {
			success: true,
			data: actions,
			cached: result.cached,
			timestamp: result.timestamp,
		};
	} catch (error) {
		console.error(`[fetchGamePBP] Failed to parse PBP for ${gameId}`, {
			correlationId,
			error
		});
		return {
			success: false,
			error: createError(
				error instanceof Error ? error.message : 'Failed to parse PBP',
				correlationId
			),
		};
	}
}

/**
 * Fetch boxscore for a game
 *
 * Data quality fixes:
 * - Validates player roster sizes (NBA teams typically have 12-15 active players)
 * - Filters out players with missing critical data
 * - Logs correlation IDs for debugging data quality issues
 */
export async function fetchGameBoxScore(
	gameId: string
): Promise<NBAApiResult<{ home: Player[]; away: Player[] }>> {
	const correlationId = generateCorrelationId();
	const result = await fetchWithTimeout<NBABoxScoreResponse>(
		`${NBA_PROXY_URL}/game/${gameId}/boxscore`
	);

	if (!result.success) {
		console.error(`[fetchGameBoxScore] Failed to fetch boxscore for ${gameId}`, {
			correlationId,
			error: result.error
		});
		return result;
	}

	try {
		const mapPlayers = (team: NBABoxScoreResponse['game']['homeTeam'], teamType: 'home' | 'away'): Player[] => {
			const players = team.players
				.filter((p) => {
					// Filter out players with missing critical data
					if (!p.personId || !p.firstName || !p.familyName) {
						console.warn(`[fetchGameBoxScore] Player missing critical data in ${teamType} team`, {
							correlationId,
							gameId,
							teamId: team.teamId,
							player: p
						});
						return false;
					}
					return true;
				})
				.map((p) => ({
					id: p.personId.toString(),
					name: `${p.firstName} ${p.familyName}`,
					firstName: p.firstName,
					lastName: p.familyName,
					teamId: team.teamId.toString(),
					teamAbbr: team.teamTricode,
					position: (p.position || 'G') as Player['position'],
					jerseyNumber: p.jerseyNum,
				}));

			// Validate roster size (NBA teams typically 12-15 active players)
			if (players.length < 8 || players.length > 20) {
				console.warn(`[fetchGameBoxScore] Unusual roster size for ${teamType} team`, {
					correlationId,
					gameId,
					teamId: team.teamId,
					teamAbbr: team.teamTricode,
					playerCount: players.length,
					expected: '12-15 players'
				});
			}

			return players;
		};

		const homePlayers = mapPlayers(result.data.game.homeTeam, 'home');
		const awayPlayers = mapPlayers(result.data.game.awayTeam, 'away');

		console.log(`[fetchGameBoxScore] Successfully parsed boxscore for ${gameId}`, {
			correlationId,
			homeTeam: result.data.game.homeTeam.teamTricode,
			awayTeam: result.data.game.awayTeam.teamTricode,
			homePlayers: homePlayers.length,
			awayPlayers: awayPlayers.length
		});

		return {
			success: true,
			data: {
				home: homePlayers,
				away: awayPlayers,
			},
			cached: result.cached,
			timestamp: result.timestamp,
		};
	} catch (error) {
		console.error(`[fetchGameBoxScore] Failed to parse boxscore for ${gameId}`, {
			correlationId,
			error
		});
		return {
			success: false,
			error: createError(
				error instanceof Error ? error.message : 'Failed to parse boxscore',
				correlationId
			),
		};
	}
}

/**
 * Fetch player baselines from D1 (via proxy)
 */
export async function fetchPlayerBaselines(
	playerId?: string
): Promise<NBAApiResult<PlayerBaseline[]>> {
	const url = playerId
		? `${NBA_PROXY_URL}/baselines/${playerId}`
		: `${NBA_PROXY_URL}/baselines`;

	const result = await fetchWithTimeout<PlayerBaseline | { results: PlayerBaseline[] }>(url);

	if (!result.success) {
		return result;
	}

	// Handle single vs multiple results
	const baselines = Array.isArray(result.data)
		? result.data
		: 'results' in result.data
			? result.data.results
			: [result.data];

	return {
		success: true,
		data: baselines,
		cached: result.cached,
		timestamp: result.timestamp,
	};
}

/**
 * Extract shots from play-by-play actions
 *
 * Data quality fix: Filters out invalid shots where required fields are missing.
 * This prevents division by zero and infinity errors in calculations.
 */
export function extractShots(actions: PlayByPlayAction[], gameId: string): Shot[] {
	return actions
		.filter((a) => {
			// Must be a shot action
			if (a.actionType !== 'shot') return false;

			// Must have shot type (prevents undefined/null issues)
			if (!a.shotType) {
				console.warn(`[extractShots] Shot missing shotType: ${a.actionId} - ${a.description}`);
				return false;
			}

			// Must have shot result (prevents invalid made/missed determination)
			if (!a.shotResult) {
				console.warn(`[extractShots] Shot missing shotResult: ${a.actionId} - ${a.description}`);
				return false;
			}

			// Must have team and player IDs
			if (!a.teamId || !a.playerId) {
				console.warn(`[extractShots] Shot missing teamId or playerId: ${a.actionId}`);
				return false;
			}

			return true;
		})
		.map((a) => ({
			id: a.actionId,
			gameId,
			playerId: a.playerId,
			playerName: a.playerName,
			teamId: a.teamId,
			period: a.period,
			clock: a.clock,
			shotType: a.shotType!,
			shotZone: determineShotZone(a.shotX || 0, a.shotY || 0, a.shotDistance || 0),
			shotDistance: a.shotDistance || 0,
			x: a.shotX || 0,
			y: a.shotY || 0,
			made: a.shotResult === 'made',
			points: a.shotType === '3pt' ? 3 : 2,
			assisted: !!a.assistPlayerId,
			assistPlayerId: a.assistPlayerId,
			assistPlayerName: a.assistPlayerName,
		}));
}
