<script lang="ts">
	/**
	 * Defensive Impact Page
	 *
	 * Analyzes defensive matchups compared to expected performance.
	 * Shows shot zone efficiency for each team's defense.
	 */

	import type { PageData } from './$types';
	import DefensiveHeatmap from '$lib/components/nba/DefensiveHeatmap.svelte';

	let { data }: { data: PageData } = $props();

	// Get team abbreviations from player data
	const homeTeamAbbr = $derived(data.players.home[0]?.teamAbbr || 'HOME');
	const awayTeamAbbr = $derived(data.players.away[0]?.teamAbbr || 'AWAY');
</script>

<svelte:head>
	<title>Defensive Impact | NBA Live Analytics</title>
	<meta
		name="description"
		content="Defensive zone analysis comparing opponent FG% to league average by zone."
	/>
</svelte:head>

<!-- Header -->
<section class="relative pt-16 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<nav class="breadcrumb mb-4">
			<a href="/experiments/nba-live" class="breadcrumb-link">NBA Live</a>
			<span class="breadcrumb-sep">/</span>
			<span class="breadcrumb-current">Defensive Impact</span>
		</nav>

		<h1 class="page-title">Defensive Impact</h1>
		<p class="page-subtitle">
			Opponent shooting efficiency vs league average by zone
		</p>
	</div>
</section>

<!-- Status -->
<section class="px-6 pb-8">
	<div class="max-w-4xl mx-auto">
		{#if data.error}
			<div class="error-card p-4">
				<p class="error-message">{data.error}</p>
				{#if !data.gameId}
					<a href="/experiments/nba-live" class="back-link">← Select a game</a>
				{/if}
			</div>
		{:else}
			<div class="status-bar flex items-center justify-between">
				<span class="status-text">
					Game ID: {data.gameId}
				</span>
				<span class="timestamp-text">
					{data.cached ? 'Cached' : 'Live'} • {new Date(data.timestamp).toLocaleTimeString()}
				</span>
			</div>
		{/if}
	</div>
</section>

<!-- Heatmaps -->
{#if !data.error && data.gameId}
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<div class="heatmaps-grid">
				{#if data.defensive.home}
					<DefensiveHeatmap
						shotsByZone={data.defensive.home.shotsByZone}
						title="{homeTeamAbbr} Defense vs {awayTeamAbbr}"
						teamAbbr={homeTeamAbbr}
					/>
				{/if}
				{#if data.defensive.away}
					<DefensiveHeatmap
						shotsByZone={data.defensive.away.shotsByZone}
						title="{awayTeamAbbr} Defense vs {homeTeamAbbr}"
						teamAbbr={awayTeamAbbr}
					/>
				{/if}
			</div>
		</div>
	</section>

	<!-- Summary Stats -->
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<h2 class="section-title mb-4">Expected vs Actual</h2>

			<div class="stats-grid">
				{#each ['home', 'away'] as team}
					{@const defensive = team === 'home' ? data.defensive.home : data.defensive.away}
					{@const abbr = team === 'home' ? homeTeamAbbr : awayTeamAbbr}
					{@const opponent = team === 'home' ? awayTeamAbbr : homeTeamAbbr}

					{#if defensive}
						<div class="summary-card">
							<h3 class="card-header">{abbr} Defense</h3>
							<div class="card-content">
								<div class="stat-row">
									<span class="stat-label">Opponent ({opponent})</span>
								</div>
								<div class="stat-row">
									<span class="stat-label">Shots Allowed</span>
									<span class="stat-value">{defensive.shotsAllowed}</span>
								</div>
								<div class="stat-row">
									<span class="stat-label">Points Allowed</span>
									<span class="stat-value">{defensive.pointsAllowed.toFixed(1)}</span>
								</div>
								<div class="stat-row">
									<span class="stat-label">Expected Points</span>
									<span class="stat-value">{defensive.expectedPointsAllowed.toFixed(1)}</span>
								</div>
								<div class="stat-row highlight">
									<span class="stat-label">Delta vs Expected</span>
									<span
										class="stat-value delta"
										class:positive={defensive.deltaVsExpected < 0}
										class:negative={defensive.deltaVsExpected >= 0}
									>
										{defensive.deltaVsExpected >= 0 ? '+' : ''}{defensive.deltaVsExpected.toFixed(1)}
									</span>
								</div>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</section>

	<!-- Methodology -->
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<div class="methodology-card p-6">
				<h3 class="card-title mb-4">Methodology</h3>
				<div class="methodology-content">
					<p>
						<strong>Defensive Impact</strong> measures how well a team's defense performs
						relative to league average shooting percentages by zone. Lower opponent FG%
						indicates better defense.
					</p>
					<ul class="methodology-list mt-4">
						<li><strong>Zone FG%</strong> = Made / Attempted in each zone</li>
						<li><strong>vs League Avg</strong> = Zone FG% − League Average for that zone</li>
						<li><strong>Expected Points</strong> = Sum of (shot value × player baseline FG%)</li>
						<li><strong>Delta</strong> = Actual Points − Expected Points (negative = good defense)</li>
					</ul>
					<p class="mt-4 note">
						<em>Note: This analysis uses shot data as a proxy. True defensive impact
						requires tracking data (Second Spectrum) for matchup-level analysis.</em>
					</p>
				</div>
			</div>
		</div>
	</section>
{/if}

<style>
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
	}

	.breadcrumb-link {
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.breadcrumb-link:hover {
		color: var(--color-fg-primary);
	}

	.breadcrumb-sep {
		color: var(--color-fg-subtle);
	}

	.breadcrumb-current {
		color: var(--color-fg-tertiary);
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.page-subtitle {
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	.status-bar {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.status-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-family: monospace;
	}

	.timestamp-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.error-card {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-lg);
	}

	.error-message {
		color: var(--color-error);
		font-weight: 500;
	}

	.back-link {
		display: inline-block;
		margin-top: var(--space-sm);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.heatmaps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.summary-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.card-header {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		padding: var(--space-md);
		background: var(--color-hover);
		border-bottom: 1px solid var(--color-border-default);
	}

	.card-content {
		padding: var(--space-md);
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.stat-row:last-child {
		border-bottom: none;
	}

	.stat-row.highlight {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-emphasis);
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.stat-value {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
		font-variant-numeric: tabular-nums;
	}

	.stat-value.delta {
		font-size: var(--text-body);
	}

	.stat-value.positive {
		color: var(--color-success);
	}

	.stat-value.negative {
		color: var(--color-error);
	}

	.methodology-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.methodology-content {
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.methodology-list {
		list-style: none;
		padding: 0;
	}

	.methodology-list li {
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.methodology-list li:last-child {
		border-bottom: none;
	}

	.note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}
</style>
