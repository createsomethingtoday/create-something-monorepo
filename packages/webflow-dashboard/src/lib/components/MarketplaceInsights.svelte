<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent, Badge } from './ui';

	interface LeaderboardEntry {
		templateName: string;
		category: string;
		totalSales30d: number;
		totalRevenue30d?: number;
		salesRank: number;
		revenueRank: number;
		isUserTemplate: boolean;
	}

	interface CategoryEntry {
		category: string;
		subcategory: string;
		templatesInSubcategory: number;
		totalSales30d: number;
		avgRevenuePerTemplate: number;
		revenueRank: number;
	}

	interface Insight {
		type: 'opportunity' | 'trend' | 'warning';
		message: string;
	}

	interface Props {
		leaderboard: LeaderboardEntry[];
		categories: CategoryEntry[];
		insights: Insight[];
		userTemplates: LeaderboardEntry[];
		summary: {
			totalMarketplaceSales: number;
			userBestRank: number | null;
			lastUpdated: string;
		};
	}

	let { leaderboard, categories, insights, userTemplates, summary }: Props = $props();

	let sortKey = $state<keyof CategoryEntry>('revenueRank');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let viewMode = $state<'table' | 'grid'>('table');

	const sortedCategories = $derived(() => {
		return [...categories].sort((a, b) => {
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			const multiplier = sortDirection === 'asc' ? 1 : -1;

			if (typeof aVal === 'string' && typeof bVal === 'string') {
				return aVal.localeCompare(bVal) * multiplier;
			}

			return ((aVal as number) - (bVal as number)) * multiplier;
		});
	});

	function handleSort(key: keyof CategoryEntry) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	function getCompetitionIndicator(templateCount: number) {
		if (templateCount < 10)
			return { level: 'Low', color: 'success', bars: 3 };
		if (templateCount < 30)
			return { level: 'Medium', color: 'info', bars: 5 };
		if (templateCount < 70)
			return { level: 'High', color: 'warning', bars: 8 };
		return { level: 'Very High', color: 'error', bars: 10 };
	}

	function getRankBadge(index: number) {
		if (index === 0) return { label: '1st', variant: 'warning' as const };
		if (index === 1) return { label: '2nd', variant: 'secondary' as const };
		if (index === 2) return { label: '3rd', variant: 'warning' as const };
		return { label: `#${index + 1}`, variant: 'default' as const };
	}

	const userCategories = $derived(() => new Set(userTemplates.map((t) => t.category)));
</script>

<div class="marketplace-insights">
	<!-- Summary Stats -->
	<div class="summary-grid">
		<Card>
			<CardContent>
				<div class="stat-card">
					<span class="stat-label">Marketplace Sales (30d)</span>
					<span class="stat-value">{summary.totalMarketplaceSales.toLocaleString()}</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="stat-card">
					<span class="stat-label">Your Best Rank</span>
					<span class="stat-value">
						{summary.userBestRank ? `#${summary.userBestRank}` : '-'}
					</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="stat-card">
					<span class="stat-label">Your Templates in Top 50</span>
					<span class="stat-value">{userTemplates.length}</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="stat-card">
					<span class="stat-label">Categories Tracked</span>
					<span class="stat-value">{categories.length}</span>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Insights -->
	{#if insights.length > 0}
		<section class="insights-section">
			<h3 class="section-title">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
					<path d="M9 18h6" />
					<path d="M10 22h4" />
				</svg>
				Market Insights
			</h3>
			<div class="insights-list">
				{#each insights as insight}
					<div class="insight-item insight-{insight.type}">
						{#if insight.type === 'opportunity'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
								<path d="m9 12 2 2 4-4" />
							</svg>
						{:else if insight.type === 'trend'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
								<polyline points="16 7 22 7 22 13" />
							</svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
								<path d="M12 9v4" />
								<path d="M12 17h.01" />
							</svg>
						{/if}
						<span>{insight.message}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Top Performers -->
	<section class="leaderboard-section">
		<h3 class="section-title">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
				<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
				<path d="M4 22h16" />
				<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
				<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
				<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
			</svg>
			Top Performers This Month
		</h3>
		<div class="leaderboard-grid">
			{#each leaderboard.slice(0, 5) as template, index}
				{@const badge = getRankBadge(index)}
				<div class="leaderboard-card" class:user-template={template.isUserTemplate}>
					<div class="leaderboard-header">
						<div class="rank-badge rank-{index + 1}">#{index + 1}</div>
						{#if template.isUserTemplate}
							<Badge variant="default">You</Badge>
						{/if}
					</div>
					<div class="leaderboard-content">
						<p class="template-name">{template.templateName}</p>
						<p class="template-category">{template.category}</p>
					</div>
					<div class="leaderboard-footer">
						<Badge variant={badge.variant}>{badge.label} Place</Badge>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Category Performance Table -->
	<section class="categories-section">
		<div class="categories-header">
			<h3 class="section-title">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
					<polyline points="16 7 22 7 22 13" />
				</svg>
				Category Performance (30-Day Window)
			</h3>
			<div class="view-toggle">
				<button
					class="toggle-btn"
					class:active={viewMode === 'table'}
					onclick={() => (viewMode = 'table')}
				>
					Table
				</button>
				<button
					class="toggle-btn"
					class:active={viewMode === 'grid'}
					onclick={() => (viewMode = 'grid')}
				>
					Grid
				</button>
			</div>
		</div>

		{#if viewMode === 'table'}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Category • Subcategory</th>
							<th class="sortable" onclick={() => handleSort('revenueRank')}>
								Rank
								{#if sortKey === 'revenueRank'}
									<span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</th>
							<th class="sortable" onclick={() => handleSort('templatesInSubcategory')}>
								Templates
								{#if sortKey === 'templatesInSubcategory'}
									<span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</th>
							<th class="sortable" onclick={() => handleSort('totalSales30d')}>
								Sales (30d)
								{#if sortKey === 'totalSales30d'}
									<span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</th>
							<th class="sortable" onclick={() => handleSort('avgRevenuePerTemplate')}>
								Avg Revenue
								{#if sortKey === 'avgRevenuePerTemplate'}
									<span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</th>
							<th>Competition</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedCategories() as category}
							{@const competition = getCompetitionIndicator(category.templatesInSubcategory)}
							{@const hasUserTemplate = userCategories().has(category.category)}
							<tr class:user-row={hasUserTemplate}>
								<td>
									<span class="category-name">{category.category} • {category.subcategory}</span>
									{#if hasUserTemplate}
										<span class="user-indicator">Your portfolio</span>
									{/if}
								</td>
								<td class="center">
									<span class="rank-pill">#{category.revenueRank}</span>
								</td>
								<td class="right">{category.templatesInSubcategory}</td>
								<td class="right">{category.totalSales30d.toLocaleString()}</td>
								<td class="right">
									<span class="revenue">${Math.round(category.avgRevenuePerTemplate).toLocaleString()}</span>
								</td>
								<td>
									<div class="competition-indicator">
										<div class="competition-bars">
											{#each Array(10) as _, i}
												<div class="bar" class:filled={i < competition.bars}></div>
											{/each}
										</div>
										<Badge variant={competition.color === 'success' ? 'success' : competition.color === 'warning' ? 'warning' : competition.color === 'error' ? 'error' : 'info'}>
											{competition.level}
										</Badge>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="categories-grid">
				{#each sortedCategories() as category}
					{@const competition = getCompetitionIndicator(category.templatesInSubcategory)}
					{@const hasUserTemplate = userCategories().has(category.category)}
					<div class="category-card" class:user-category={hasUserTemplate}>
						<div class="category-card-header">
							<div class="category-info">
								<span class="category-parent">{category.category}</span>
								<span class="category-name">{category.subcategory}</span>
							</div>
							<span class="rank-pill">#{category.revenueRank}</span>
						</div>
						<div class="category-metric">
							<span class="metric-value">${Math.round(category.avgRevenuePerTemplate).toLocaleString()}</span>
							<span class="metric-label">avg per template</span>
						</div>
						<div class="category-stats">
							<div class="stat">
								<span class="stat-label">Sales (30d)</span>
								<span class="stat-value">{category.totalSales30d.toLocaleString()}</span>
							</div>
							<div class="stat">
								<span class="stat-label">Templates</span>
								<span class="stat-value">{category.templatesInSubcategory}</span>
							</div>
						</div>
						<Badge variant={competition.color === 'success' ? 'success' : competition.color === 'warning' ? 'warning' : competition.color === 'error' ? 'error' : 'info'} class="competition-badge">
							{competition.level} Competition
						</Badge>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.marketplace-insights {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 1024px) {
		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.summary-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.stat-card .stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.stat-card .stat-value {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
	}

	.section-title svg {
		color: var(--color-info);
	}

	/* Insights */
	.insights-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.insight-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.insight-opportunity {
		background: var(--color-success-muted);
	}

	.insight-opportunity svg {
		color: var(--color-success);
	}

	.insight-trend {
		background: var(--color-info-muted);
	}

	.insight-trend svg {
		color: var(--color-info);
	}

	.insight-warning {
		background: var(--color-warning-muted);
	}

	.insight-warning svg {
		color: var(--color-warning);
	}

	/* Leaderboard */
	.leaderboard-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--space-sm);
	}

	@media (max-width: 1200px) {
		.leaderboard-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 768px) {
		.leaderboard-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.leaderboard-grid {
			grid-template-columns: 1fr;
		}
	}

	.leaderboard-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.leaderboard-card:hover {
		background: var(--color-hover);
	}

	.leaderboard-card.user-template {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
	}

	.leaderboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.rank-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		font-weight: var(--font-semibold);
		font-size: var(--text-body-sm);
	}

	.rank-badge.rank-1 {
		background: rgba(250, 204, 21, 0.2);
		color: #ca8a04;
	}

	.rank-badge.rank-2 {
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
	}

	.rank-badge.rank-3 {
		background: rgba(234, 88, 12, 0.2);
		color: #c2410c;
	}

	.rank-badge.rank-4,
	.rank-badge.rank-5 {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.leaderboard-content {
		flex: 1;
		margin-bottom: var(--space-sm);
	}

	.template-name {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.template-category {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.leaderboard-footer {
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	/* Categories */
	.categories-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.categories-header .section-title {
		margin: 0;
	}

	.view-toggle {
		display: flex;
		gap: var(--space-xs);
	}

	.toggle-btn {
		padding: var(--space-xs) var(--space-sm);
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-btn.active {
		background: var(--color-info);
		color: var(--color-fg-primary);
	}

	.table-container {
		overflow-x: auto;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
	}

	.data-table th,
	.data-table td {
		padding: var(--space-sm) var(--space-md);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.data-table th {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
	}

	.data-table th.sortable {
		cursor: pointer;
	}

	.data-table th.sortable:hover {
		background: var(--color-hover);
	}

	.sort-icon {
		margin-left: var(--space-xs);
	}

	.data-table td {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.data-table tr:last-child td {
		border-bottom: none;
	}

	.data-table tr.user-row {
		background: var(--color-info-muted);
	}

	.data-table .center {
		text-align: center;
	}

	.data-table .right {
		text-align: right;
	}

	.category-name {
		font-weight: var(--font-medium);
	}

	.user-indicator {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-info);
		margin-top: 2px;
	}

	.rank-pill {
		display: inline-flex;
		padding: 2px 8px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.revenue {
		font-weight: var(--font-semibold);
	}

	.competition-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.competition-bars {
		display: flex;
		gap: 2px;
		flex: 1;
	}

	.competition-bars .bar {
		flex: 1;
		height: 1rem;
		background: var(--color-bg-subtle);
		border-radius: 2px;
	}

	.competition-bars .bar.filled {
		background: var(--color-fg-muted);
	}

	/* Grid View */
	.categories-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 1200px) {
		.categories-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 768px) {
		.categories-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.categories-grid {
			grid-template-columns: 1fr;
		}
	}

	.category-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.category-card.user-category {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
	}

	.category-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.category-info {
		display: flex;
		flex-direction: column;
	}

	.category-parent {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.category-info .category-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.category-metric {
		display: flex;
		flex-direction: column;
	}

	.category-metric .metric-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.category-metric .metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.category-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}

	.category-stats .stat {
		display: flex;
		flex-direction: column;
	}

	.category-stats .stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.category-stats .stat-value {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	:global(.competition-badge) {
		text-align: center;
	}
</style>
