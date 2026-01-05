<script lang="ts">
	/**
	 * Duo Synergy Page
	 *
	 * Which two-player combinations score most efficiently?
	 * Compares duo points per possession against league average.
	 */

	import type { PageData } from './$types';
	import DuoChart from '$lib/components/nba/DuoChart.svelte';
	import { ArrowLeft, Clock, Radio, AlertCircle } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const homeTeamAbbr = $derived(data.players.home[0]?.teamAbbr || 'HOME');
	const awayTeamAbbr = $derived(data.players.away[0]?.teamAbbr || 'AWAY');
</script>

<svelte:head>
	<title>Duo Synergy | NBA Live Analytics</title>
	<meta
		name="description"
		content="Which two-player combinations are most effective? Compare points per possession against the league average."
	/>
</svelte:head>

<!-- Header -->
<section class="nba-header">
	<div class="nba-container">
		<nav class="nba-breadcrumb">
			<a href="/experiments/nba-live" class="nba-breadcrumb-link">
				<ArrowLeft size={14} />
				NBA Live
			</a>
			<span class="nba-breadcrumb-sep">/</span>
			<span class="nba-breadcrumb-current">Duo Synergy</span>
		</nav>

		<h1 class="nba-title">Duo Synergy</h1>
		<p class="nba-subtitle">
			How efficiently do two-player combinations score? We compare their points per possession
			to the league average of 1.12 PPP.
		</p>
	</div>
</section>

<!-- Status -->
<section class="nba-section">
	<div class="nba-container">
		{#if data.error}
			<div class="nba-error-state">
				<AlertCircle size={24} />
				<p class="nba-error-message">{data.error}</p>
				{#if !data.gameId}
					<a href="/experiments/nba-live" class="nba-back-link">
						<ArrowLeft size={14} />
						Select a game
					</a>
				{/if}
			</div>
		{:else}
			<div class="nba-status-bar">
				<div class="nba-status-indicator">
					{#if data.cached}
						<Clock size={14} class="nba-status-icon" />
						<span class="nba-status-label">Cached</span>
					{:else}
						<Radio size={14} class="nba-status-icon nba-status-icon--live" />
						<span class="nba-status-label nba-status-label--live">Live</span>
					{/if}
				</div>
				<span class="nba-timestamp">
					{new Date(data.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
				</span>
			</div>
		{/if}
	</div>
</section>

<!-- Charts -->
{#if !data.error && data.gameId}
	<section class="nba-section">
		<div class="nba-container">
			<div class="nba-grid-2">
				<DuoChart
					duos={data.duos.away}
					title="{awayTeamAbbr} Duos"
					teamAbbr={awayTeamAbbr}
				/>
				<DuoChart
					duos={data.duos.home}
					title="{homeTeamAbbr} Duos"
					teamAbbr={homeTeamAbbr}
				/>
			</div>
		</div>
	</section>

	<!-- Stats Table -->
	<section class="nba-section">
		<div class="nba-container">
			<h2 class="nba-section-label">Detailed Stats</h2>

			<div class="nba-grid-2">
				{#each ['away', 'home'] as team}
					{@const duos = team === 'away' ? data.duos.away : data.duos.home}
					{@const abbr = team === 'away' ? awayTeamAbbr : homeTeamAbbr}

					<div class="nba-card">
						<h3 class="nba-card-header">{abbr}</h3>
						{#if duos.length === 0}
							<p class="nba-empty">No duo data yet—need 3+ possessions together</p>
						{:else}
							<table class="nba-stats-table">
								<thead>
									<tr>
										<th>Duo</th>
										<th>Poss</th>
										<th>Pts</th>
										<th>PPP</th>
									</tr>
								</thead>
								<tbody>
									{#each duos as duo}
										<tr>
											<td>
												{duo.duo.player1Name.split(' ').pop()}/{duo.duo.player2Name.split(' ').pop()}
											</td>
											<td>{duo.possessionsTogether}</td>
											<td>{duo.points}</td>
											<td class={duo.deltaVsLeague >= 0 ? 'nba-stat-positive' : 'nba-stat-negative'}>
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

	<!-- Methodology -->
	<section class="nba-section">
		<div class="nba-container">
			<div class="nba-methodology">
				<h3 class="nba-methodology-title">How we calculate this</h3>
				<p class="nba-methodology-text">
					A duo gets credit when both players are involved in a possession—either one assists
					the other's shot, or both touch the ball before a score.
				</p>
				<ul class="nba-methodology-list">
					<li><strong>PPP</strong> = Points scored ÷ Possessions together</li>
					<li><strong>vs League</strong> = Duo PPP − 1.12 (league average)</li>
					<li><strong>Minimum</strong> = 3 possessions to appear in the chart</li>
				</ul>
			</div>
		</div>
	</section>
{/if}
