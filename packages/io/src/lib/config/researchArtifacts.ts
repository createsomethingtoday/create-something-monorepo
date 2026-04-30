import type { Paper } from '@create-something/canon/types';
import { getFileBasedExperiments } from '$lib/config/fileBasedExperiments';
import { getFileBasedPapers } from '$lib/config/fileBasedPapers';

type StaticPaperMeta = {
	slug: string;
	title: string;
	subtitle: string;
	description: string;
	category: 'research' | 'case-study' | 'methodology';
	readingTime: number;
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	date: string;
	keywords: string[];
};

type StaticExperimentMeta = Omit<StaticPaperMeta, 'category'> & {
	category: string;
	featured?: boolean;
};

const staticPaperModules = import.meta.glob<{ meta: StaticPaperMeta }>(
	'../../routes/papers/*/meta.ts',
	{ eager: true }
);

const staticExperimentModules = import.meta.glob<{ meta: StaticExperimentMeta }>(
	'../../routes/experiments/*/meta.ts',
	{ eager: true }
);

export type ResearchArtifact = Paper & {
	route?: string;
	is_file_based?: boolean;
};

export type ResearchCategory = {
	name: string;
	slug: string;
	count: number;
};

export function normalizeCategory(category?: string | null): string {
	const normalized = (category || 'research')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return normalized || 'research';
}

export function formatCategoryName(categorySlug: string): string {
	return normalizeCategory(categorySlug)
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function mergeBySlug(...groups: ResearchArtifact[][]): ResearchArtifact[] {
	const merged = new Map<string, ResearchArtifact>();

	for (const group of groups) {
		for (const artifact of group) {
			if (artifact.slug) {
				merged.set(artifact.slug, artifact);
			}
		}
	}

	return [...merged.values()];
}

function visibilityFlagToNumber(flag: unknown, defaultValue: 0 | 1): 0 | 1 {
	if (flag === undefined || flag === null) return defaultValue;
	if (typeof flag === 'boolean') return flag ? 1 : 0;
	return Number(flag) === 1 ? 1 : 0;
}

export function isPublicResearchArtifact(artifact: ResearchArtifact): boolean {
	return (
		visibilityFlagToNumber(artifact.published, 1) === 1 &&
		visibilityFlagToNumber(artifact.is_hidden, 0) === 0 &&
		visibilityFlagToNumber(artifact.archived, 0) === 0
	);
}

export function filterPublicResearchArtifacts(artifacts: ResearchArtifact[]): ResearchArtifact[] {
	return artifacts.filter(isPublicResearchArtifact);
}

export function getLocalResearchArtifacts(): ResearchArtifact[] {
	return mergeBySlug(
		getLocalPaperArtifacts(),
		getLocalExperimentArtifacts()
	);
}

export function getLocalPaperArtifacts(): ResearchArtifact[] {
	return filterPublicResearchArtifacts(
		mergeBySlug(
			getStaticPaperArtifacts(),
			getFileBasedPapers() as ResearchArtifact[]
		)
	);
}

export function getLocalExperimentArtifacts(): ResearchArtifact[] {
	return filterPublicResearchArtifacts(
		mergeBySlug(
			getStaticExperimentArtifacts(),
			getFileBasedExperiments() as ResearchArtifact[]
		)
	);
}

export function getStaticPaperArtifacts(): ResearchArtifact[] {
	return Object.values(staticPaperModules).map(({ meta }) =>
		staticMetaToArtifact(meta, 'paper')
	);
}

export function getStaticExperimentArtifacts(): ResearchArtifact[] {
	return Object.values(staticExperimentModules).map(({ meta }) =>
		staticMetaToArtifact(meta, 'experiment')
	);
}

function staticMetaToArtifact(
	meta: StaticPaperMeta | StaticExperimentMeta,
	kind: 'paper' | 'experiment'
): ResearchArtifact {
	const routeBase = kind === 'paper' ? 'papers' : 'experiments';
	return {
		id: `static-${kind}-${meta.slug}`,
		slug: meta.slug,
		title: meta.title,
		category: meta.category,
		reading_time: meta.readingTime,
		difficulty_level: meta.difficulty,
		excerpt_short: meta.subtitle,
		excerpt_long: meta.description,
		description: meta.description,
		date: meta.date,
		created_at: `${meta.date}T00:00:00Z`,
		updated_at: `${meta.date}T00:00:00Z`,
		published_at: `${meta.date}T00:00:00Z`,
		featured: 'featured' in meta && meta.featured ? 1 : 0,
		published: 1,
		is_hidden: 0,
		archived: 0,
		route: `/${routeBase}/${meta.slug}`,
		tags: meta.keywords.map((keyword) => ({
			id: normalizeCategory(keyword),
			name: keyword,
			slug: normalizeCategory(keyword)
		}))
	};
}

export function buildCategories(artifacts: ResearchArtifact[]): ResearchCategory[] {
	const counts = new Map<string, number>();

	for (const artifact of artifacts) {
		const category = normalizeCategory(artifact.category);
		counts.set(category, (counts.get(category) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
		.map(([category, count]) => ({
			name: formatCategoryName(category),
			slug: category,
			count
		}));
}

export function filterByCategory(
	artifacts: ResearchArtifact[],
	categorySlug: string
): ResearchArtifact[] {
	const normalized = normalizeCategory(categorySlug);
	return artifacts.filter((artifact) => normalizeCategory(artifact.category) === normalized);
}

export function sortByFeaturedThenDate(artifacts: ResearchArtifact[]): ResearchArtifact[] {
	return [...artifacts].sort((left, right) => {
		const featuredDiff = Number(right.featured || 0) - Number(left.featured || 0);
		if (featuredDiff !== 0) return featuredDiff;

		const leftDate = new Date(left.published_at || left.created_at || left.date || 0).getTime();
		const rightDate = new Date(right.published_at || right.created_at || right.date || 0).getTime();
		return rightDate - leftDate;
	});
}
