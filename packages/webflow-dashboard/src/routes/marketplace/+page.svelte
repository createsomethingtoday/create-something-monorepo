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
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--webflow-text-primary);
		margin: 0 0 0.5rem;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: var(--webflow-text-muted);
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
		background: var(--webflow-bg-hover);
		border-radius: var(--webflow-radius-lg);
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
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--webflow-text-primary);
	}

	.metric-value.top-category {
		font-size: 1rem;
	}

	.metric-label {
		font-size: 0.8125rem;
		color: var(--webflow-text-muted);
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
		color: var(--webflow-text-primary);
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.section-subtitle {
		font-size: 0.8125rem;
		color: var(--webflow-text-muted);
		margin: 0;
	}

	/* Table */
	.table-container {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.75rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid var(--webflow-border);
	}

	.data-table th {
		font-weight: 500;
		color: var(--webflow-text-muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.data-table td {
		color: var(--webflow-text-primary);
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
		font-weight: 500;
	}

	.revenue {
		color: var(--webflow-success);
		font-weight: 500;
	}

	/* Ranking Badge */
	.ranking-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 50%;
		background: var(--webflow-bg-hover);
		color: var(--webflow-text-muted);
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
		background: var(--webflow-bg-primary);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-md);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.leaderboard-item:hover {
		border-color: var(--webflow-blue);
		background: var(--webflow-bg-hover);
	}

	.leaderboard-rank {
		flex-shrink: 0;
	}

	.leaderboard-thumbnail {
		flex-shrink: 0;
		width: 48px;
		height: 36px;
		border-radius: var(--webflow-radius-sm);
		overflow: hidden;
		background: var(--webflow-bg-hover);
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
		color: var(--webflow-text-muted);
	}

	.leaderboard-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.template-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--webflow-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.template-category {
		font-size: 0.75rem;
		color: var(--webflow-text-muted);
	}

	.leaderboard-stats {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.stat {
		font-size: 0.8125rem;
		white-space: nowrap;
	}

	.stat.revenue {
		font-weight: 600;
		color: var(--webflow-success);
	}

	.stat.purchases {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--webflow-text-muted);
		font-size: 0.75rem;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--webflow-text-muted);
	}
</style>
