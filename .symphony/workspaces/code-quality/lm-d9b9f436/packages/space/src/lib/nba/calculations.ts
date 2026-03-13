/**
 * NBA Calculation Engine
 *
 * Efficiency and impact calculations for the NBA Live Analytics experiment.
 * All calculations are designed to work with live play-by-play data.
 */

import { formatPPP } from './utils';
import type {
	PlayByPlayAction,
	Shot,
	DuoPair,
	DuoStats,
	Matchup,
	PlayerBaseline,
	DefensiveImpactResult,
	ExpectedPointsResult,
	ShotCreationNode,
	ShotCreationEdge,
	ShotNetworkGraph,
	ShotZone,
	Game,
} from './types';

// League average constants (2024-25 season estimates)
const LEAGUE_AVG_PPP = 1.12;
const LEAGUE_AVG_TS = 0.58;

// Expected FG% by zone (league averages)
const ZONE_EXPECTED_FG: Record<ShotZone, number> = {
	restricted_area: 0.66,
	paint_non_ra: 0.42,
	mid_range: 0.41,
	left_corner_3: 0.39,
	right_corner_3: 0.39,
	above_break_3: 0.36,
	backcourt: 0.01, // Basically never makes
};

// Points value by zone
const ZONE_POINTS: Record<ShotZone, number> = {
	restricted_area: 2,
	paint_non_ra: 2,
	mid_range: 2,
	left_corner_3: 3,
	right_corner_3: 3,
	above_break_3: 3,
	backcourt: 3,
};

// ============================================
// Duo Efficiency Calculations
// ============================================

/**
 * Calculate duo efficiency statistics from play-by-play actions
 */
export function calculateDuoEfficiency(
	actions: PlayByPlayAction[],
	teamId: string,
	gameId: string
): Map<string, DuoStats> {
	const duoMap = new Map<string, DuoStats>();

	// Filter to scoring plays for this team
	const scoringPlays = actions.filter(
		(a) => a.teamId === teamId && a.actionType === 'shot' && a.shotResult === 'made'
	);

	// Group by possessions (approximation: consecutive plays by same team)
	let currentPossession: PlayByPlayAction[] = [];
	const possessions: PlayByPlayAction[][] = [];

	for (const action of actions.filter((a) => a.teamId === teamId)) {
		if (action.actionType === 'turnover' || (action.actionType === 'shot')) {
			if (currentPossession.length > 0) {
				possessions.push([...currentPossession, action]);
				currentPossession = [];
			}
		} else {
			currentPossession.push(action);
		}
	}

	// Analyze each possession for duo involvement
	for (const possession of possessions) {
		const players = [...new Set(possession.map((a) => a.playerId).filter(Boolean))];

		// For each pair of players in this possession
		for (let i = 0; i < players.length; i++) {
			for (let j = i + 1; j < players.length; j++) {
				const duoKey = [players[i], players[j]].sort().join('-');

				if (!duoMap.has(duoKey)) {
					// Initialize duo stats
					const p1Actions = possession.filter((a) => a.playerId === players[i]);
					const p2Actions = possession.filter((a) => a.playerId === players[j]);

					duoMap.set(duoKey, {
						duo: {
							player1Id: players[i],
							player1Name: p1Actions[0]?.playerName || 'Unknown',
							player2Id: players[j],
							player2Name: p2Actions[0]?.playerName || 'Unknown',
							teamId,
						},
						gameId,
						minutesTogether: 0, // Would need lineup data
						possessionsTogether: 0,
						points: 0,
						pointsPerPossession: 0,
						assistsBetween: 0,
						shotAttemptsTogether: 0,
						shotsMadeTogether: 0,
						synergyScore: 0,
						leagueAveragePPP: LEAGUE_AVG_PPP,
						deltaVsLeague: 0,
					});
				}

				const stats = duoMap.get(duoKey)!;
				stats.possessionsTogether++;

				// Count shots
				const shotPlays = possession.filter((a) => a.actionType === 'shot');
				stats.shotAttemptsTogether += shotPlays.length;
				stats.shotsMadeTogether += shotPlays.filter((a) => a.shotResult === 'made').length;

				// Count assists between the duo
				for (const play of possession) {
					if (
						play.assistPlayerId &&
						((play.playerId === players[i] && play.assistPlayerId === players[j]) ||
							(play.playerId === players[j] && play.assistPlayerId === players[i]))
					) {
						stats.assistsBetween++;
					}
				}

				// Count points
				for (const play of shotPlays) {
					if (play.shotResult === 'made') {
						const points = play.shotType === '3pt' ? 3 : 2;
						stats.points += points;
					}
				}
			}
		}
	}

	// Calculate derived metrics for each duo
	for (const stats of duoMap.values()) {
		if (stats.possessionsTogether > 0) {
			stats.pointsPerPossession = stats.points / stats.possessionsTogether;
			stats.deltaVsLeague = stats.pointsPerPossession - LEAGUE_AVG_PPP;

			// Synergy score: weighted combination of PPP and assist rate
			const assistRate =
				stats.shotsMadeTogether > 0 ? stats.assistsBetween / stats.shotsMadeTogether : 0;
			stats.synergyScore = stats.pointsPerPossession * 0.7 + assistRate * 0.3 * 2; // Scale assist rate
		}
	}

	return duoMap;
}

/**
 * Get top N duos by synergy score
 */
export function getTopDuos(duoMap: Map<string, DuoStats>, n: number = 5): DuoStats[] {
	return [...duoMap.values()]
		.filter((d) => d.possessionsTogether >= 3) // Minimum sample size
		.sort((a, b) => b.synergyScore - a.synergyScore)
		.slice(0, n);
}

// ============================================
// Defensive Impact Calculations
// ============================================

/**
 * Calculate defensive impact compared to baseline expectations
 */
export function calculateDefensiveImpact(
	matchups: Matchup[],
	baselines: Map<string, PlayerBaseline>
): DefensiveImpactResult[] {
	return matchups.map((matchup) => {
		const attackerBaseline = baselines.get(matchup.attackerId);

		// Calculate expected points based on attacker's baseline
		let expectedPoints = matchup.possessions * LEAGUE_AVG_PPP;
		if (attackerBaseline) {
			expectedPoints = matchup.possessions * attackerBaseline.expectedPPP;
		}

		matchup.expectedPointsAllowed = expectedPoints;
		matchup.impactVsExpected = matchup.pointsAllowed - expectedPoints;

		// Categorize impact
		let impactCategory: DefensiveImpactResult['impactCategory'];
		const delta = matchup.impactVsExpected;

		if (delta <= -0.3 * matchup.possessions) {
			impactCategory = 'elite';
		} else if (delta <= -0.1 * matchup.possessions) {
			impactCategory = 'positive';
		} else if (delta <= 0.1 * matchup.possessions) {
			impactCategory = 'neutral';
		} else if (delta <= 0.3 * matchup.possessions) {
			impactCategory = 'negative';
		} else {
			impactCategory = 'poor';
		}

		// Calculate percentile (simplified)
		const normalizedImpact = delta / Math.max(matchup.possessions, 1);
		const percentile = Math.max(
			0,
			Math.min(100, 50 - normalizedImpact * 100)
		);

		return {
			matchup,
			baseline: attackerBaseline || null,
			impactCategory,
			percentile,
		};
	});
}

/**
 * Build matchup matrix from play-by-play actions
 * Note: Real matchup data would come from tracking data, this is an approximation
 */
export function buildMatchupMatrix(
	actions: PlayByPlayAction[],
	homeTeamId: string,
	awayTeamId: string
): Matchup[] {
	const matchupMap = new Map<string, Matchup>();

	// This is a simplified approximation - real matchup data requires tracking
	// For now, we'll use shot attempts as proxy for matchups
	const shots = actions.filter((a) => a.actionType === 'shot');

	for (const shot of shots) {
		// We don't have real defender data, so we'll skip detailed matchup building
		// In a real implementation, this would use Second Spectrum or similar tracking data
	}

	return [...matchupMap.values()];
}

// ============================================
// Expected Points Calculations
// ============================================

/**
 * Calculate expected points for a shot
 */
export function calculateExpectedPoints(
	shot: Shot,
	shooterBaseline: PlayerBaseline | null
): ExpectedPointsResult {
	// Get zone expected FG%
	let zoneExpectedFGPct = ZONE_EXPECTED_FG[shot.shotZone];

	// Adjust for shooter's baseline if available
	if (shooterBaseline?.shotProfile) {
		const profile = shooterBaseline.shotProfile;
		switch (shot.shotZone) {
			case 'restricted_area':
				zoneExpectedFGPct = profile.restrictedAreaFGPct;
				break;
			case 'paint_non_ra':
				zoneExpectedFGPct = profile.paintNonRAFGPct;
				break;
			case 'mid_range':
				zoneExpectedFGPct = profile.midRangeFGPct;
				break;
			case 'left_corner_3':
			case 'right_corner_3':
				zoneExpectedFGPct = profile.cornerThreeFGPct;
				break;
			case 'above_break_3':
				zoneExpectedFGPct = profile.aboveBreakThreeFGPct;
				break;
		}
	}

	const pointsValue = ZONE_POINTS[shot.shotZone];
	const expectedPoints = zoneExpectedFGPct * pointsValue;
	const actualPoints = shot.made ? pointsValue : 0;

	return {
		shot,
		expectedPoints,
		shooterBaseline,
		zoneExpectedFGPct,
		actualVsExpected: actualPoints - expectedPoints,
	};
}

/**
 * Calculate team-level expected points from shots
 */
export function calculateTeamExpectedPoints(
	shots: Shot[],
	baselines: Map<string, PlayerBaseline>
): { totalExpected: number; totalActual: number; delta: number } {
	let totalExpected = 0;
	let totalActual = 0;

	for (const shot of shots) {
		const baseline = baselines.get(shot.playerId);
		const result = calculateExpectedPoints(shot, baseline || null);
		totalExpected += result.expectedPoints;
		totalActual += shot.made ? shot.points : 0;
	}

	return {
		totalExpected,
		totalActual,
		delta: totalActual - totalExpected,
	};
}

// ============================================
// Shot Network Graph Calculations
// ============================================

/**
 * Build shot creation network graph from play-by-play
 */
export function buildShotNetwork(
	actions: PlayByPlayAction[],
	teamId: string,
	gameId: string
): ShotNetworkGraph {
	const nodeMap = new Map<string, ShotCreationNode>();
	const edgeMap = new Map<string, ShotCreationEdge>();

	// Filter to shots for this team
	const shots = actions.filter((a) => a.teamId === teamId && a.actionType === 'shot');

	// Build nodes from all players who took or assisted shots
	for (const shot of shots) {
		// Shooter node
		if (!nodeMap.has(shot.playerId)) {
			nodeMap.set(shot.playerId, {
				playerId: shot.playerId,
				playerName: shot.playerName,
				teamId,
				shotAttempts: 0,
				assistsGiven: 0,
				assistsReceived: 0,
				totalCreation: 0,
				totalPoints: 0,
				expectedPoints: 0,
				radius: 10, // Will be calculated later
			});
		}

		const shooterNode = nodeMap.get(shot.playerId)!;
		shooterNode.shotAttempts++;
		if (shot.shotResult === 'made') {
			const points = shot.shotType === '3pt' ? 3 : 2;
			shooterNode.totalPoints += points;
		}

		// Calculate expected points for this shot
		const zoneExpected = ZONE_EXPECTED_FG[shot.shotType === '3pt' ? 'above_break_3' : 'mid_range'];
		const pointsValue = shot.shotType === '3pt' ? 3 : 2;
		shooterNode.expectedPoints += zoneExpected * pointsValue;

		// Assister node and edge
		if (shot.assistPlayerId) {
			if (!nodeMap.has(shot.assistPlayerId)) {
				nodeMap.set(shot.assistPlayerId, {
					playerId: shot.assistPlayerId,
					playerName: shot.assistPlayerName || 'Unknown',
					teamId,
					shotAttempts: 0,
					assistsGiven: 0,
					assistsReceived: 0,
					totalCreation: 0,
					totalPoints: 0,
					expectedPoints: 0,
					radius: 10,
				});
			}

			const assisterNode = nodeMap.get(shot.assistPlayerId)!;
			assisterNode.assistsGiven++;
			shooterNode.assistsReceived++;

			// Create/update edge
			const edgeKey = `${shot.assistPlayerId}-${shot.playerId}`;
			if (!edgeMap.has(edgeKey)) {
				edgeMap.set(edgeKey, {
					sourceId: shot.assistPlayerId,
					targetId: shot.playerId,
					assists: 0,
					frequency: 0,
					strength: 0,
				});
			}
			const edge = edgeMap.get(edgeKey)!;
			edge.assists++;
		}
	}

	// Calculate derived metrics
	const maxCreation = Math.max(
		1,
		...[...nodeMap.values()].map((n) => n.shotAttempts + n.assistsGiven)
	);
	const maxAssists = Math.max(1, ...[...edgeMap.values()].map((e) => e.assists));

	for (const node of nodeMap.values()) {
		node.totalCreation = node.shotAttempts + node.assistsGiven;
		// Scale radius between 10 and 40 based on creation
		node.radius = 10 + (node.totalCreation / maxCreation) * 30;
	}

	for (const edge of edgeMap.values()) {
		edge.frequency = edge.assists / maxAssists;
		edge.strength = edge.frequency * 2; // D3 force strength
	}

	return {
		gameId,
		teamId,
		nodes: [...nodeMap.values()],
		edges: [...edgeMap.values()],
	};
}

// ============================================
// Utility Functions
// ============================================

// Re-export from utils for backward compatibility
export { formatPPP } from './utils';

/**
 * Format delta with + prefix for positive
 */
export function formatDelta(delta: number): string {
	const prefix = delta >= 0 ? '+' : '';
	return `${prefix}${delta.toFixed(2)}`;
}

/**
 * Get impact color class based on category
 */
export function getImpactColorClass(
	category: DefensiveImpactResult['impactCategory']
): string {
	switch (category) {
		case 'elite':
			return 'text-success';
		case 'positive':
			return 'text-success-muted';
		case 'neutral':
			return 'text-fg-secondary';
		case 'negative':
			return 'text-warning';
		case 'poor':
			return 'text-error';
	}
}

/**
 * Calculate made field goal differential from play-by-play
 *
 * The refinement metric: volume beats efficiency.
 * If differential ≥8, bet on the team making more shots.
 */
export function calculateFGDifferential(actions: PlayByPlayAction[]): {
	homeTeam: { teamId: string; madeFG: number };
	awayTeam: { teamId: string; madeFG: number };
	differential: number;
	volumeAdvantage: 'home' | 'away' | 'even';
} | null {
	const teams = new Map<string, { madeFG: number }>();

	// Count made field goals per team
	actions
		.filter((a) => a.actionType === 'shot' && a.shotResult === 'made')
		.forEach((a) => {
			if (!teams.has(a.teamId)) {
				teams.set(a.teamId, { madeFG: 0 });
			}
			teams.get(a.teamId)!.madeFG++;
		});

	if (teams.size !== 2) return null;

	const teamStats = [...teams.entries()];
	const [team1, team2] = teamStats;

	const diff = Math.abs(team1[1].madeFG - team2[1].madeFG);
	const advantage =
		diff < 3 ? 'even' : team1[1].madeFG > team2[1].madeFG ? 'home' : 'away';

	// Assume first team in actions is away team (common API pattern)
	const firstTeamId = actions.find((a) => a.teamId)?.teamId;
	const isTeam1Away = team1[0] === firstTeamId;

	return {
		homeTeam: {
			teamId: isTeam1Away ? team2[0] : team1[0],
			madeFG: isTeam1Away ? team2[1].madeFG : team1[1].madeFG,
		},
		awayTeam: {
			teamId: isTeam1Away ? team1[0] : team2[0],
			madeFG: isTeam1Away ? team1[1].madeFG : team2[1].madeFG,
		},
		differential: diff,
		volumeAdvantage: advantage,
	};
}

/**
 * Select the "Game of the Night" from a list of completed games.
 *
 * Criteria (in priority order):
 * 1. Highest total scoring game (most exciting offensive display)
 * 2. Closest margin of victory (most competitive)
 *
 * @param games - Array of completed games
 * @returns The selected game, reason for selection, and optional highlight stat
 */
export function selectGameOfTheNight(games: Game[]): {
	game: Game;
	reason: 'highest-scoring' | 'closest-margin';
	highlightStat?: string;
} | null {
	// Filter to completed games only
	const completedGames = games.filter((g) => g.status === 'final');

	if (completedGames.length === 0) {
		return null;
	}

	// Find highest scoring game
	const highestScoring = completedGames.reduce((max, game) => {
		const totalPoints = game.homeScore + game.awayScore;
		const maxTotal = max.homeScore + max.awayScore;
		return totalPoints > maxTotal ? game : max;
	});

	// Find closest game
	const closestGame = completedGames.reduce((closest, game) => {
		const margin = Math.abs(game.homeScore - game.awayScore);
		const closestMargin = Math.abs(closest.homeScore - closest.awayScore);
		return margin < closestMargin ? game : closest;
	});

	// Determine which to feature (prefer high scoring unless game was extremely close)
	const highestTotal = highestScoring.homeScore + highestScoring.awayScore;
	const closestMargin = Math.abs(closestGame.homeScore - closestGame.awayScore);

	// Feature closest game if margin is <= 5 points
	if (closestMargin <= 5 && closestGame.id !== highestScoring.id) {
		return {
			game: closestGame,
			reason: 'closest-margin',
			highlightStat: `Down to the wire finish`,
		};
	}

	// Otherwise feature highest scoring
	return {
		game: highestScoring,
		reason: 'highest-scoring',
		highlightStat: `Combined for ${highestTotal} points`,
	};
}
