<script lang="ts">
	/**
	 * League Insights Page
	 *
	 * Shows league-wide trends from completed games.
	 * Updates every 60 seconds to capture new game completions.
	 */

	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';
	import CorrelationChart from '$lib/components/nba/CorrelationChart.svelte';
	import { invalidate } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { ArrowLeft, TrendingUp, Users, Target, Home, AlertCircle } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let pollInterval: ReturnType<typeof setInterval> | null = null;

	// Auto-refresh every 60 seconds (games complete less often than they update)
	onMount(() => {
		pollInterval = setInterval(
			() => {
				invalidate('/experiments/nba-live/league-insights');
			},
			60 * 1000
		); // 60 seconds
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});

	const formatPercent = (value: number) => `${value.toFixed(1)}%`;
	const formatNumber = (value: number) => value.toFixed(1);
</script>

<SEO
	title="League Insights | NBA Live Analytics"
	description="League-wide trends and patterns from today's NBA games. Ball movement, competitive balance, and scoring analysis."
	keywords="NBA league insights, ball movement, competitive balance, scoring trends, basketball analytics"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Experiments', url: 'https://createsomething.space/experiments' },
		{ name: 'NBA Live Analytics', url: 'https://createsomething.space/experiments/nba-live' },
		{ name: 'League Insights', url: 'https://createsomething.space/experiments/nba-live/league-insights' }
	]}
/>

<!-- Header -->
<section class="page-header">
	<div class="container max-w-7xl">
		<a href="/experiments/nba-live" class="back-link">
			<ArrowLeft size={16} />
			Back to NBA Live
		</a>
		<h1 class="title">League Insights</h1>
		<p class="subtitle">
			Trends and patterns across all completed games today. Updates automatically every 60
			seconds.
		</p>
	</div>
</section>

<!-- Error State -->
{#if data.error}
	<section class="error-section">
		<div class="container">
			<div class="error-state">
				<AlertCircle size={24} />
				<p class="error-message">We couldn't load league insights.</p>
				<p class="error-hint">
					The NBA data feed may be temporarily unavailable. Check back in a few minutes.
				</p>
			</div>
		</div>
	</section>
{:else if !data.insights || data.insights.totalGames === 0}
	<section class="empty-section">
		<div class="container">
			<div class="empty-state">
				<TrendingUp size={24} />
				<p class="empty-message">No completed games yet.</p>
				<p class="empty-hint">
					Check back once today's games finish to see league-wide trends.
				</p>
			</div>
		</div>
	</section>
{:else}
	<!-- Stats Overview -->
	<section class="stats-section">
		<div class="container">
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-icon">
						<Target size={20} />
					</div>
					<div class="stat-content">
						<p class="stat-label">Avg Scoring</p>
						<p class="stat-value">{formatNumber(data.insights.averageScoring)} pts</p>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">
						<Users size={20} />
					</div>
					<div class="stat-content">
						<p class="stat-label">Avg Assists</p>
						<p class="stat-value">{formatNumber(data.insights.averageAssists)}</p>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">
						<TrendingUp size={20} />
					</div>
					<div class="stat-content">
						<p class="stat-label">Avg 3PT Attempts</p>
						<p class="stat-value">{formatNumber(data.insights.average3PtAttempts)}</p>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">
						<Home size={20} />
					</div>
					<div class="stat-content">
						<p class="stat-label">Home Court Adv</p>
						<p class="stat-value">{formatPercent(data.insights.homeWinPercentage)}</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Correlation Chart -->
	<section class="chart-section">
		<div class="container">
			<CorrelationChart
				data={data.insights.correlationData}
				title="Ball Movement vs Scoring Efficiency"
			/>
		</div>
	</section>

	<!-- Competitive Balance -->
	<section class="balance-section">
		<div class="container">
			<div class="balance-card">
				<h2 class="balance-title">Competitive Balance</h2>
				<p class="balance-subtitle">
					How closely contested were today's games? ({data.insights.totalGames} completed)
				</p>

				<div class="balance-bars">
					<div class="balance-bar">
						<div class="bar-label">
							<span class="bar-name">Close Games</span>
							<span class="bar-count">{data.insights.competitiveBalance.closeGames}</span>
						</div>
						<div class="bar-track">
							<div
								class="bar-fill bar-fill--success"
								style="width: {(data.insights.competitiveBalance.closeGames /
									data.insights.totalGames) *
									100}%"
							></div>
						</div>
						<p class="bar-description">Decided by 5 points or less</p>
					</div>

					<div class="balance-bar">
						<div class="bar-label">
							<span class="bar-name">Competitive</span>
							<span class="bar-count">{data.insights.competitiveBalance.competitive}</span>
						</div>
						<div class="bar-track">
							<div
								class="bar-fill bar-fill--primary"
								style="width: {(data.insights.competitiveBalance.competitive /
									data.insights.totalGames) *
									100}%"
							></div>
						</div>
						<p class="bar-description">Decided by 6-19 points</p>
					</div>

					<div class="balance-bar">
						<div class="bar-label">
							<span class="bar-name">Blowouts</span>
							<span class="bar-count">{data.insights.competitiveBalance.blowouts}</span>
						</div>
						<div class="bar-track">
							<div
								class="bar-fill bar-fill--muted"
								style="width: {(data.insights.competitiveBalance.blowouts /
									data.insights.totalGames) *
									100}%"
							></div>
						</div>
						<p class="bar-description">Decided by 20+ points</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Timestamp -->
	<section class="timestamp-section">
		<div class="container">
			<p class="timestamp">
				Last updated: {new Date(data.timestamp).toLocaleTimeString([], {
					hour: 'numeric',
					minute: '2-digit',
					second: '2-digit'
				})}
			</p>
		</div>
	</section>
{/if}

<style>
	/* Layout */
	.container {
		max-width: 56rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Header */
	.page-header {
		padding: var(--space-xl) 0 var(--space-lg);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		margin-bottom: var(--space-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		max-width: 40rem;
	}

	/* Error State */
	.error-section,
	.empty-section {
		padding: var(--space-xl) 0;
	}

	.error-state,
	.empty-state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-fg-muted);
	}

	.error-state :global(svg),
	.empty-state :global(svg) {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-tertiary);
	}

	.error-message,
	.empty-message {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
		font-size: var(--text-body);
	}

	.error-hint,
	.empty-hint {
		font-size: var(--text-body-sm);
	}

	/* Stats Grid */
	.stats-section {
		padding-bottom: var(--space-lg);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.stat-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	.stat-icon {
		color: var(--color-fg-tertiary);
		flex-shrink: 0;
	}

	.stat-content {
		flex: 1;
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.stat-value {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	/* Chart Section */
	.chart-section {
		padding-bottom: var(--space-lg);
	}

	/* Balance Section */
	.balance-section {
		padding-bottom: var(--space-lg);
	}

	.balance-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.balance-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.balance-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.balance-bars {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.balance-bar {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.bar-label {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.bar-name {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.bar-count {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.bar-track {
		height: 8px;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.bar-fill--success {
		background: var(--color-success);
	}

	.bar-fill--primary {
		background: var(--color-data-1);
	}

	.bar-fill--muted {
		background: var(--color-fg-muted);
	}

	.bar-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Timestamp */
	.timestamp-section {
		padding-bottom: var(--space-xl);
	}

	.timestamp {
		text-align: center;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}
</style>
