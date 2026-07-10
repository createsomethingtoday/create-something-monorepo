import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');
const ACTIVE_PROPERTY_SOURCE_DIRECTORIES = [
	'packages/agency/src',
	'packages/ltd/src',
	'packages/io/src',
	'packages/space/src',
	'packages/lms/src',
	'packages/ona-agents/src'
] as const;

const OWNED_PERFORMANCE_OVERLAY_FILES = [
	'packages/canon/src/lib/overlays/project-template/theme.css',
	'packages/canon/src/lib/overlays/project-template/tokens.json',
	'packages/agency/canon-overlay/theme.css',
	'packages/agency/canon-overlay/tokens.json',
	'packages/ltd/canon-overlay/theme.css',
	'packages/ltd/canon-overlay/tokens.json',
	'packages/io/canon-overlay/theme.css',
	'packages/io/canon-overlay/tokens.json',
	'packages/space/canon-overlay/theme.css',
	'packages/space/canon-overlay/tokens.json',
	'packages/lms/canon-overlay/theme.css',
	'packages/lms/canon-overlay/tokens.json',
	'packages/ona-agents/canon-overlay/theme.css',
	'packages/ona-agents/canon-overlay/tokens.json'
] as const;

function collectSourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return collectSourceFiles(path);
		return /\.(?:css|svelte|ts)$/.test(entry.name) ? [path] : [];
	});
}

const PERFORMANCE_VISUAL_SCENARIOS = [
	{
		component: 'PerformanceActionFooter',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearActionFooter.svelte',
		states: ['primary-action', 'secondary-action', 'proof-note', 'mobile-stack']
	},
	{
		component: 'PerformanceArtifactCard',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearArtifactCard.svelte',
		states: ['default', 'with-link', 'status-emphasis', 'long-description']
	},
	{
		component: 'PerformanceCardGrid',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearCardGrid.svelte',
		states: ['one-column', 'three-columns', 'linked-cards', 'mobile-stack']
	},
	{
		component: 'PerformanceContentHighlights',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearContentHighlights.svelte',
		states: ['two-items', 'three-items', 'with-proof', 'mobile-wrap']
	},
	{
		component: 'PerformanceCtaBand',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearCtaBand.svelte',
		states: ['primary-action', 'dual-action', 'outcome-items', 'mobile-stack']
	},
	{
		component: 'PerformanceDecisionPanel',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearDecisionPanel.svelte',
		states: ['allow', 'review', 'block', 'mobile-stack']
	},
	{
		component: 'PerformanceErrorPage',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearErrorPage.svelte',
		states: ['not-found', 'blocked', 'retry-action', 'support-route']
	},
	{
		component: 'PerformanceLogoStrip',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearLogoStrip.svelte',
		states: ['compact', 'labeled', 'many-logos', 'mobile-scroll']
	},
	{
		component: 'PerformanceMetadataRail',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearMetadataRail.svelte',
		states: ['owner-state', 'receipt-list', 'dense-metadata', 'mobile-stack']
	},
	{
		component: 'PerformancePageSection',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPageSection.svelte',
		states: ['hero', 'content', 'aside', 'action-band']
	},
	{
		component: 'PerformancePillarGrid',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPillarGrid.svelte',
		states: ['three-pillars', 'with-proof', 'long-copy', 'mobile-grid']
	},
	{
		component: 'PerformancePlatformHero',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPlatformHero.svelte',
		states: ['first-viewport', 'with-proof-strip', 'with-actions', 'mobile']
	},
	{
		component: 'PerformanceProofStrip',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearProofStrip.svelte',
		states: ['three-proofs', 'with-links', 'dense-receipts', 'mobile-wrap']
	},
	{
		component: 'PerformanceQuoteMetricPanel',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearQuoteMetricPanel.svelte',
		states: ['quote-first', 'metric-first', 'long-attribution', 'mobile-stack']
	},
	{
		component: 'PerformanceReceiptGrid',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearReceiptGrid.svelte',
		states: ['ready', 'blocked', 'mixed-status', 'mobile-grid']
	},
	{
		component: 'PerformanceSecurityPanel',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearSecurityPanel.svelte',
		states: ['policy-controls', 'access-controls', 'risk-summary', 'mobile-stack']
	},
	{
		component: 'PerformanceStateRows',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearStateRows.svelte',
		states: ['ready-review-blocked', 'owner-receipt', 'long-labels', 'mobile-stack']
	},
	{
		component: 'PerformanceUseCaseBand',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearUseCaseBand.svelte',
		states: ['single-case', 'multi-case', 'with-actions', 'mobile-stack']
	},
	{
		component: 'PerformanceWorkflowMiniArtifact',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearWorkflowMiniArtifact.svelte',
		states: ['ready', 'review', 'blocked', 'compact-glasses']
	}
] as const;

const PERFORMANCE_EXPORTS = [
	'PerformanceActionFooter',
	'PerformanceArtifactCard',
	'PerformanceCardGrid',
	'PerformanceContentHighlights',
	'PerformanceCtaBand',
	'PerformanceDecisionPanel',
	'PerformanceErrorPage',
	'PerformanceLogoStrip',
	'PerformanceMetadataRail',
	'PerformancePageSection',
	'PerformancePillarGrid',
	'PerformancePlatformHero',
	'PerformanceProofStrip',
	'PerformanceQuoteMetricPanel',
	'PerformanceReceiptGrid',
	'PerformanceSecurityPanel',
	'PerformanceStateRows',
	'PerformanceUseCaseBand',
	'PerformanceWorkflowMiniArtifact'
] as const;

describe('Canon Performance Lab visual regression scenarios', () => {
	it('keeps every stable Performance primitive attached to named visual states', () => {
		for (const scenario of PERFORMANCE_VISUAL_SCENARIOS) {
			expect(existsSync(join(REPO_ROOT, scenario.sourcePath)), scenario.component).toBe(true);
			expect(scenario.states.length, scenario.component).toBeGreaterThanOrEqual(4);
		}
	});

	it('publishes Performance names as the preferred component API', () => {
		const source = readFileSync(
			join(REPO_ROOT, 'packages/canon/src/lib/components/performance/index.ts'),
			'utf8'
		);

		for (const component of PERFORMANCE_EXPORTS) {
			expect(source, component).toContain(component);
		}
	});

	it('keeps the shared surface implementation independent of legacy Clear tokens', () => {
		const implementationDirectory = join(REPO_ROOT, 'packages/canon/src/lib/components/clear');
		const implementationFiles = readdirSync(implementationDirectory).filter((file) =>
			file.endsWith('.svelte')
		);
		const legacyToken = /--(?:color|radius|shadow|content-width)-clear(?:-|\b)/;

		for (const file of implementationFiles) {
			const source = readFileSync(join(implementationDirectory, file), 'utf8');
			expect(source, file).not.toMatch(legacyToken);
		}
	});

	it('keeps the shared button primitive flat, squared, and Performance-token driven', () => {
		const source = readFileSync(
			join(REPO_ROOT, 'packages/canon/src/lib/components/Button.svelte'),
			'utf8'
		);

		expect(source).not.toContain('border-radius: 999px');
		expect(source).not.toContain('linear-gradient');
		expect(source).not.toContain('translateY');
		expect(source).toContain('var(--radius-performance-sm)');
		expect(source).toContain('var(--color-performance-ink)');
	});

	it('keeps active property sources on the owned Performance API', () => {
		for (const sourceDirectory of ACTIVE_PROPERTY_SOURCE_DIRECTORIES) {
			for (const file of collectSourceFiles(join(REPO_ROOT, sourceDirectory))) {
				const source = readFileSync(file, 'utf8');
				expect(source, file).not.toMatch(/\bClear[A-Z]/);
				expect(source, file).not.toMatch(/--(?:color|radius|shadow|content-width)-clear(?:-|\b)/);
				expect(source, file).not.toMatch(/visualStyle\s*=\s*["']clear["']/);
			}
		}
	});

	it('keeps owned property overlays on Performance tokens', () => {
		for (const relativePath of OWNED_PERFORMANCE_OVERLAY_FILES) {
			const source = readFileSync(join(REPO_ROOT, relativePath), 'utf8');
			expect(source, relativePath).not.toMatch(/--(?:color|radius|shadow|content-width)-clear(?:-|\b)/);
			expect(source, relativePath).not.toMatch(/\{(?:color|radius)\.clear(?:\.|\})/);
		}
	});

	it('keeps public examples and preferred DOM hooks on Performance naming', () => {
		const readme = readFileSync(join(REPO_ROOT, 'packages/canon/README.md'), 'utf8');
		const evidence = readFileSync(
			join(REPO_ROOT, 'packages/canon/src/routes/visual-evidence/[group]/+page.svelte'),
			'utf8'
		);
		const navigation = readFileSync(
			join(REPO_ROOT, 'packages/canon/src/lib/components/Navigation.svelte'),
			'utf8'
		);
		const footer = readFileSync(
			join(REPO_ROOT, 'packages/canon/src/lib/components/Footer.svelte'),
			'utf8'
		);

		expect(readme).toContain('PerformanceDecisionPanel');
		expect(readme).not.toContain('<ClearDecisionPanel');
		expect(readme).not.toContain('visualStyle="clear"');
		expect(evidence).not.toMatch(/\bClear[A-Z]/);
		expect(navigation).toContain('class:nav-performance={usesPerformanceStyle}');
		expect(footer).toContain('class:footer-performance={usesPerformanceStyle}');
	});

	it('keeps the operator shell independent of Ona fonts and visible Ona naming', () => {
		const sourceDirectory = join(REPO_ROOT, 'packages/ona-agents/src');
		for (const file of collectSourceFiles(sourceDirectory)) {
			const source = readFileSync(file, 'utf8');
			expect(source, file).not.toContain('https://ona.com');
			expect(source, file).not.toMatch(/\bOna\b/);
		}
	});

	it('codifies Performance and Safety as reusable state, rail, and receipt primitives', () => {
		const tokens = readFileSync(join(REPO_ROOT, 'packages/canon/src/lib/styles/tokens.css'), 'utf8');
		const performance = readFileSync(
			join(REPO_ROOT, 'packages/canon/src/lib/styles/performance.css'),
			'utf8'
		);
		const cta = readFileSync(
			join(REPO_ROOT, 'packages/canon/src/lib/components/clear/ClearCtaBand.svelte'),
			'utf8'
		);

		for (const state of ['controlled', 'ready', 'review', 'stop']) {
			expect(tokens).toContain(`--color-performance-${state}`);
		}
		expect(performance).toContain('.performance-control-rail');
		expect(performance).toContain('.performance-receipt-stamp');
		expect(cta).toContain('data-control-state');
	});
});
