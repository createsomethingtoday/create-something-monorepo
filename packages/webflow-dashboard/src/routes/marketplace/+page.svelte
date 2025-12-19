<script lang="ts">
	import type { PageData } from './$types';
	import { Header } from '$lib/components/layout';
	import { Card, CardContent } from '$lib/components/ui';
	import {
		TrendingUp,
		BarChart3,
		Trophy,
		DollarSign,
		ShoppingCart,
		Layers,
		Crown
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const categories = $derived(data.categories ?? []);
	const leaderboard = $derived(data.leaderboard ?? []);
	const summary = $derived(data.summary);

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatNumber(value: number): string {
		return new Intl.NumberFormat('en-US').format(value);
	}

	function getRankingBadge(ranking: number): string {
		if (ranking === 1) return 'gold';
		if (ranking === 2) return 'silver';
		if (ranking === 3) return 'bronze';
		return 'default';
	}
</script>

<svelte:head>
	<title>Marketplace Insights | Webflow Asset Dashboard</title>
</svelte:head>

<Header userEmail={data.user?.email} />

<main class="main">
	<div class="content">
		<header class="page-header">
			<h1 class="page-title">Marketplace Insights</h1>
			<p class="page-subtitle">Analytics and performance data across the Webflow Marketplace</p>
		</header>

		<!-- Summary Cards -->
		<div class="summary-grid">
			<Card>
				<CardContent>
					<div class="metric-card">
						<div class="metric-icon">
							<Layers size={24} />
						</div>
						<div class="metric-content">
							<span class="metric-value">{summary.totalCategories}</span>
							<span class="metric-label">Categories</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent>
					<div class="metric-card">
						<div class="metric-icon">
							<DollarSign size={24} />
						</div>
						<div class="metric-content">
							<span class="metric-value">{formatCurrency(summary.totalCategoryRevenue)}</span>
							<span class="metric-label">Total Revenue</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent>
					<div class="metric-card">
						<div class="metric-icon">
							<BarChart3 size={24} />
						</div>
						<div class="metric-content">
							<span class="metric-value">{formatNumber(summary.totalTemplates)}</span>
							<span class="metric-label">Templates</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent>
					<div class="metric-card">
						<div class="metric-icon crown">
							<Crown size={24} />
						</div>
						<div class="metric-content">
							<span class="metric-value top-category">{summary.topCategory}</span>
							<span class="metric-label">Top Category</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>

		<div class="insights-layout">
			<!-- Category Performance -->
			<section class="insights-section">
				<Card>
					<CardContent>
						<header class="section-header">
							<div class="section-title-row">
								<TrendingUp size={20} />
								<h2 class="section-title">Category Performance</h2>
							</div>
							<p class="section-subtitle">Revenue and template count by category</p>
						</header>

						{#if categories.length > 0}
							<div class="table-container">
								<table class="data-table">
									<thead>
										<tr>
											<th class="rank-col">#</th>
											<th>Category</th>
											<th class="number-col">Templates</th>
											<th class="number-col">Revenue</th>
											<th class="number-col">Avg/Template</th>
										</tr>
									</thead>
									<tbody>
										{#each categories as category}
											<tr>
												<td class="rank-col">
													<span class="ranking-badge {getRankingBadge(category.ranking)}">
														{category.ranking}
													</span>
												</td>
												<td class="category-name">{category.category}</td>
												<td class="number-col">{formatNumber(category.count)}</td>
												<td class="number-col revenue">{formatCurrency(category.revenue)}</td>
												<td class="number-col">{formatCurrency(category.avgRevenue)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<div class="empty-state">
								<p>No category data available</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</section>

			<!-- Top Templates Leaderboard -->
			<section class="insights-section">
				<Card>
					<CardContent>
						<header class="section-header">
							<div class="section-title-row">
								<Trophy size={20} />
								<h2 class="section-title">Top Templates</h2>
							</div>
							<p class="section-subtitle">Highest performing templates by revenue</p>
						</header>

						{#if leaderboard.length > 0}
							<div class="leaderboard-list">
								{#each leaderboard as template}
									<a href="/assets/{template.id}" class="leaderboard-item">
										<div class="leaderboard-rank">
											<span class="ranking-badge {getRankingBadge(template.ranking)}">
												{template.ranking}
											</span>
										</div>
										<div class="leaderboard-thumbnail">
											{#if template.thumbnailUrl}
												<img src={template.thumbnailUrl} alt={template.name} />
											{:else}
												<div class="placeholder-thumb">
													<Layers size={20} />
												</div>
											{/if}
										</div>
										<div class="leaderboard-info">
											<span class="template-name">{template.name}</span>
											<span class="template-category">{template.category}</span>
										</div>
										<div class="leaderboard-stats">
											<span class="stat revenue">{formatCurrency(template.revenue)}</span>
											<span class="stat purchases">
												<ShoppingCart size={12} />
												{formatNumber(template.purchases)}
											</span>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<div class="empty-state">
								<p>No leaderboard data available</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</section>
		</div>
	</div>
</main>

<style>
	.main {
		min-height: calc(100vh - 60px);
	}

	.content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-title {
		font-family: var(--font-sans);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.page-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Summary Grid */
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
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

	.metric-card {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.metric-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--color-hover);
		border-radius: var(--radius-lg);
		color: var(--webflow-blue);
	}

	.metric-icon.crown {
		color: #f59e0b;
	}

	.metric-content {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.metric-value.top-category {
		font-size: var(--text-body);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Insights Layout */
	.insights-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	@media (max-width: 1024px) {
		.insights-layout {
			grid-template-columns: 1fr;
		}
	}

	.insights-section {
		min-width: 0;
	}

	.section-header {
		margin-bottom: 1.5rem;
	}

	.section-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
		color: var(--color-fg-primary);
	}

	.section-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		margin: 0;
	}

	.section-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Table */
	.table-container {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.data-table th,
	.data-table td {
		padding: 0.75rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.data-table th {
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.data-table td {
		color: var(--color-fg-primary);
	}

	.rank-col {
		width: 48px;
		text-align: center !important;
	}

	.number-col {
		text-align: right !important;
		white-space: nowrap;
	}

	.category-name {
		font-weight: var(--font-medium);
	}

	.revenue {
		color: var(--color-success);
		font-weight: var(--font-medium);
	}

	/* Ranking Badge */
	.ranking-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		border-radius: 50%;
		background: var(--color-hover);
		color: var(--color-fg-muted);
	}

	.ranking-badge.gold {
		background: linear-gradient(135deg, #fbbf24, #f59e0b);
		color: #000;
	}

	.ranking-badge.silver {
		background: linear-gradient(135deg, #d1d5db, #9ca3af);
		color: #000;
	}

	.ranking-badge.bronze {
		background: linear-gradient(135deg, #d97706, #b45309);
		color: #fff;
	}

	/* Leaderboard */
	.leaderboard-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.leaderboard-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.leaderboard-item:hover {
		border-color: var(--webflow-blue);
		background: var(--color-hover);
	}

	.leaderboard-rank {
		flex-shrink: 0;
	}

	.leaderboard-thumbnail {
		flex-shrink: 0;
		width: 48px;
		height: 36px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-hover);
	}

	.leaderboard-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder-thumb {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
	}

	.leaderboard-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.template-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.template-category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.leaderboard-stats {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.stat {
		font-size: var(--text-body-sm);
		white-space: nowrap;
	}

	.stat.revenue {
		font-weight: var(--font-semibold);
		color: var(--color-success);
	}

	.stat.purchases {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--color-fg-muted);
	}
</style>
