import type { PageServerLoad } from './$types';
import {
	getCatalogPaperCategories,
	getCatalogPaperSlugs,
	type PaperCategory
} from '$lib/config/paperCategories';

function formatCategoryName(slug: string): string {
	return slug
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function isMissingPapersTable(error: unknown): boolean {
	return error instanceof Error && error.message.includes('no such table: papers');
}

function mergeDatabasePapers(
	databasePapers: Array<{ id?: string | null; slug?: string | null; category?: string | null }>,
	catalogCategories: PaperCategory[]
) {
	const categories = new Map<string, PaperCategory>();
	const catalogSlugs = getCatalogPaperSlugs();

	for (const category of catalogCategories) {
		categories.set(category.slug, { ...category });
	}

	for (const paper of databasePapers) {
		if (!paper.category) continue;
		const paperSlug = paper.slug || paper.id;
		if (paperSlug && catalogSlugs.has(paperSlug)) continue;

		const existing = categories.get(paper.category);
		categories.set(paper.category, {
			name: existing?.name || formatCategoryName(paper.category),
			slug: paper.category,
			count: (existing?.count || 0) + 1
		});
	}

	return [...categories.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const load: PageServerLoad = async ({ platform }) => {
	const catalogCategories = getCatalogPaperCategories();

	if (!platform?.env?.DB) {
		return { categories: catalogCategories };
	}

	try {
		const result = await platform.env.DB.prepare(`
			SELECT id, slug, category
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
    `).all();

		return { categories: mergeDatabasePapers(result.results || [], catalogCategories) };
	} catch (error) {
		if (!isMissingPapersTable(error)) {
			console.error('Error fetching categories from D1:', error);
		}
		return { categories: catalogCategories };
	}
};
