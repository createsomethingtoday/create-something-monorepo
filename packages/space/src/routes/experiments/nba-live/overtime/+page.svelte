<script lang="ts">
	/**
	 * Overtime Performance Tracker
	 * 
	 * REG vs OT performance comparison.
	 * Identifies fatigue patterns and performance decline in extended play.
	 */
	
	import { Clock, TrendingDown, AlertTriangle } from 'lucide-svelte';
	import AnalyticsNav from '$lib/components/nba/AnalyticsNav.svelte';
	import OvertimeInsights from '$lib/components/nba/OvertimeInsights.svelte';
	import DateNavigation from '$lib/components/nba/DateNavigation.svelte';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	// Derived state
	const totalOvertimeGames = $derived(data.overtimeGames.length);
	const avgFatigueIndex = $derived(
		totalOvertimeGames > 0
			? data.overtimeGames.reduce((sum, g) => sum + g.fatigueIndex, 0) / totalOvertimeGames
			: 0
	);
	const severeFatigueCount = $derived(
		data.overtimeGames.filter((g) => g.fatigueIndex >= 70).length
	);
</script>

<div class="overtime-page">
	<AnalyticsNav />
	
	<div class="container">
		<header class="page-header">
			<div class="title-section">
				<Clock size={32} />
				<div>
					<h1>Overtime Performance</h1>
					<p class="subtitle">
						Regular vs. overtime comparison - fatigue patterns and performance decline
					</p>
				</div>
			</div>
			<DateNavigation currentDate={data.date} baseUrl="/experiments/nba-live/overtime" />
		</header>

		<!-- Data Note -->
		{#if data.dataNote}
			<div class="data-note">
				<p>{data.dataNote}</p>
			</div>
		{/if}

		{#if totalOvertimeGames > 0}
			<!-- Summary Stats -->
			<div class="summary-grid">
				<div class="summary-card">
					<div class="summary-label">Overtime Games</div>
					<div class="summary-value">{totalOvertimeGames}</div>
				</div>
				
				<div class="summary-card">
					<div class="summary-label">Avg Fatigue Index</div>
					<div class="summary-value" class:warning={avgFatigueIndex >= 40} class:error={avgFatigueIndex >= 70}>
						{avgFatigueIndex.toFixed(1)}/100
					</div>
				</div>
				
				<div class="summary-card">
					<div class="summary-label">Severe Fatigue</div>
					<div class="summary-value" class:error={severeFatigueCount > 0}>
						{severeFatigueCount}
					</div>
				</div>
			</div>
			
			<!-- Overtime Games -->
			<section class="overtime-section">
				<h2 class="section-title">
					Games That Went to Overtime
				</h2>
				
				<div class="overtime-grid">
					{#each data.overtimeGames as differential (differential.gameId)}
						<OvertimeInsights {differential} />
					{/each}
				</div>
			</section>
			
			<!-- Methodology -->
			<aside class="methodology">
				<h3>Methodology</h3>
				<p>
					The <strong>Fatigue Index</strong> measures performance decline from regulation to overtime:
				</p>
				<ul>
					<li><strong>0-39:</strong> Minimal fatigue - maintained or improved performance</li>
					<li><strong>40-69:</strong> Moderate fatigue - noticeable performance decline</li>
					<li><strong>70-100:</strong> Severe fatigue - significant performance drop-off</li>
				</ul>
				<p>
					Calculated from FG%, points per minute, and turnover rate differentials between
					regular and overtime periods.
				</p>
			</aside>
		{:else}
			<!-- Empty State -->
			<div class="empty-state">
				<Clock size={48} />
				<h2>No overtime games yet</h2>
				<p>
					Overtime analysis appears when games extend beyond regulation.
					Check back when games go to OT!
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.overtime-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-2xl);
	}

	/* Page Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: calc(var(--space-2xl) * 1.5);
		padding-bottom: var(--space-2xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.title-section {
		display: flex;
		gap: var(--space-lg);
		align-items: flex-start;
	}

	.title-section h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
		line-height: 1.2;
	}

	.subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		max-width: 600px;
	}

	/* Summary Grid */
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-lg);
		margin-bottom: calc(var(--space-2xl) * 1.5);
	}

	.summary-card {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.summary-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.summary-value {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.summary-value.warning {
		color: var(--color-warning);
	}

	.summary-value.error {
		color: var(--color-error);
	}

	/* Overtime Section */
	.overtime-section {
		margin-bottom: calc(var(--space-2xl) * 1.5);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-2xl);
	}

	.overtime-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: var(--space-lg);
	}

	/* Methodology */
	.methodology {
		padding: var(--space-2xl);
		background: var(--color-bg-surface);
		border-left: 3px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		margin-top: calc(var(--space-2xl) * 1.5);
	}

	.methodology h3 {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
	}

	.methodology p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-md);
	}

	.methodology ul {
		margin: var(--space-md) 0;
		padding-left: var(--space-xl);
		color: var(--color-fg-secondary);
	}

	.methodology li {
		margin-bottom: var(--space-sm);
		line-height: 1.6;
	}

	.methodology strong {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.data-note {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-2xl);
	}

	.data-note p {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: calc(var(--space-2xl) * 2.5) var(--space-2xl);
		text-align: center;
		color: var(--color-fg-tertiary);
	}

	.empty-state h2 {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: var(--space-lg) 0 var(--space-md);
	}

	.empty-state p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		max-width: 500px;
		line-height: 1.6;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-lg);
		}

		.page-header {
			flex-direction: column;
			gap: var(--space-lg);
		}

		.title-section h1 {
			font-size: var(--text-h2);
		}

		.overtime-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
