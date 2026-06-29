import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const marketplaceInsightsSource = readFileSync(
	new URL('./components/MarketplaceInsights.svelte', import.meta.url),
	'utf8'
);
const marketplaceServerLoadSource = readFileSync(
	new URL('../routes/marketplace/+page.server.ts', import.meta.url),
	'utf8'
);
const marketplacePageSource = readFileSync(
	new URL('../routes/marketplace/+page.svelte', import.meta.url),
	'utf8'
);

describe('marketplace page regressions', () => {
	it('keeps Marketplace Insights controls bound directly to Svelte state', () => {
		expect(marketplaceInsightsSource).toContain('bind:value={searchQuery}');
		expect(marketplaceInsightsSource).toContain('bind:value={categoryFilter}');
		expect(marketplaceInsightsSource).toContain('bind:value={competitionFilter}');
		expect(marketplaceInsightsSource).toContain('bind:value={userCategoryFilter}');
		expect(marketplaceInsightsSource).toContain('bind:value={sortKey}');

		expect(marketplaceInsightsSource).not.toContain('handleCategoryFilterChange');
		expect(marketplaceInsightsSource).not.toContain('handleCompetitionFilterChange');
		expect(marketplaceInsightsSource).not.toContain('handleUserCategoryFilterChange');
		expect(marketplaceInsightsSource).not.toContain('handleGridSortChange');
	});

	it('does not block server render on marketplace analytics requests', () => {
		expect(marketplaceServerLoadSource).not.toContain('/api/analytics/leaderboard');
		expect(marketplaceServerLoadSource).not.toContain('/api/analytics/categories');
		expect(marketplaceServerLoadSource).toContain('marketplaceData: null');
		expect(marketplaceServerLoadSource).toContain('marketplaceError: null');

		expect(marketplacePageSource).toContain(
			'const shouldLoadMarketplaceOnMount = $derived(!data.marketplaceData && !data.marketplaceError);'
		);
		expect(marketplacePageSource).toContain('{#if shouldShowLoading}');
		expect(marketplacePageSource).toContain('void loadData();');
	});
});
