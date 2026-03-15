/**
 * Related Research Papers
 *
 * Maps .space experiments to their related .io research papers.
 * Reverse mapping from .io's related_experiments field.
 *
 * Canon: The hermeneutic circle closes between Practice and Research.
 */

export interface RelatedPaper {
	slug: string;
	title: string;
	excerpt: string;
	readingTime: number;
}

// Reverse mapping: experiment slug → related .io papers
const experimentToPapers: Record<string, RelatedPaper[]> = {
	'minimal-capture': [
		{
			slug: 'hermeneutic-spiral-ux',
			title: 'The Hermeneutic Spiral in UX Design',
			excerpt: 'Why systems should remember and ask only what has changed.',
			readingTime: 20
		},
		{
			slug: 'code-mode-hermeneutic-analysis',
			title: 'Code-Mediated Tool Use',
			excerpt: 'Why Code Mode achieves Zuhandenheit where tool calling forces Vorhandenheit.',
			readingTime: 45
		}
	],
	'motion-ontology': [
		{
			slug: 'hermeneutic-debugging',
			title: 'Hermeneutic Debugging',
			excerpt: 'Applying the hermeneutic circle to software debugging.',
			readingTime: 12
		},
		{
			slug: 'code-mode-hermeneutic-analysis',
			title: 'Code-Mediated Tool Use',
			excerpt: 'Why Code Mode achieves Zuhandenheit where tool calling forces Vorhandenheit.',
			readingTime: 45
		}
	],
	'workway-canon-audit': [
		{
			slug: 'kickstand-triad-audit',
			title: 'Subtractive Triad Audit: Kickstand',
			excerpt: 'A production case study in systematic code reduction.',
			readingTime: 12
		}
	],
	'threshold-dwelling': [
		{
			slug: 'sveltekit-zuhandenheit',
			title: 'Framework as Equipment',
			excerpt: 'When framework disappears, application emerges.',
			readingTime: 25
		}
	],
	praxis: [
		{
			slug: 'understanding-graphs',
			title: 'Understanding Graphs',
			excerpt: 'Minimal dependency documentation embodying "Less, but better."',
			readingTime: 15
		}
	]
};

/**
 * Get related .io research papers for a given experiment slug
 */
export function getRelatedPapers(experimentSlug: string): RelatedPaper[] {
	return experimentToPapers[experimentSlug] || [];
}

/**
 * Check if an experiment has related papers
 */
export function hasRelatedPapers(experimentSlug: string): boolean {
	return (experimentToPapers[experimentSlug]?.length ?? 0) > 0;
}
