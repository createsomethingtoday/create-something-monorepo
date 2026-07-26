import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	createCustomerMapWorkspace,
	createD1CustomerMapRepository,
	CustomerMapAccessError
} from '$lib/server/customer-map-workspace';

export const load: PageServerLoad = async ({ platform, params }) => {
	const db = platform?.env?.DB;
	if (!db) throw error(503, 'Shared Map is temporarily unavailable');
	try {
		const workspace = createCustomerMapWorkspace({ repository: createD1CustomerMapRepository(db) });
		const shared = await workspace.resolveShare(params.token);
		return {
			map: {
				id: shared.map.id,
				title: shared.map.title,
				reviewState: shared.map.reviewState
			},
			version: shared.version,
			sharedAt: shared.share.createdAt,
			expiresAt: shared.share.expiresAt
		};
	} catch (cause) {
		if (cause instanceof CustomerMapAccessError) throw error(404, 'This shared Map is unavailable or expired');
		throw cause;
	}
};
