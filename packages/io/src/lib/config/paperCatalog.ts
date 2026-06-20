import type { PaperMeta } from '../../routes/papers/types';
import { fileBasedPapers } from './fileBasedPapers';

export interface ContentManifestItem {
	slug: string;
	title: string;
	description: string;
	category?: string;
}

const paperModules = import.meta.glob<{ meta: PaperMeta }>('../../routes/papers/*/meta.ts', {
	eager: true
});

function normalizeCategory(category: string): PaperMeta['category'] {
	const normalized = category.toLowerCase().replace(/\s+/g, '-');
	if (normalized === 'case-study' || normalized === 'methodology' || normalized === 'research') {
		return normalized;
	}
	return 'research';
}

export function getStaticPaperMetas(): PaperMeta[] {
	return Object.values(paperModules).map((mod) => mod.meta);
}

export function getPublishedPaperMetas(): PaperMeta[] {
	const staticPapers = getStaticPaperMetas();
	const staticSlugs = new Set(staticPapers.map((paper) => paper.slug));
	const markdownPapers: PaperMeta[] = fileBasedPapers
		.filter((paper) => !staticSlugs.has(paper.slug))
		.map((paper) => ({
			slug: paper.slug,
			title: paper.title,
			subtitle: '',
			description: paper.description,
			category: normalizeCategory(paper.category),
			readingTime: paper.reading_time_minutes,
			difficulty: paper.difficulty,
			date: paper.created_at.split('T')[0],
			keywords: paper.tags
		}));

	return [...staticPapers, ...markdownPapers].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);
}

export function getPublishedPaperSlugs(): Set<string> {
	return new Set(getPublishedPaperMetas().map((paper) => paper.slug));
}

export function getPaperManifestItems(): ContentManifestItem[] {
	return getPublishedPaperMetas().map((paper) => ({
		slug: paper.slug,
		title: paper.title,
		description: paper.description,
		category: paper.category
	}));
}
