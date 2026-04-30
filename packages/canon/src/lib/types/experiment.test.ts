import { describe, expect, it } from 'vitest';
import {
	isPublicFileBasedContent,
	transformExperimentToPaper,
	type FileBasedExperiment
} from './experiment';

function buildExperiment(overrides: Partial<FileBasedExperiment> = {}): FileBasedExperiment {
	return {
		id: 'experiment-test',
		slug: 'experiment-test',
		title: 'Experiment Test',
		description: 'Publication-state fixture.',
		excerpt_short: 'Fixture',
		excerpt_long: 'Fixture content',
		category: 'research',
		tags: ['Fixture'],
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'intermediate',
		is_file_based: true,
		...overrides
	};
}

describe('file-based publication state', () => {
	it('defaults file-based experiments to public', () => {
		const paper = transformExperimentToPaper(buildExperiment());

		expect(paper.published).toBe(1);
		expect(paper.is_hidden).toBe(0);
		expect(paper.archived).toBe(0);
		expect(isPublicFileBasedContent(paper)).toBe(true);
	});

	it('preserves draft, hidden, and archived flags', () => {
		const paper = transformExperimentToPaper(
			buildExperiment({
				published: false,
				hidden: true,
				archived: 1
			})
		);

		expect(paper.published).toBe(0);
		expect(paper.is_hidden).toBe(1);
		expect(paper.archived).toBe(1);
		expect(isPublicFileBasedContent(paper)).toBe(false);
	});

	it('uses explicit is_hidden over hidden shorthand', () => {
		const paper = transformExperimentToPaper(
			buildExperiment({
				hidden: true,
				is_hidden: 0
			})
		);

		expect(paper.is_hidden).toBe(0);
		expect(isPublicFileBasedContent(paper)).toBe(true);
	});
});
