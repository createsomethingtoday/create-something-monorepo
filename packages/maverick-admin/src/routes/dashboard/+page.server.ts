import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env.DB;

	if (!db) {
		return {
			solutionCount: 0,
			newsCount: 0,
			testimonialCount: 0,
			newContactCount: 0,
			recentContacts: []
		};
	}

	try {
		// Get counts
		const [solutions, news, testimonials, newContacts] = await Promise.all([
			db.prepare('SELECT COUNT(*) as count FROM solutions WHERE is_active = 1').first<{ count: number }>(),
			db.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_published = 1').first<{ count: number }>(),
			db.prepare('SELECT COUNT(*) as count FROM testimonials WHERE is_active = 1').first<{ count: number }>(),
			db.prepare("SELECT COUNT(*) as count FROM contact_submissions WHERE status = 'new'").first<{ count: number }>()
		]);

		// Get recent contacts
		const { results: recentContacts } = await db
			.prepare(`
				SELECT id, name, email, company, category, status, created_at
				FROM contact_submissions
				ORDER BY created_at DESC
				LIMIT 5
			`)
			.all();

		return {
			solutionCount: solutions?.count ?? 0,
			newsCount: news?.count ?? 0,
			testimonialCount: testimonials?.count ?? 0,
			newContactCount: newContacts?.count ?? 0,
			recentContacts: recentContacts ?? []
		};
	} catch (error) {
		console.error('Dashboard load error:', error);
		return {
			solutionCount: 0,
			newsCount: 0,
			testimonialCount: 0,
			newContactCount: 0,
			recentContacts: []
		};
	}
};
