import type { PageServerLoad } from './$types';
import type { Principle, Master } from '$lib/types';

interface PrincipleWithMaster extends Principle {
	master_name: string;
	master_slug: string;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return { principles: [] };
	}

	try {
		// Load all principles with their master information
		const result = await db
			.prepare(
				`
			SELECT
				p.*,
				m.name as master_name,
				m.slug as master_slug
			FROM principles p
			JOIN masters m ON p.master_id = m.id
			ORDER BY m.name ASC, p.order_index ASC, p.title ASC
		`
			)
			.all<PrincipleWithMaster>();

		return {
			principles: result.results || []
		};
	} catch (error) {
		console.error('Error loading principles:', error);
		return { principles: [] };
	}
};
