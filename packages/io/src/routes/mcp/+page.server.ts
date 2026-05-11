import type { PageServerLoad } from './$types';
import { PUBLIC_MCP_TRUST_CARDS } from '$lib/config/publicTrustCatalog';

export const load: PageServerLoad = async () => {
	const cards = PUBLIC_MCP_TRUST_CARDS;
	const statuses = Array.from(new Set(cards.map((card) => card.status))).sort();

	return {
		cards,
		statuses
	};
};
