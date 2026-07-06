import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

const CLEAR_VISUAL_SCENARIOS = [
	{
		component: 'ClearActionFooter',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearActionFooter.svelte',
		states: ['primary-action', 'secondary-action', 'proof-note', 'mobile-stack']
	},
	{
		component: 'ClearArtifactCard',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearArtifactCard.svelte',
		states: ['default', 'with-link', 'status-emphasis', 'long-description']
	},
	{
		component: 'ClearContentHighlights',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearContentHighlights.svelte',
		states: ['two-items', 'three-items', 'with-proof', 'mobile-wrap']
	},
	{
		component: 'ClearErrorPage',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearErrorPage.svelte',
		states: ['not-found', 'blocked', 'retry-action', 'support-route']
	},
	{
		component: 'ClearLogoStrip',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearLogoStrip.svelte',
		states: ['compact', 'labeled', 'many-logos', 'mobile-scroll']
	},
	{
		component: 'ClearMetadataRail',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearMetadataRail.svelte',
		states: ['owner-state', 'receipt-list', 'dense-metadata', 'mobile-stack']
	},
	{
		component: 'ClearPageSection',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPageSection.svelte',
		states: ['hero', 'content', 'aside', 'action-band']
	},
	{
		component: 'ClearPillarGrid',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPillarGrid.svelte',
		states: ['three-pillars', 'with-proof', 'long-copy', 'mobile-grid']
	},
	{
		component: 'ClearPlatformHero',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPlatformHero.svelte',
		states: ['first-viewport', 'with-proof-strip', 'with-actions', 'mobile']
	},
	{
		component: 'ClearProofStrip',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearProofStrip.svelte',
		states: ['three-proofs', 'with-links', 'dense-receipts', 'mobile-wrap']
	},
	{
		component: 'ClearQuoteMetricPanel',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearQuoteMetricPanel.svelte',
		states: ['quote-first', 'metric-first', 'long-attribution', 'mobile-stack']
	},
	{
		component: 'ClearReceiptGrid',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearReceiptGrid.svelte',
		states: ['ready', 'blocked', 'mixed-status', 'mobile-grid']
	},
	{
		component: 'ClearSecurityPanel',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearSecurityPanel.svelte',
		states: ['policy-controls', 'access-controls', 'risk-summary', 'mobile-stack']
	},
	{
		component: 'ClearStateRows',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearStateRows.svelte',
		states: ['ready-review-blocked', 'owner-receipt', 'long-labels', 'mobile-stack']
	},
	{
		component: 'ClearUseCaseBand',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearUseCaseBand.svelte',
		states: ['single-case', 'multi-case', 'with-actions', 'mobile-stack']
	},
	{
		component: 'ClearWorkflowMiniArtifact',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearWorkflowMiniArtifact.svelte',
		states: ['ready', 'review', 'blocked', 'compact-glasses']
	}
] as const;

describe('Canon Clear visual regression scenarios', () => {
	it('keeps every stable Clear primitive attached to named visual states', () => {
		for (const scenario of CLEAR_VISUAL_SCENARIOS) {
			expect(existsSync(join(REPO_ROOT, scenario.sourcePath)), scenario.component).toBe(true);
			expect(scenario.states.length, scenario.component).toBeGreaterThanOrEqual(4);
		}
	});
});
