import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

function routeSource(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function svelteSources(relativeDirectory: string): Array<{ path: string; source: string }> {
	const root = join(REPO_ROOT, relativeDirectory);
	const files: Array<{ path: string; source: string }> = [];

	function visit(directory: string): void {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) visit(path);
			if (entry.isFile() && entry.name.endsWith('.svelte')) {
				files.push({ path: path.slice(REPO_ROOT.length + 1), source: readFileSync(path, 'utf8') });
			}
		}
	}

	visit(root);
	return files;
}

describe('Performance composition cross-property rollout', () => {
	it('uses the shared campaign and thesis compositions on the .ltd entry surface', () => {
		const source = routeSource('packages/ltd/src/routes/+page.svelte');

		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceThesisConditions');
		expect(source).not.toContain('PerformancePlatformHero');
		expect(source).not.toContain('PerformanceLabBand');
	});

	it('uses shared evidence-oriented compositions on the .io entry surface', () => {
		const source = routeSource('packages/io/src/routes/+page.svelte');

		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceThesisConditions');
		expect(source).toContain('PerformanceContrastChapter');
		expect(source).toContain('PerformanceConversionHandoff');
		expect(source).not.toContain('PerformanceLabBand');
		expect(source).not.toContain('PerformanceCtaBand');
	});

	it('uses shared runtime-oriented compositions on the .space entry surface', () => {
		const source = routeSource('packages/space/src/routes/+page.svelte');

		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceThesisConditions');
		expect(source).toContain('PerformanceContrastChapter');
		expect(source).toContain('PerformanceConversionHandoff');
		expect(source).not.toContain('PerformanceLabBand');
		expect(source).not.toContain('PerformanceCtaBand');
	});

	it('uses shared learning-oriented compositions on the .learn entry surface', () => {
		const source = routeSource('packages/lms/src/routes/+page.svelte');

		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceThesisConditions');
		expect(source).toContain('PerformanceConversionHandoff');
		expect(source).not.toContain('PerformancePlatformHero');
		expect(source).not.toContain('PerformanceCtaBand');
	});

	it('uses shared product compositions on the staff agent roster', () => {
		const source = routeSource('packages/ona-agents/src/routes/agents/+page.svelte');

		expect(source).toContain('PerformanceThesisConditions');
		expect(source).toContain('PerformanceEvidenceIndex');
		expect(source).not.toContain('class="agents-header');
		expect(source).not.toContain('class="proof-strip');
		expect(source).not.toContain('class="agent-grid');
	});

	it('keeps active Performance consumers off legacy composition shells', () => {
		const consumers = [
			...svelteSources('packages/agency/src'),
			...svelteSources('packages/ltd/src'),
			...svelteSources('packages/io/src'),
			...svelteSources('packages/space/src'),
			...svelteSources('packages/lms/src'),
			...svelteSources('packages/ona-agents/src')
		];
		const legacyNames = ['PerformancePlatformHero', 'PerformanceLabBand', 'PerformanceCtaBand'];
		const violations = consumers.flatMap(({ path, source }) =>
			legacyNames.filter((name) => source.includes(name)).map((name) => `${path}: ${name}`)
		);

		expect(violations).toEqual([]);
	});
});
