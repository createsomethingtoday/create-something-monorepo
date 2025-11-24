import type { PageServerLoad } from './$types';
import type { Master } from '$lib/types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return { masters: [] };
	}

	try {
		const result = await db
			.prepare(
				`
			SELECT * FROM masters
			ORDER BY created_at ASC
		`
			)
			.all<Master>();

		return {
			masters: result.results || []
		};
	} catch (error) {
		console.error('Error loading masters:', error);
		return { masters: [] };
	}
};
