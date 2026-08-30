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
	'PerformanceNarrativeStage',
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
	const openingPattern = new RegExp(
		`^(\\s*)<(?:${HOMEPAGE_SECTION_COMPONENTS.join('|')}|section)\\b`,
		'gm'
	);
	const openings = [...markup.matchAll(openingPattern)].map((match) => ({
		indent: match[1].length,
		markup: match[0]
	}));
	const topLevelIndent = Math.min(...openings.map((opening) => opening.indent));
	return openings.filter((opening) => opening.indent === topLevelIndent).length;
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
	it('keeps compact decision consoles full-width below the desktop split', () => {
		const source = routeSource('packages/canon/src/lib/components/clear/ClearDecisionPanel.svelte');
		const responsiveRules = source.slice(source.indexOf('@media (max-width: 1180px)'));

		expect(responsiveRules).toContain(
			".clear-decision-panel[data-density='compact'] .clear-decision-panel__inner,"
		);
		expect(responsiveRules).toContain('grid-template-columns: 1fr;');
	});

	it('lands the .agency story in three chapters without duplicating its delivery roster', () => {
		const source = routeSource('packages/agency/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(3);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceNarrativeStage');
		expect(source).toContain('PerformanceConversionHandoff');
		expect(source).not.toContain('PerformanceContrastChapter');
		expect(source).not.toContain('PerformancePageSection');
		expect(source).not.toContain('PerformanceFieldSequence');
		expect(source).not.toContain('PerformanceEvidenceIndex');
		expect(source).not.toContain('MeridianCardGrid');
		expect(source).toContain('Your people and AI need the same playbook.');
		expect(source).toContain('Map the play before AI runs it.');
		expect(source).toContain('Advance approved work');
		expect(source).toContain('Protect the decision');
		expect(source).toContain('Review the receipt');
		expect(source).toContain('Built with OpenAI and Cloudflare. Designed to remain yours.');
	});

	it('keeps .ltd as a court and Playbook operator library instead of restoring the editorial shell', () => {
		const source = routeSource('packages/ltd/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(6);
		expect(source).toContain('ltdOperatingFieldMedia');
		expect(source).toContain('Run AI work people can trust.');
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceCardGrid');
		expect(source).not.toContain('PerformanceDecisionPanel');
		expect(source).toContain('PropertyFunnel');
		expect(source).toContain('NewsletterSignup');
		expect(source).not.toContain('PerformanceThesisConditions');
		expect(source).not.toContain('PerformancePlatformHero');
		expect(source).not.toContain('PerformanceLabBand');
	});

	it('lands the .io research decision in no more than three chapters', () => {
		const source = routeSource('packages/io/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(3);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceNarrativeStage');
		expect(source).not.toContain('PerformanceDecisionPanel');
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

	it('distills the .space entry surface to opening, runtime proof, route collection, and handoff', () => {
		const source = routeSource('packages/space/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(4);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceDecisionPanel');
		expect(source).toContain('PerformancePageSection');
		expect(source).toContain('PerformanceConversionHandoff');
		expect(source).toContain('PerformanceCardGrid');
		expect(source).not.toContain('PerformanceThesisConditions');
		expect(source).not.toContain('PerformanceContrastChapter');
		expect(source).not.toContain('MeridianCardGrid');
		expect(source).not.toContain('PropertyFunnel');
		expect(source).not.toContain('PerformanceLabBand');
		expect(source).not.toContain('PerformanceCtaBand');
	});

	it('lands the .learn path in three chapters with proof and handoff intact', () => {
		const source = routeSource('packages/lms/src/routes/+page.svelte');

		expect(homepageSectionCount(source)).toBeLessThanOrEqual(3);
		expect(source).toContain('PerformanceCampaignOpening');
		expect(source).toContain('PerformanceNarrativeStage');
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

	it('preserves every primary homepage destination inside the sharper compositions', () => {
		const destinationsByRoute = {
			'packages/agency/src/routes/+page.svelte': [
				'agencyCoreMessaging.selfMapHref',
				'/proof/marketplace-workflow',
				'/services',
				'/partners',
				'/products',
				'/field-reports/template-review',
				'/stack',
				'createsomething.ltd/canon/concepts/conviction-without-dependence'
			],
			'packages/ltd/src/routes/+page.svelte': [
				'/playbooks',
				'/readiness',
				'PropertyFunnel',
				'NewsletterSignup'
			],
			'packages/io/src/routes/+page.svelte': [
				'/papers',
				'/experiments',
				'/methodology',
				'/graph',
				'createsomething.space',
				'createsomething.agency/practice'
			],
			'packages/lms/src/routes/+page.svelte': ['/paths', 'firstLessonHref']
		};

		for (const [route, destinations] of Object.entries(destinationsByRoute)) {
			const source = routeSource(route);
			for (const destination of destinations) expect(source).toContain(destination);
		}
	});

	it('keeps the retired staff agent app on one explicit transition path', () => {
		const source = routeSource('packages/ona-agents/src/routes/agents/+page.svelte');

		expect(source.match(/data-performance-chapter=/g)).toHaveLength(3);
		expect(source).toContain('data-performance-chapter="thesis"');
		expect(source).toContain('data-performance-chapter="evidence-body"');
		expect(source).toContain('data-performance-chapter="continuation"');
		expect(source).toContain('This standalone agent app is closed.');
		expect(source).toContain('CRE-1233-RUNTIME');
		expect(source).toContain('CRE-1233-ROUTE');
		expect(source).toContain('CRE-1233-GATE');
		expect(source).not.toContain('class="agents-header');
		expect(source).not.toContain('class="proof-strip');
		expect(source).not.toContain('class="agent-grid');
		expect(source).not.toContain('PerformanceThesisConditions');
		expect(source).not.toContain('PerformanceEvidenceIndex');
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
