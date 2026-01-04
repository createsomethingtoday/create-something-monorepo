/**
 * Shot Network Page - Server Load
 *
 * Builds shot creation network from play-by-play data.
 * Nodes are players, edges are assist/shot creation relationships.
 */

import type { PageServerLoad } from './$types';
import { fetchGamePBP, fetchGameBoxScore } from '$lib/nba/api';
import type { Player } from '$lib/nba/types';

export interface NetworkNode {
	id: string;
	name: string;
	teamId: string;
	teamAbbr: string;
	shotCreation: number; // Assists + hockey assists (proxy)
	shotsAttempted: number;
	pointsCreated: number;
}

export interface NetworkEdge {
	source: string;
	target: string;
	assists: number;
	pointsCreated: number;
}

export interface TeamNetwork {
	nodes: NetworkNode[];
	edges: NetworkEdge[];
	totalAssists: number;
	totalPoints: number;
}

export const load: PageServerLoad = async ({ url }) => {
	const gameId = url.searchParams.get('gameId');

	if (!gameId) {
		return {
			error: 'No game selected',
			gameId: null,
			network: {
				home: null as TeamNetwork | null,
				away: null as TeamNetwork | null,
			},
			players: {
				home: [] as Player[],
				away: [] as Player[],
			},
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	// Fetch play-by-play and boxscore in parallel
	const [pbpResult, boxscoreResult] = await Promise.all([
		fetchGamePBP(gameId),
		fetchGameBoxScore(gameId),
	]);

	if (!pbpResult.success) {
		return {
			error: pbpResult.error.message,
			gameId,
			network: { home: null, away: null },
			players: { home: [], away: [] },
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	if (!boxscoreResult.success) {
		return {
			error: boxscoreResult.error.message,
			gameId,
			network: { home: null, away: null },
			players: { home: [], away: [] },
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	const actions = pbpResult.data;
	const players = boxscoreResult.data;

	// Get team IDs from boxscore
	const homeTeamId = players.home[0]?.teamId || '';
	const awayTeamId = players.away[0]?.teamId || '';

	// Build network for each team
	function buildTeamNetwork(teamPlayers: Player[], teamId: string): TeamNetwork {
		// Initialize nodes from players
		const nodeMap = new Map<string, NetworkNode>();
		for (const player of teamPlayers) {
			nodeMap.set(player.id, {
				id: player.id,
				name: player.name,
				teamId: player.teamId,
				teamAbbr: player.teamAbbr,
				shotCreation: 0,
				shotsAttempted: 0,
				pointsCreated: 0,
			});
		}

		// Track edges (assister -> scorer)
		const edgeMap = new Map<string, NetworkEdge>();

		let totalAssists = 0;
		let totalPoints = 0;

		// Process play-by-play for shots and assists
		for (const action of actions) {
			if (action.teamId !== teamId) continue;

			// Track shots attempted (actionType 'shot' covers all shot types)
			if (action.actionType === 'shot') {
				const shooter = nodeMap.get(action.playerId);
				if (shooter) {
					shooter.shotsAttempted++;
				}
			}

			// Track assists (create edges)
			if (action.actionType === 'shot') {
				const isMade = action.shotResult === 'made';
				if (!isMade) continue;

				// Determine points from shotType
				const isThree = action.shotType === '3pt';
				const points = isThree ? 3 : 2;
				totalPoints += points;

				// Look for assist in description or assistPlayerId
				const assisterId = action.assistPlayerId;
				if (assisterId && action.playerId) {
					const assister = nodeMap.get(assisterId);
					const scorer = nodeMap.get(action.playerId);

					if (assister && scorer) {
						assister.shotCreation++;
						assister.pointsCreated += points;
						totalAssists++;

						// Create or update edge
						const edgeKey = `${assisterId}->${action.playerId}`;
						const existing = edgeMap.get(edgeKey);
						if (existing) {
							existing.assists++;
							existing.pointsCreated += points;
						} else {
							edgeMap.set(edgeKey, {
								source: assisterId,
								target: action.playerId,
								assists: 1,
								pointsCreated: points,
							});
						}
					}
				}
			}
		}

		// Filter to players with activity
		const activeNodes = Array.from(nodeMap.values()).filter(
			(n) => n.shotCreation > 0 || n.shotsAttempted > 0
		);

		return {
			nodes: activeNodes,
			edges: Array.from(edgeMap.values()),
			totalAssists,
			totalPoints,
		};
	}

	return {
		error: null,
		gameId,
		network: {
			home: buildTeamNetwork(players.home, homeTeamId),
			away: buildTeamNetwork(players.away, awayTeamId),
		},
		players,
		cached: pbpResult.cached,
		timestamp: pbpResult.timestamp,
	};
};
