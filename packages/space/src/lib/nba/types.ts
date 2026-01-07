/**
 * NBA Live Analytics Types
 *
 * Type definitions for NBA.com Stats API responses, DARKO baselines,
 * and calculated analytics for the meta-experiment dashboard.
 */

// ============================================
// Core Entities
// ============================================

export interface Player {
	id: string;
	name: string;
	firstName: string;
	lastName: string;
	teamId: string;
	teamAbbr: string;
	position: Position;
	jerseyNumber: string;
}

export type Position = 'G' | 'F' | 'C' | 'G-F' | 'F-C' | 'F-G' | 'C-F';

export interface Team {
	id: string;
	name: string;
	abbreviation: string;
	city: string;
	conference: 'East' | 'West';
	logoUrl?: string;
}

export interface Game {
	id: string;
	homeTeam: Team;
	awayTeam: Team;
	homeScore: number;
	awayScore: number;
	status: GameStatus;
	quarter: number;
	gameClock: string;
	startTime: string;
	arena?: string;
}

export type GameStatus = 'scheduled' | 'live' | 'halftime' | 'final';

// ============================================
// Play-by-Play & Possession Tracking
// ============================================

export interface PlayByPlayAction {
	actionId: string;
	gameId: string;
	period: number;
	clock: string;
	teamId: string;
	playerId: string;
	playerName: string;
	actionType: ActionType;
	description: string;
	scoreHome: number;
	scoreAway: number;
	// Shot-specific fields
	shotType?: ShotType;
	shotResult?: 'made' | 'missed';
	shotDistance?: number;
	shotX?: number;
	shotY?: number;
	// Assist/secondary player
	assistPlayerId?: string;
	assistPlayerName?: string;
	// Possession context
	possessionId?: string;
	possessionNumber?: number;
}

export type ActionType =
	| 'shot'
	| 'foul'
	| 'turnover'
	| 'rebound'
	| 'freethrow'
	| 'substitution'
	| 'timeout'
	| 'jumpball'
	| 'violation'
	| 'ejection'
	| 'period_start'
	| 'period_end';

export type ShotType =
	| 'layup'
	| 'dunk'
	| 'hook'
	| 'jump_shot'
	| 'floating_jump_shot'
	| 'pullup_jump_shot'
	| 'step_back_jump_shot'
	| 'fadeaway'
	| 'turnaround'
	| 'tip'
	| '3pt'
	| 'alley_oop';

export interface Possession {
	id: string;
	gameId: string;
	teamId: string;
	period: number;
	startClock: string;
	endClock: string;
	actions: PlayByPlayAction[];
	outcome: PossessionOutcome;
	points: number;
	// Duo tracking
	primaryPlayer?: string;
	secondaryPlayer?: string;
}

export type PossessionOutcome =
	| 'made_shot'
	| 'missed_shot'
	| 'turnover'
	| 'foul'
	| 'end_of_period';

// ============================================
// Shots & Shot Charts
// ============================================

export interface Shot {
	id: string;
	gameId: string;
	playerId: string;
	playerName: string;
	teamId: string;
	period: number;
	clock: string;
	shotType: ShotType;
	shotZone: ShotZone;
	shotDistance: number;
	x: number; // Court coordinates (0-100)
	y: number;
	made: boolean;
	points: number; // 2 or 3
	// Assist info
	assisted: boolean;
	assistPlayerId?: string;
	assistPlayerName?: string;
	// Expected value (calculated)
	expectedPoints?: number;
}

export type ShotZone =
	| 'restricted_area'
	| 'paint_non_ra'
	| 'mid_range'
	| 'left_corner_3'
	| 'right_corner_3'
	| 'above_break_3'
	| 'backcourt';

// ============================================
// Matchups & Defense
// ============================================

export interface Matchup {
	gameId: string;
	period: number;
	defenderId: string;
	defenderName: string;
	defenderTeamId: string;
	attackerId: string;
	attackerName: string;
	attackerTeamId: string;
	possessions: number;
	pointsAllowed: number;
	// Detailed breakdown
	fgAttempts: number;
	fgMade: number;
	threePtAttempts: number;
	threePtMade: number;
	turnoversForced: number;
	foulsCommitted: number;
	// Calculated metrics
	pointsPerPossession: number;
	// Expected (from baselines)
	expectedPointsAllowed?: number;
	impactVsExpected?: number;
}

export interface MatchupMatrix {
	gameId: string;
	defenders: Player[];
	attackers: Player[];
	matchups: Map<string, Matchup>; // Key: `${defenderId}-${attackerId}`
}

// ============================================
// Duo Analysis
// ============================================

export interface DuoPair {
	player1Id: string;
	player1Name: string;
	player2Id: string;
	player2Name: string;
	teamId: string;
}

export interface DuoStats {
	duo: DuoPair;
	gameId: string;
	// Time together
	minutesTogether: number;
	possessionsTogether: number;
	// Efficiency
	points: number;
	pointsPerPossession: number;
	// Shot creation
	assistsBetween: number; // Assists from player1 to player2 + vice versa
	shotAttemptsTogether: number;
	shotsMadeTogether: number;
	// Synergy score (calculated)
	synergyScore: number;
	// Comparison to baseline
	leagueAveragePPP: number;
	deltaVsLeague: number;
}

export interface DuoMatrix {
	gameId: string;
	teamId: string;
	players: Player[];
	duos: Map<string, DuoStats>; // Key: sorted `${id1}-${id2}`
}

// ============================================
// DARKO Baselines (from D1)
// ============================================

export interface PlayerBaseline {
	playerId: string;
	playerName: string;
	season: string;
	// DARKO-style metrics
	offensiveRating: number;
	defensiveRating: number;
	netRating: number;
	// Usage and efficiency
	usageRate: number;
	trueShootingPct: number;
	assistPct: number;
	reboundPct: number;
	// Per-possession expectations
	expectedPPP: number; // Expected points per possession when on court
	expectedDefPPP: number; // Expected points allowed per possession
	// Shot profile
	shotProfile: ShotProfile;
	// Timestamp
	updatedAt: string;
}

export interface ShotProfile {
	restrictedAreaPct: number;
	paintNonRAPct: number;
	midRangePct: number;
	cornerThreePct: number;
	aboveBreakThreePct: number;
	// Expected makes by zone
	restrictedAreaFGPct: number;
	paintNonRAFGPct: number;
	midRangeFGPct: number;
	cornerThreeFGPct: number;
	aboveBreakThreeFGPct: number;
}

export interface SeasonAverage {
	playerId: string;
	season: string;
	gamesPlayed: number;
	minutesPerGame: number;
	pointsPerGame: number;
	assistsPerGame: number;
	reboundsPerGame: number;
	stealsPerGame: number;
	blocksPerGame: number;
	turnoversPerGame: number;
	fgPct: number;
	threePtPct: number;
	ftPct: number;
}

// ============================================
// NBA.com API Response Types
// ============================================

export interface NBAScoreboardResponse {
	scoreboard: {
		gameDate: string; // YYYY-MM-DD in Pacific Time
		games: NBAGameSummary[];
	};
}

export interface NBAGameSummary {
	gameId: string;
	gameStatus: 1 | 2 | 3; // 1=scheduled, 2=live, 3=final
	gameStatusText: string;
	period: number;
	gameClock: string;
	homeTeam: NBATeamScore;
	awayTeam: NBATeamScore;
	gameTimeUTC: string;
	arenaName?: string;
}

export interface NBATeamScore {
	teamId: number;
	teamName: string;
	teamCity: string;
	teamTricode: string;
	score: number;
}

export interface NBAPlayByPlayResponse {
	game: {
		gameId: string;
		actions: NBAAction[];
	};
}

export interface NBAAction {
	actionNumber: number;
	clock: string;
	period: number;
	teamId: number;
	teamTricode: string;
	personId: number;
	playerName: string;
	playerNameI: string;
	actionType: string;
	subType?: string;
	description: string;
	scoreHome: string;
	scoreAway: string;
	// Shot specifics
	shotResult?: string;
	shotDistance?: number;
	xLegacy?: number;
	yLegacy?: number;
	// Assist
	assistPersonId?: number;
	assistPlayerNameInitial?: string;
}

export interface NBABoxScoreResponse {
	game: {
		gameId: string;
		homeTeam: NBATeamBoxScore;
		awayTeam: NBATeamBoxScore;
	};
}

export interface NBATeamBoxScore {
	teamId: number;
	teamName: string;
	teamTricode: string;
	players: NBAPlayerBoxScore[];
}

export interface NBAPlayerBoxScore {
	personId: number;
	firstName: string;
	familyName: string;
	jerseyNum: string;
	position: string;
	statistics: {
		minutes: string;
		points: number;
		assists: number;
		reboundsTotal: number;
		steals: number;
		blocks: number;
		turnovers: number;
		fieldGoalsMade: number;
		fieldGoalsAttempted: number;
		threePointersMade: number;
		threePointersAttempted: number;
		freeThrowsMade: number;
		freeThrowsAttempted: number;
		plusMinusPoints: number;
	};
}

// ============================================
// Calculated Analytics Results
// ============================================

export interface DefensiveImpactResult {
	matchup: Matchup;
	baseline: PlayerBaseline | null;
	impactCategory: 'elite' | 'positive' | 'neutral' | 'negative' | 'poor';
	percentile: number;
}

export interface ExpectedPointsResult {
	shot: Shot;
	expectedPoints: number;
	shooterBaseline: PlayerBaseline | null;
	zoneExpectedFGPct: number;
	actualVsExpected: number;
}

export interface ShotCreationNode {
	playerId: string;
	playerName: string;
	teamId: string;
	// Shot creation metrics
	shotAttempts: number;
	assistsGiven: number;
	assistsReceived: number;
	totalCreation: number; // shotAttempts + assistsGiven
	// Expected value
	totalPoints: number;
	expectedPoints: number;
	// For D3 force graph
	radius: number; // Proportional to totalCreation
}

export interface ShotCreationEdge {
	sourceId: string;
	targetId: string;
	assists: number;
	frequency: number; // Normalized 0-1
	// For D3 force graph
	strength: number;
}

export interface ShotNetworkGraph {
	gameId: string;
	teamId: string;
	nodes: ShotCreationNode[];
	edges: ShotCreationEdge[];
}

// ============================================
// API Client Types
// ============================================

export interface NBAApiConfig {
	baseUrl: string;
	timeout: number;
	retryAttempts: number;
	cacheKey?: string;
}

export interface NBAApiError {
	code: string;
	message: string;
	correlationId: string;
	retryable: boolean;
}

export type NBAApiResult<T> =
	| { success: true; data: T; cached: boolean; timestamp: string; gameDate?: string }
	| { success: false; error: NBAApiError };

// ============================================
// Polling State
// ============================================

export interface PollingState {
	isPolling: boolean;
	lastUpdate: string | null;
	error: string | null;
	intervalMs: number;
}
