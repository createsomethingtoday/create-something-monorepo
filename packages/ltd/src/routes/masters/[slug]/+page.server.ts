import type { PageServerLoad } from './$types';
import type { Master, Principle, Quote, Example, Resource } from '$lib/types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return { master: null, principles: [], quotes: [], examples: [], resources: [] };
	}

	try {
		// Load master
		const masterResult = await db
			.prepare('SELECT * FROM masters WHERE slug = ?')
			.bind(params.slug)
			.first<Master>();

		if (!masterResult) {
			return { master: null, principles: [], quotes: [], examples: [], resources: [] };
		}

		// Load related data
		const [principlesResult, quotesResult, examplesResult, resourcesResult] = await Promise.all([
			db
				.prepare('SELECT * FROM principles WHERE master_id = ? ORDER BY order_index ASC, title ASC')
				.bind(masterResult.id)
				.all<Principle>(),
			db
				.prepare('SELECT * FROM quotes WHERE master_id = ? ORDER BY created_at DESC')
				.bind(masterResult.id)
				.all<Quote>(),
			db
				.prepare('SELECT * FROM examples WHERE master_id = ? ORDER BY year DESC')
				.bind(masterResult.id)
				.all<Example>(),
			db
				.prepare('SELECT * FROM resources WHERE master_id = ? ORDER BY featured DESC, year DESC')
				.bind(masterResult.id)
				.all<Resource>()
		]);

		return {
			master: masterResult,
			principles: principlesResult.results || [],
			quotes: quotesResult.results || [],
			examples: examplesResult.results || [],
			resources: resourcesResult.results || []
		};
	} catch (error) {
		console.error('Error loading master:', error);
		return { master: null, principles: [], quotes: [], examples: [], resources: [] };
	}
};
