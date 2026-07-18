import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

function routeSource(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const HOMEPAGE_SECTION_COMPONENTS = [
	'PerformanceCampaignOpening',
	'PerformanceThesisConditions',
	'PerformanceFieldSequence',
	'PerformanceContrastChapter',
	'PerformanceEvidenceIndex',
	'PerformanceConversionHandoff',
	'PerformancePageSection',
	'PerformanceDecisionPanel',
	'PropertyFunnel',
	'NewsletterSignup',
	'PapersGrid'
];

function routeMarkup(source: string): string {
	return source.split('</script>')[1]?.split('<style>')[0] ?? source;
}

function homepageSectionCount(source: string): number {
	const markup = routeMarkup(source);
	const componentSections = HOMEPAGE_SECTION_COMPONENTS.reduce(
		(count, component) => count + (markup.match(new RegExp(`<${component}\\b`, 'g'))?.length ?? 0),
		0
	);
	return componentSections + (markup.match(/<section\b/g)?.length ?? 0);
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
	it('lands the .agency story in five chapters without dropping the boundary or proof', () => {
		const source = routeSource('packages/agency/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(5);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceContrastChapter');
		expect(source).toContain('PerformanceConversionHandoff');
		expect(source).not.toContain('PerformanceFieldSequence');
		expect(source).not.toContain('PerformanceEvidenceIndex');
		expect(source).toContain('Stop watching the workflow. Keep the judgment.');
		expect(source).toContain('Test the boundary before work moves.');
		expect(source).toContain('Map the work before AI runs it.');
		expect(source).toContain('Map signals. Route decisions. Leave proof.');
		expect(source).toContain('See what passed—and what did not.');
		expect(source).toContain('Built with OpenAI Codex. Designed to remain yours.');
	});

	it('lands the .ltd canon in five chapters instead of using the grammar as a template', () => {
		const source = routeSource('packages/ltd/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(5);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceDecisionPanel');
		expect(source).toContain('PerformancePageSection');
		expect(source).toContain('PropertyFunnel');
		expect(source).toContain('NewsletterSignup');
		expect(source).not.toContain('PerformanceThesisConditions');
		expect(source).toContain('Build, govern, prove.');
		expect(source).toContain('MCP consumption is commoditized. MCP creation is not.');
		expect(source).toContain('Crystallization');
		expect(source).toContain('Dieter Rams');
		expect(source).toContain('Ludwig Mies van der Rohe');
		expect(source).not.toContain('PerformancePlatformHero');
		expect(source).not.toContain('PerformanceLabBand');
	});

	it('lands the .io research decision in no more than five chapters', () => {
		const source = routeSource('packages/io/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(5);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceDecisionPanel');
		expect(source).toContain('PapersGrid');
		expect(source).toContain('PropertyFunnel');
		expect(source).not.toContain('PerformanceThesisConditions');
		expect(source).not.toContain('PerformanceContrastChapter');
		expect(source).not.toContain('PerformanceConversionHandoff');
		expect(source).toContain('Start from evidence. Decide whether to read, test, or scope.');
		expect(source).toContain('cost, speed, and maintenance drag');
		expect(source).toContain('policy packs, release checks, contracts, and runbooks');
		expect(source).toContain('Featured Work');
		expect(source).toContain('Research operator');
		expect(source.indexOf('Featured Work')).toBeLessThan(source.indexOf('<PropertyFunnel'));
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

	it('lands the .learn path in three chapters with proof and handoff intact', () => {
		const source = routeSource('packages/lms/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(4);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PropertyFunnel');
		expect(source).not.toContain('PerformanceThesisConditions');
		expect(source).not.toContain('PerformanceConversionHandoff');
		expect(source).toContain('Prompt. Create. Prove.');
		expect(source).toContain('workflowConditions');
		expect(source).toContain('Tool contract');
		expect(source).toContain('Working MCP + workflow image');
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
