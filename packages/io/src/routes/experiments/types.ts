/**
 * Experiment Metadata Type
 *
 * Minimal metadata for static experiment discovery.
 * The experiment implementation lives in +page.svelte; this enables listing.
 */
export interface ExperimentMeta {
	slug: string;
	title: string;
	subtitle: string;
	description: string;
	category: string;
	readingTime: number; // minutes
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	date: string; // YYYY-MM-DD
	keywords: string[];
	featured?: boolean;
}
