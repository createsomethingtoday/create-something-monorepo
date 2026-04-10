import { error } from '@sveltejs/kit';

import { getDeliverySharePage } from '$lib/server/delivery-os-store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const page = await getDeliverySharePage(params.slug);
	if (!page) {
		throw error(404, 'Delivery page not found');
	}

	return {
		...page,
		chatEnabled: Boolean(platform?.env.OPENAI_API_KEY)
	};
};
