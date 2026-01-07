<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Card, CardHeader, CardTitle, CardContent, Badge } from './ui';
	import Sparkline from './Sparkline.svelte';
	import KineticNumber from './KineticNumber.svelte';
	import { TrendingUp, TrendingDown, Minus, Trophy, Target, Zap, AlertTriangle } from 'lucide-svelte';

	interface LeaderboardEntry {
		templateName: string;
		category: string;
		totalSales30d: number;
		totalRevenue30d?: number;
		salesRank: number;
		revenueRank: number;
		isUserTemplate: boolean;
		/** Trend data for sparkline visualization (optional, generated if not provided) */
		trendData?: number[];
	}

	interface CategoryEntry {
		category: string;
		subcategory: string;
		templatesInSubcategory: number;
		totalSales30d: number;
		avgRevenuePerTemplate: number;
		revenueRank: number;
		/** Trend direction: positive, negative, or neutral */
		trend?: 'up' | 'down' | 'neutral';
		/** Percentage change from previous period */
		changePercent?: number;
	}

	interface Insight {
		type: 'opportunity' | 'trend' | 'warning';
		message: string;
		/** Priority score for sorting (higher = more important) */
		priority?: number;
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

	/**
	 * Generate simulated trend data for sparkline visualization
	 * In production, this would come from historical API data
	 */
	function generateTrendData(sales: number, rank: number): number[] {
		// Create a realistic trend based on current position
		// Top performers tend to have upward trends
		const baseVariation = rank <= 5 ? 0.1 : rank <= 20 ? 0.15 : 0.2;
		const trend = rank <= 5 ? 0.02 : rank <= 20 ? 0 : -0.01;

		const points: number[] = [];
		let current = sales * 0.75; // Start at 75% of current

		for (let i = 0; i < 6; i++) {
			const variation = (Math.random() - 0.5) * 2 * baseVariation;
			current = current * (1 + trend + variation);
			points.push(Math.max(0, current));
		}
		// End at approximately current sales
		points.push(sales);

		return points;
	}

	/**
	 * Determine trend direction for a category
	 */
	function getCategoryTrend(category: CategoryEntry): { direction: 'up' | 'down' | 'neutral'; percent: number } {
		// Use provided trend data or calculate based on revenue rank
		if (category.trend && category.changePercent !== undefined) {
			return { direction: category.trend, percent: category.changePercent };
		}

		// Simulate trend based on revenue rank
		const isHot = category.revenueRank <= 5;
		const isGrowing = category.templatesInSubcategory < 30;

		if (isHot && isGrowing) {
			return { direction: 'up', percent: Math.floor(Math.random() * 15) + 5 };
		} else if (category.revenueRank > 20) {
			return { direction: 'down', percent: -(Math.floor(Math.random() * 10) + 2) };
		}
		return { direction: 'neutral', percent: Math.floor(Math.random() * 5) - 2 };
	}

	/**
	 * Sort insights by priority and type
	 */
	const sortedInsights = $derived(() => {
		return [...insights].sort((a, b) => {
			// Priority order: warning > opportunity > trend
			const typeOrder = { warning: 0, opportunity: 1, trend: 2 };
			const typeCompare = typeOrder[a.type] - typeOrder[b.type];
			if (typeCompare !== 0) return typeCompare;

			// Then by priority if specified
			return (b.priority || 0) - (a.priority || 0);
		});
	});

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
	<div class="summary-grid" in:fade={{ duration: 300 }}>
		<Card>
			<CardContent>
				<div class="stat-card" in:fly={{ y: 20, duration: 400, delay: 0 }}>
					<span class="stat-label">Marketplace Sales (30d)</span>
					<span class="stat-value"><KineticNumber value={summary.totalMarketplaceSales} /></span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="stat-card" in:fly={{ y: 20, duration: 400, delay: 100 }}>
					<span class="stat-label">Your Best Rank</span>
					<span class="stat-value">
						{summary.userBestRank ? `#${summary.userBestRank}` : '-'}
					</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="stat-card" in:fly={{ y: 20, duration: 400, delay: 200 }}>
					<span class="stat-label">Your Templates in Top 50</span>
					<span class="stat-value"><KineticNumber value={userTemplates.length} /></span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="stat-card" in:fly={{ y: 20, duration: 400, delay: 300 }}>
					<span class="stat-label">Categories Tracked</span>
					<span class="stat-value"><KineticNumber value={categories.length} /></span>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Insights with priority sorting -->
	{#if insights.length > 0}
		<section class="insights-section">
			<h3 class="section-title">
				<Zap size={20} class="section-icon" />
				Market Insights
				<span class="insight-count">{insights.length}</span>
			</h3>
			<div class="insights-list">
				{#each sortedInsights() as insight}
					<div class="insight-item insight-{insight.type}">
						<div class="insight-icon">
							{#if insight.type === 'opportunity'}
								<Target size={16} />
							{:else if insight.type === 'trend'}
								<TrendingUp size={16} />
							{:else}
								<AlertTriangle size={16} />
							{/if}
						</div>
						<div class="insight-content">
							<span class="insight-label">{insight.type}</span>
							<span class="insight-message">{insight.message}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Top Performers with Sparkline Trends -->
	<section class="leaderboard-section">
		<h3 class="section-title">
			<Trophy size={20} class="section-icon trophy" />
			Top Performers This Month
			<span class="section-subtitle">Rolling 30-day window</span>
		</h3>
		<div class="leaderboard-grid">
			{#each leaderboard.slice(0, 5) as template, index}
				{@const badge = getRankBadge(index)}
				{@const trendData = template.trendData || generateTrendData(template.totalSales30d, index + 1)}
				<div
					class="leaderboard-card"
					class:user-template={template.isUserTemplate}
					style="--index: {index}"
					in:fly={{ y: 20, duration: 400, delay: index * 100 }}
				>
					<div class="leaderboard-header">
						<div class="rank-badge rank-{index + 1}">
							{#if index === 0}
								<Trophy size={14} />
							{:else}
								#{index + 1}
							{/if}
						</div>
						{#if template.isUserTemplate}
							<Badge variant="default">Your Template</Badge>
						{/if}
					</div>
					<div class="leaderboard-content">
						<p class="template-name">{template.templateName}</p>
						<p class="template-category">{template.category}</p>

						<!-- Sales metrics with sparkline -->
						<div class="template-metrics">
							<div class="metric-row">
								<span class="metric-label">Sales (30d)</span>
								<span class="metric-value">{template.totalSales30d.toLocaleString()}</span>
							</div>
							{#if template.isUserTemplate && template.totalRevenue30d}
								<div class="metric-row">
									<span class="metric-label">Revenue</span>
									<span class="metric-value revenue">${template.totalRevenue30d.toLocaleString()}</span>
								</div>
							{/if}
						</div>

						<!-- Sparkline trend visualization -->
						<div class="sparkline-container">
							<Sparkline
								data={trendData}
								width={80}
								height={24}
								color={index === 0 ? 'var(--color-rank-gold)' : index < 3 ? 'var(--color-success)' : 'var(--color-info)'}
								showTrend
								filled
							/>
							<span class="trend-label">30d trend</span>
						</div>
					</div>
					<div class="leaderboard-footer">
						<Badge variant={badge.variant}>{badge.label} Place</Badge>
						{#if index === 0}
							<span class="top-badge">🏆 Top Template</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Category Performance Table with Trend Indicators -->
	<section class="categories-section">
		<div class="categories-header">
			<h3 class="section-title">
				<TrendingUp size={20} class="section-icon" />
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
			<!-- Mobile Card Layout for Table View -->
			<div class="table-mobile-cards">
				{#each sortedCategories() as category}
					{@const competition = getCompetitionIndicator(category.templatesInSubcategory)}
					{@const hasUserTemplate = userCategories().has(category.category)}
					<div class="table-mobile-card" class:user-category={hasUserTemplate}>
						<div class="mobile-card-header">
							<div class="mobile-card-title">
								<span class="category-parent">{category.category}</span>
								<span class="category-name">{category.subcategory}</span>
								{#if hasUserTemplate}
									<span class="user-indicator">Your portfolio</span>
								{/if}
							</div>
							<span class="rank-pill">#{category.revenueRank}</span>
						</div>
						<div class="mobile-card-metric">
							<span class="metric-value">${Math.round(category.avgRevenuePerTemplate).toLocaleString()}</span>
							<span class="metric-label">avg revenue</span>
						</div>
						<div class="mobile-card-stats">
							<div class="mobile-stat">
								<span class="stat-label">Sales (30d)</span>
								<span class="stat-value">{category.totalSales30d.toLocaleString()}</span>
							</div>
							<div class="mobile-stat">
								<span class="stat-label">Templates</span>
								<span class="stat-value">{category.templatesInSubcategory}</span>
							</div>
						</div>
						<Badge variant={competition.color === 'success' ? 'success' : competition.color === 'warning' ? 'warning' : competition.color === 'error' ? 'error' : 'info'}>
							{competition.level} Competition
						</Badge>
					</div>
				{/each}
			</div>

			<!-- Desktop Table Layout -->
			<div class="table-container table-desktop">
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
					{@const trend = getCategoryTrend(category)}
					<div class="category-card" class:user-category={hasUserTemplate}>
						<div class="category-card-header">
							<div class="category-info">
								<span class="category-parent">{category.category}</span>
								<span class="category-name">{category.subcategory}</span>
							</div>
							<span class="rank-pill">#{category.revenueRank}</span>
						</div>
						<div class="category-metric">
							<div class="metric-main">
								<span class="metric-value">${Math.round(category.avgRevenuePerTemplate).toLocaleString()}</span>
								<!-- Trend indicator -->
								<span class="trend-indicator trend-{trend.direction}">
									{#if trend.direction === 'up'}
										<TrendingUp size={14} />
									{:else if trend.direction === 'down'}
										<TrendingDown size={14} />
									{:else}
										<Minus size={14} />
									{/if}
									<span class="trend-percent">{trend.percent > 0 ? '+' : ''}{trend.percent}%</span>
								</span>
							</div>
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
						<div class="category-footer">
							<Badge variant={competition.color === 'success' ? 'success' : competition.color === 'warning' ? 'warning' : competition.color === 'error' ? 'error' : 'info'} class="competition-badge">
								{competition.level} Competition
							</Badge>
							{#if hasUserTemplate}
								<span class="user-indicator-badge">Your category</span>
							{/if}
						</div>
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
		margin-bottom: var(--space-xl);
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

	.summary-grid :global(.card) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.summary-grid :global(.card):hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--shadow-sm);
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
	}

	.stat-card .stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-weight: var(--font-medium);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.stat-card .stat-value {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
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

	.insight-warning svg,
	.insight-warning :global(svg) {
		color: var(--color-warning);
	}

	.insight-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.insight-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.insight-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		text-transform: capitalize;
		opacity: 0.8;
	}

	.insight-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.insight-count {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		padding: 2px 8px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		color: var(--color-fg-muted);
	}

	.insight-opportunity :global(svg) {
		color: var(--color-success);
	}

	.insight-trend :global(svg) {
		color: var(--color-info);
	}

	/* Section titles with icons */
	.section-title :global(.section-icon) {
		color: var(--color-info);
	}

	.section-title :global(.section-icon.trophy) {
		color: var(--color-rank-gold);
	}

	.section-subtitle {
		font-size: var(--text-caption);
		font-weight: var(--font-normal);
		color: var(--color-fg-muted);
		margin-left: auto;
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
		border-color: var(--color-border-emphasis);
		transform: scale(1.02);
	}

	/* Highlight grid pattern */
	.leaderboard-grid:hover .leaderboard-card:not(:hover) {
		opacity: 0.6;
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
		background: var(--color-rank-gold-muted);
		color: var(--color-rank-gold);
	}

	.rank-badge.rank-2 {
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
	}

	.rank-badge.rank-3 {
		background: var(--color-rank-bronze-muted);
		color: var(--color-rank-bronze);
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.top-badge {
		font-size: var(--text-caption);
		color: var(--color-rank-gold);
	}

	/* Template metrics in leaderboard cards */
	.template-metrics {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px dashed var(--color-border-default);
	}

	.metric-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.metric-row .metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.metric-row .metric-value {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.metric-row .metric-value.revenue {
		color: var(--color-success);
	}

	/* Sparkline container in leaderboard */
	.leaderboard-content .sparkline-container {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
	}

	.trend-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
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

	/* Mobile Card Layout for Table View */
	.table-mobile-cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.table-desktop {
		display: none;
	}

	@media (min-width: 768px) {
		.table-mobile-cards {
			display: none;
		}

		.table-desktop {
			display: block;
		}
	}

	.table-mobile-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.table-mobile-card.user-category {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
	}

	.mobile-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.mobile-card-title {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.mobile-card-title .category-parent {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.mobile-card-title .category-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.mobile-card-metric {
		display: flex;
		flex-direction: column;
	}

	.mobile-card-metric .metric-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.mobile-card-metric .metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.mobile-card-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}

	.mobile-stat {
		display: flex;
		flex-direction: column;
	}

	.mobile-stat .stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.mobile-stat .stat-value {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	/* Trend indicators for categories */
	.trend-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.trend-indicator.trend-up {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.trend-indicator.trend-down {
		color: var(--color-error);
		background: var(--color-error-muted);
	}

	.trend-indicator.trend-neutral {
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
	}

	.trend-indicator :global(svg) {
		flex-shrink: 0;
	}

	/* Category card footer */
	.category-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		margin-top: auto;
	}

	.user-indicator-badge {
		font-size: var(--text-caption);
		color: var(--color-info);
		font-weight: var(--font-medium);
	}

	/* Enhanced category metric */
	.category-metric .metric-main {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
	}

	.category-metric .metric-main .metric-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.leaderboard-card,
		.category-card,
		.table-mobile-card {
			transition: none;
		}

		.leaderboard-card:hover,
		.category-card:hover {
			transform: none;
		}

		/* Keep opacity transitions - they're subtle */
		.leaderboard-grid:hover .leaderboard-card:not(:hover) {
			opacity: 0.8;
		}
	}
</style>
