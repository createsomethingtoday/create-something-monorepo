import type { PaceResult, TeamBoxStats } from '$lib/nba/pace-calculator';
import { calculatePace } from '$lib/nba/pace-calculator';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface PaceData {
	teamName: string;
	pace: number;
	pointsPerPossession: number;
	possessions: number;
	points: number;
}

export const load: PageServerLoad = async ({ url, depends }) => {
	depends('pace:data');
	
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
	
	try {
		// Fetch game data for the date
		const gamesResponse = await fetch(
			`https://createsomething.space/api/nba/games?date=${date}`
		);
		
		if (!gamesResponse.ok) {
			throw error(500, 'Failed to fetch games');
		}
		
		const gamesData = (await gamesResponse.json()) as { games?: any[] };
		const games = gamesData.games || [];
		
		// Check if any games are live
		const hasLiveGames = games.some((g: any) => g.gameStatus === 2);
		
		// Calculate pace for each team in each game
		const paceData: PaceData[] = [];
		
		for (const game of games) {
			// Only calculate for games with sufficient data (not just started)
			if (game.gameStatus === 1 || !game.homeTeam?.score) {
				continue;
			}
			
			// Prepare stats for both teams
			const homeStats: TeamBoxStats = {
				teamId: game.homeTeam.teamId,
				fieldGoalsAttempted: game.homeTeam.statistics?.fieldGoalsAttempted || 0,
				freeThrowsAttempted: game.homeTeam.statistics?.freeThrowsAttempted || 0,
				offensiveRebounds: game.homeTeam.statistics?.reboundsOffensive || 0,
				turnovers: game.homeTeam.statistics?.turnovers || 0,
				points: game.homeTeam.score,
			};
			
			const awayStats: TeamBoxStats = {
				teamId: game.awayTeam.teamId,
				fieldGoalsAttempted: game.awayTeam.statistics?.fieldGoalsAttempted || 0,
				freeThrowsAttempted: game.awayTeam.statistics?.freeThrowsAttempted || 0,
				offensiveRebounds: game.awayTeam.statistics?.reboundsOffensive || 0,
				turnovers: game.awayTeam.statistics?.turnovers || 0,
				points: game.awayTeam.score,
			};
			
			const periodsPlayed = game.period > 4 ? game.period : 4;
			
			// Calculate pace (function takes both teams)
			const paceResult = calculatePace(homeStats, awayStats, periodsPlayed);
			
			// Add home team data
			paceData.push({
				teamName: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
				pace: paceResult.pacePerGame,
				pointsPerPossession: homeStats.points / paceResult.possessions,
				possessions: paceResult.possessions,
				points: game.homeTeam.score,
			});
			
			// Add away team data
			paceData.push({
				teamName: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
				pace: paceResult.pacePerGame,
				pointsPerPossession: awayStats.points / paceResult.possessions,
				possessions: paceResult.possessions,
				points: game.awayTeam.score,
			});
		}
		
		// Sort by pace (descending)
		paceData.sort((a, b) => b.pace - a.pace);
		
		return {
			date,
			paceData,
			hasLiveGames,
		};
	} catch (err) {
		console.error('Error loading pace data:', err);
		throw error(500, 'Failed to load pace analysis data');
	}
};
