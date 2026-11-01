import { describe, expect, it } from 'vitest';
import { getCatalogExperimentPapers } from '../src/lib/config/experimentCatalog';
import { isMotionExperiment } from '../src/lib/config/experimentFilters';
import { getFileBasedExperiments } from '../src/lib/config/fileBasedExperiments';

describe('experiment catalog methodology filters', () => {
	it('preserves source principles through the listing catalog', () => {
		const papers = getCatalogExperimentPapers();
		for (const source of getFileBasedExperiments()) {
			expect(papers.find((paper) => paper.slug === source.slug)).toMatchObject({
				tests_principles: source.tests_principles
			});
		}
	});

	for (const [filter, prefixes] of Object.entries({
		Minimalism: ['rams-principle'],
		'Tool Design': ['heidegger-'],
		'Data Viz': ['tufte-'],
		Motion: ['ive-motion', 'ive-'],
		Canon: ['subtractive-triad', 'hermeneutic-workflow', 'being-modes']
	})) {
		it(`retains matches for ${filter}`, () => {
			const matching = getCatalogExperimentPapers().filter((paper) =>
				(filter === 'Motion' && isMotionExperiment(paper)) ||
				'tests_principles' in paper && Array.isArray(paper.tests_principles) &&
				paper.tests_principles.some((principle: string) => prefixes.some((prefix) => principle.startsWith(prefix)))
			);
			expect(matching.length).toBeGreaterThan(0);
		});
	}
});
