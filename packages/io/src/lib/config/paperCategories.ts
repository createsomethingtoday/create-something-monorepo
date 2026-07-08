import type { Paper } from '@create-something/canon/types';
import type { PaperMeta } from '../../routes/papers/types';
import { getPublishedPaperMetas } from './paperCatalog';

export interface PaperCategory {
	name: string;
	slug: string;
	count: number;
}

function formatCategoryName(slug: string): string {
	return slug
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function paperMetaToPaper(meta: PaperMeta): Paper & { route: string } {
	const publishedAt = meta.date ? `${meta.date}T00:00:00Z` : new Date(0).toISOString();

	return {
		id: `static-paper-${meta.slug}`,
		slug: meta.slug,
		title: meta.title,
		description: meta.description,
		excerpt_short: meta.subtitle || meta.description,
		excerpt_long: meta.description,
		category: meta.category,
		created_at: publishedAt,
		updated_at: publishedAt,
		published_at: publishedAt,
		published_on: meta.date,
		date: meta.date,
		reading_time: meta.readingTime,
		difficulty_level: meta.difficulty,
		published: 1,
		is_hidden: 0,
		archived: 0,
		featured: 0,
		route: `/papers/${meta.slug}`,
		tags: meta.keywords.map((keyword) => ({
			id: keyword.toLowerCase().replace(/\s+/g, '-'),
			name: keyword,
			slug: keyword.toLowerCase().replace(/\s+/g, '-')
		}))
	};
}

function sortPapersByDate(papers: PaperMeta[]): PaperMeta[] {
	return [...papers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCatalogPaperCategories(): PaperCategory[] {
	const counts = new Map<string, number>();

	for (const paper of getPublishedPaperMetas()) {
		counts.set(paper.category, (counts.get(paper.category) || 0) + 1);
	}

	return [...counts.entries()]
		.map(([slug, count]) => ({
			name: formatCategoryName(slug),
			slug,
			count
		}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getCatalogPaperSlugs(): Set<string> {
	return new Set(getPublishedPaperMetas().map((paper) => paper.slug));
}

export function getCatalogPapersByCategory(slug: string): Array<Paper & { route: string }> {
	return sortPapersByDate(getPublishedPaperMetas().filter((paper) => paper.category === slug)).map(
		paperMetaToPaper
	);
}

export function getCatalogPaperCategory(slug: string): PaperCategory {
	const papers = getCatalogPapersByCategory(slug);

	return {
		name: formatCategoryName(slug),
		slug,
		count: papers.length
	};
}
