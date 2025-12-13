import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = platform?.env.DB;
	const brand = url.searchParams.get('brand');

	if (!db) {
		return { solutions: [], brand };
	}

	try {
		let query = 'SELECT * FROM solutions';
		const params: string[] = [];

		if (brand) {
			query += ' WHERE brand = ?';
			params.push(brand);
		}

		query += ' ORDER BY brand, sort_order, name';

		const stmt = db.prepare(query);
		const { results } = params.length > 0
			? await stmt.bind(...params).all()
			: await stmt.all();

		return {
			solutions: results ?? [],
			brand
		};
	} catch (error) {
		console.error('Solutions load error:', error);
		return { solutions: [], brand };
	}
};
