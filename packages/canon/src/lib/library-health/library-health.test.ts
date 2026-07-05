import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	assertCanonLibraryHealthReport,
	buildCanonLibraryHealthReport,
	renderCanonLibraryHealthReport
} from './index.js';

const REPO_ROOT = join(process.cwd(), '..', '..');

describe('Canon library health', () => {
	it('combines registry, export policy, overlays, modalities, and codification into one report', async () => {
		const report = await buildCanonLibraryHealthReport(REPO_ROOT);

		expect(report.sourceOfTruth).toBe('@create-something/canon/library-health');
		expect(report.status).toBe('ready');
		expect(() => assertCanonLibraryHealthReport(report)).not.toThrow();
		expect(report.registry).toMatchObject({
			totalItems: 130,
			stableItems: 54,
			candidateItems: 76,
			experimentalItems: 0
		});
		expect(report.publicExports.registryCovered).toBeGreaterThan(0);
		expect(report.publicExports.candidateReview).toBeGreaterThan(0);
		expect(report.candidateReview.total).toBe(report.publicExports.candidateReview);
		expect(report.candidateReview.priorities[0]).toMatchObject({
			classification: 'stable-foundation-candidate',
			priority: 100
		});
		expect(report.overlays).toMatchObject({
			total: 24,
			ready: 24,
			candidateIntakes: 24,
			projectLocalIntakes: 0
		});
		expect(report.modalities).toMatchObject({
			totalModalities: 5,
			implemented: 5,
			gaps: 0
		});
		expect(report.codification.needsCanonDecision).toBe(0);
		expect(report.blockers).toEqual([]);
	});

	it('renders the prioritized candidate-review backlog for agent handoff', async () => {
		const report = await buildCanonLibraryHealthReport(REPO_ROOT);
		const rendered = renderCanonLibraryHealthReport(report, { priorityLimit: 4 });

		expect(rendered).toContain('# Canon Library Health');
		expect(rendered).toContain('Status: ready');
		expect(rendered).toContain('## Candidate-review Backlog');
		expect(rendered).toContain('stable-foundation-candidate');
		expect(rendered).toContain('## Promotion Priorities');
		expect(rendered).toContain('UI files needing Canon decision: 0');
		expect(rendered).toContain('Keep Node-backed health and codification APIs on explicit subpath exports only.');
	});
});
