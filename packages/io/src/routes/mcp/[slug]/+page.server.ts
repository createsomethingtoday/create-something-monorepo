import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPublicMcpTrustCard } from '$lib/config/publicTrustCatalog';

export const load: PageServerLoad = async ({ params }) => {
	const card = getPublicMcpTrustCard(params.slug);

	if (!card) {
		throw error(404, 'MCP trust card not found');
	}

	return { card };
};
