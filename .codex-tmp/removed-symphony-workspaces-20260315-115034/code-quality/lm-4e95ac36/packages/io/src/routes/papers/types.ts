/**
 * Paper Metadata Type
 *
 * Minimal metadata for paper discovery.
 * The paper content lives in +page.svelte; this enables listing.
 */
export interface PaperMeta {
	slug: string;
	title: string;
	subtitle: string;
	description: string;
	category: 'research' | 'case-study' | 'methodology';
	readingTime: number; // minutes
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	date: string; // YYYY-MM-DD
	keywords: string[];
}
