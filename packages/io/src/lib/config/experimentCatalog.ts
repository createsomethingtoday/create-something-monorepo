import type { Paper } from '@create-something/canon/types';
import { getFileBasedExperiments, type FileBasedExperimentPaper } from './fileBasedExperiments';

export interface ContentManifestItem {
	slug: string;
	title: string;
	description: string;
	category?: string;
}

export interface ExperimentMeta {
	slug: string;
	title: string;
	description: string;
	category: string;
	created_at: string;
	updated_at: string;
	reading_time_minutes: number;
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	tags: string[];
	featured?: number;
	route?: string;
}

export const LEGACY_EXPERIMENT_REDIRECT_SLUGS = new Set([
	'kickstand-triad-audit',
	'understanding-graphs'
]);

export const staticRouteExperiments: ExperimentMeta[] = [
	{
		slug: 'agent-operations',
		title: 'Agent Operations',
		description: 'Live operational status and recent activity for CREATE SOMETHING agent systems.',
		category: 'operations',
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		tags: ['Agents', 'Operations', 'Monitoring']
	},
	{
		slug: 'awwwards-patterns',
		title: 'Awwwards Patterns',
		description: 'Interaction and visual design patterns from award-winning web experiences.',
		category: 'interactive',
		created_at: '2025-12-01T00:00:00Z',
		updated_at: '2025-12-01T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		tags: ['Design Patterns', 'Motion', 'Interaction']
	},
	{
		slug: 'diagrams',
		title: 'Diagrams',
		description: 'Interactive diagram primitives for making system structure visible.',
		category: 'interactive',
		created_at: '2025-12-01T00:00:00Z',
		updated_at: '2025-12-01T00:00:00Z',
		reading_time_minutes: 6,
		difficulty: 'beginner',
		tags: ['Diagrams', 'Visualization', 'Systems']
	},
	{
		slug: 'hybrid-scheduling',
		title: 'Hybrid Scheduling',
		description: 'Using Cloudflare Workers Cron Triggers with Modal compute for cost-efficient scheduled jobs.',
		category: 'infrastructure',
		created_at: '2025-12-01T00:00:00Z',
		updated_at: '2025-12-01T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		tags: ['Cloudflare', 'Modal', 'Scheduling']
	}
];

function experimentToMeta(experiment: FileBasedExperimentPaper): ExperimentMeta {
	return {
		slug: experiment.slug,
		title: experiment.title,
		description: experiment.description || experiment.excerpt_short || '',
		category: experiment.category,
		created_at: experiment.created_at,
		updated_at: experiment.updated_at,
		reading_time_minutes: experiment.reading_time,
		difficulty:
			experiment.difficulty_level === 'beginner' ||
			experiment.difficulty_level === 'intermediate' ||
			experiment.difficulty_level === 'advanced'
				? experiment.difficulty_level
				: 'intermediate',
		tags: (experiment.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag.name)),
		featured: experiment.featured,
		route: experiment.route
	};
}

function metaToPaper(meta: ExperimentMeta): Paper {
	return {
		id: `static-${meta.slug}`,
		slug: meta.slug,
		title: meta.title,
		description: meta.description,
		excerpt_short: meta.description,
		excerpt_long: meta.description,
		category: meta.category,
		created_at: meta.created_at,
		updated_at: meta.updated_at,
		published_at: meta.created_at,
		reading_time: meta.reading_time_minutes,
		difficulty_level: meta.difficulty,
		published: 1,
		is_hidden: 0,
		archived: 0,
		featured: meta.featured || 0,
		route: meta.route || `/experiments/${meta.slug}`,
		tags: meta.tags.map((tag) => ({
			id: tag.toLowerCase().replace(/\s+/g, '-'),
			name: tag,
			slug: tag.toLowerCase().replace(/\s+/g, '-')
		}))
	} as Paper & { route: string };
}

export function getPublishedExperimentMetas(): ExperimentMeta[] {
	const fileBased = getFileBasedExperiments().map(experimentToMeta);
	const fileBasedSlugs = new Set(fileBased.map((experiment) => experiment.slug));
	const staticOnly = staticRouteExperiments.filter((experiment) => !fileBasedSlugs.has(experiment.slug));

	return [...fileBased, ...staticOnly].sort(
		(a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
	);
}

export function getPublishedExperimentSlugs(): Set<string> {
	return new Set(getPublishedExperimentMetas().map((experiment) => experiment.slug));
}

export function getExperimentManifestItems(): ContentManifestItem[] {
	return getPublishedExperimentMetas().map((experiment) => ({
		slug: experiment.slug,
		title: experiment.title,
		description: experiment.description,
		category: experiment.category
	}));
}

export function getCatalogExperimentPapers(): Paper[] {
	return getPublishedExperimentMetas().map(metaToPaper);
}
