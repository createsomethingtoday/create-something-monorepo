import { fetchLiveGames } from '$lib/nba/api';
import type { OvertimeDifferential } from '$lib/nba/overtime-analyzer';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends }) => {
	depends('overtime:data');
	
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
	
	// Fetch games for the specified date
	const result = await fetchLiveGames(date);
	
	// Check if any games are live
	const hasLiveGames = result.success 
		? result.data.some((g) => g.status === 'live')
		: false;
	
	// For now, return empty overtime data
	// TODO: Query D1 for PBP archive and calculate overtime stats
	const overtimeGames: OvertimeDifferential[] = [];
	
	return {
		date,
		overtimeGames,
		hasLiveGames,
	};
};
