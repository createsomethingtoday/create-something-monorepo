<script lang="ts">
	/**
	 * Duo Synergy Page
	 *
	 * Analyzes two-man efficiency (PPP) compared to league average.
	 * Shows top performing duos for each team.
	 */

	import type { PageData } from './$types';
	import DuoChart from '$lib/components/nba/DuoChart.svelte';

	let { data }: { data: PageData } = $props();

	// Get team abbreviations from player data
	const homeTeamAbbr = $derived(data.players.home[0]?.teamAbbr || 'HOME');
	const awayTeamAbbr = $derived(data.players.away[0]?.teamAbbr || 'AWAY');
</script>

<svelte:head>
	<title>Duo Synergy | NBA Live Analytics</title>
	<meta
		name="description"
		content="Two-man efficiency analysis comparing duo PPP to league average."
	/>
</svelte:head>

<!-- Header -->
<section class="relative pt-16 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<nav class="breadcrumb mb-4">
			<a href="/experiments/nba-live" class="breadcrumb-link">NBA Live</a>
			<span class="breadcrumb-sep">/</span>
			<span class="breadcrumb-current">Duo Synergy</span>
		</nav>

		<h1 class="page-title">Duo Synergy</h1>
		<p class="page-subtitle">
			Two-man action efficiency vs league average (1.12 PPP)
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

<!-- Charts -->
{#if !data.error && data.gameId}
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<div class="charts-grid">
				<DuoChart
					duos={data.duos.away}
					title="{awayTeamAbbr} Top Duos"
					teamAbbr={awayTeamAbbr}
				/>
				<DuoChart
					duos={data.duos.home}
					title="{homeTeamAbbr} Top Duos"
					teamAbbr={homeTeamAbbr}
				/>
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
						<strong>Points Per Possession (PPP)</strong> measures scoring efficiency when
						two players are involved in the same possession. A duo is credited with involvement
						when both players touch the ball or one assists the other's shot.
					</p>
					<ul class="methodology-list mt-4">
						<li><strong>Synergy Score</strong> = 0.7 × PPP + 0.3 × Assist Rate</li>
						<li><strong>Delta vs League</strong> = Duo PPP − 1.12 (league average)</li>
						<li><strong>Minimum threshold</strong> = 3 possessions together</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Stats Table -->
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<h2 class="section-title mb-4">Detailed Stats</h2>

			<div class="stats-grid">
				{#each ['away', 'home'] as team}
					{@const duos = team === 'away' ? data.duos.away : data.duos.home}
					{@const abbr = team === 'away' ? awayTeamAbbr : homeTeamAbbr}

					<div class="stats-card">
						<h3 class="stats-header">{abbr}</h3>
						{#if duos.length === 0}
							<p class="empty-stats">No duo data available</p>
						{:else}
							<table class="stats-table">
								<thead>
									<tr>
										<th>Duo</th>
										<th>Poss</th>
										<th>Pts</th>
										<th>Ast</th>
										<th>PPP</th>
									</tr>
								</thead>
								<tbody>
									{#each duos as duo}
										<tr>
											<td class="duo-names">
												{duo.duo.player1Name.split(' ').pop()}/
												{duo.duo.player2Name.split(' ').pop()}
											</td>
											<td>{duo.possessionsTogether}</td>
											<td>{duo.points}</td>
											<td>{duo.assistsBetween}</td>
											<td class="ppp-cell"
												class:positive={duo.deltaVsLeague >= 0}
												class:negative={duo.deltaVsLeague < 0}
											>
												{duo.pointsPerPossession.toFixed(2)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				{/each}
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

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
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

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
	}

	.stats-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.stats-header {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		padding: var(--space-md);
		background: var(--color-hover);
		border-bottom: 1px solid var(--color-border-default);
	}

	.empty-stats {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		padding: var(--space-lg);
		text-align: center;
	}

	.stats-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.stats-table th {
		text-align: left;
		padding: var(--space-sm) var(--space-md);
		color: var(--color-fg-muted);
		font-weight: 500;
		border-bottom: 1px solid var(--color-border-default);
	}

	.stats-table td {
		padding: var(--space-sm) var(--space-md);
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-default);
	}

	.stats-table tr:last-child td {
		border-bottom: none;
	}

	.duo-names {
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.ppp-cell {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.ppp-cell.positive {
		color: var(--color-success);
	}

	.ppp-cell.negative {
		color: var(--color-error);
	}
</style>
