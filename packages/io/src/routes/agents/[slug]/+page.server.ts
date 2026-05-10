import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPublicAgentTrustCard } from '$lib/config/publicTrustCatalog';

export const load: PageServerLoad = async ({ params }) => {
	const card = getPublicAgentTrustCard(params.slug);

	if (!card) {
		throw error(404, 'Agent trust card not found');
	}

	return { card };
};
