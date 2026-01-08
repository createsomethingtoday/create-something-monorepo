import { fetchLiveGames } from '$lib/nba/api';
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
	
	// Fetch games for the specified date
	const result = await fetchLiveGames(date);
	
	// Check if any games are live
	const hasLiveGames = result.success 
		? result.data.some((g) => g.status === 'live')
		: false;
	
	// For now, return empty pace data
	// TODO: Fetch full game stats and calculate pace for each team
	const paceData: PaceData[] = [];
	
	return {
		date,
		paceData,
		hasLiveGames,
	};
};
