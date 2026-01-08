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
	import DateNav from '$lib/components/nba/DateNav.svelte';
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
			<DateNav date={data.date} />
		</header>
		
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
		padding: var(--space-6);
	}
	
	/* Page Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-8);
		padding-bottom: var(--space-6);
		border-bottom: 1px solid var(--color-border);
	}
	
	.title-section {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
	}
	
	.title-section h1 {
		font-size: var(--font-size-4xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin: 0 0 var(--space-2);
		line-height: 1.2;
	}
	
	.subtitle {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		margin: 0;
		max-width: 600px;
	}
	
	/* Summary Grid */
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}
	
	.summary-card {
		padding: var(--space-4);
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-3);
	}
	
	.summary-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-2);
	}
	
	.summary-value {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
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
		margin-bottom: var(--space-8);
	}
	
	.section-title {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin: 0 0 var(--space-6);
	}
	
	.overtime-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: var(--space-4);
	}
	
	/* Methodology */
	.methodology {
		padding: var(--space-6);
		background: var(--color-surface);
		border-left: 3px solid var(--color-border-strong);
		border-radius: var(--radius-2);
		margin-top: var(--space-8);
	}
	
	.methodology h3 {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin: 0 0 var(--space-3);
	}
	
	.methodology p {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-3);
	}
	
	.methodology ul {
		margin: var(--space-3) 0;
		padding-left: var(--space-5);
		color: var(--color-text-secondary);
	}
	
	.methodology li {
		margin-bottom: var(--space-2);
		line-height: 1.6;
	}
	
	.methodology strong {
		color: var(--color-text-primary);
		font-weight: var(--font-weight-semibold);
	}
	
	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-16) var(--space-6);
		text-align: center;
		color: var(--color-text-tertiary);
	}
	
	.empty-state h2 {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin: var(--space-4) 0 var(--space-3);
	}
	
	.empty-state p {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		max-width: 500px;
		line-height: 1.6;
	}
	
	/* Mobile Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-4);
		}
		
		.page-header {
			flex-direction: column;
			gap: var(--space-4);
		}
		
		.title-section h1 {
			font-size: var(--font-size-2xl);
		}
		
		.overtime-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
