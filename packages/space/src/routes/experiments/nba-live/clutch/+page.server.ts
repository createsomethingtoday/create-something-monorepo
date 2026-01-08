import type { ClutchStats } from '$lib/nba/clutch-calculator';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends }) => {
	depends('clutch:data');
	
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
		
		// For now, return mock clutch stats
		// In production, this would query D1 for PBP data and calculate clutch stats
		const clutchStats: ClutchStats[] = [];
		let totalClutchSituations = 0;
		
		// TODO: Implement actual clutch stats calculation
		// This would involve:
		// 1. Query PBP archive for games on this date
		// 2. Filter for last 2 minutes of close games (5pt margin)
		// 3. Calculate clutch stats for each player
		// 4. Sort by ice-in-veins rating
		
		return {
			date,
			clutchStats,
			totalClutchSituations,
			hasLiveGames,
		};
	} catch (err) {
		console.error('Error loading clutch data:', err);
		throw error(500, 'Failed to load clutch performance data');
	}
};
