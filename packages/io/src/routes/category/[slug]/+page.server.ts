/**
 * Category Page Loader - IO
 *
 * Uses D1 when available and falls back to the checked-in paper catalog.
 */

import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/canon/types';
import {
	getCatalogPaperCategory,
	getCatalogPapersByCategory
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

function fallbackForCategory(slug: string) {
	const papers = getCatalogPapersByCategory(slug);
	return {
		papers,
		category: getCatalogPaperCategory(slug)
	};
}

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	if (!platform?.env?.DB) {
		return fallbackForCategory(slug);
	}

	try {
		const result = await platform.env.DB.prepare(`
			SELECT * FROM papers
			WHERE category = ? AND published = 1 AND is_hidden = 0 AND archived = 0
			ORDER BY created_at DESC
		`).bind(slug).all<Paper>();

		const databasePapers = result.results || [];
		const catalogPapers = getCatalogPapersByCategory(slug);
		const catalogSlugs = new Set(catalogPapers.map((paper) => paper.slug));
		const papers = [
			...catalogPapers,
			...databasePapers.filter((paper) => paper.slug && !catalogSlugs.has(paper.slug))
		];

		return {
			papers,
			category: {
				name: formatCategoryName(slug),
				slug,
				count: papers.length
			}
		};
	} catch (error) {
		if (!isMissingPapersTable(error)) {
			console.error('Error fetching category from D1:', error);
		}
		return fallbackForCategory(slug);
	}
};
