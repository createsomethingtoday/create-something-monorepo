<script lang="ts">
	/**
	 * Shot Network Page
	 *
	 * Who creates shots for whom?
	 * Force-directed graph showing assist relationships.
	 */

	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';
	import ShotNetwork from '$lib/components/nba/ShotNetwork.svelte';
	import { ArrowLeft, Clock, Radio, AlertCircle } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const homeTeamAbbr = $derived(data.players.home[0]?.teamAbbr || 'HOME');
	const awayTeamAbbr = $derived(data.players.away[0]?.teamAbbr || 'AWAY');
</script>

<SEO
	title="Shot Network | NBA Live Analytics"
	description="Who creates shots for whom? See the passing connections that lead to scoring opportunities."
	keywords="NBA shot network, assist network, passing connections, shot creation, basketball visualization"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Experiments', url: 'https://createsomething.space/experiments' },
		{ name: 'NBA Live Analytics', url: 'https://createsomething.space/experiments/nba-live' },
		{ name: 'Shot Network', url: 'https://createsomething.space/experiments/nba-live/shot-network' }
	]}
/>

<!-- Header -->
<section class="nba-header">
	<div class="nba-container">
		<nav class="nba-breadcrumb">
			<a href="/experiments/nba-live" class="nba-breadcrumb-link">
				<ArrowLeft size={14} />
				NBA Live
			</a>
			<span class="nba-breadcrumb-sep">/</span>
			<span class="nba-breadcrumb-current">Shot Network</span>
		</nav>

		<h1 class="nba-title">Shot Network</h1>
		<p class="nba-subtitle">
			Who creates shots for whom? Trace the passing connections that lead to scoring
			opportunities—thicker lines mean more assists between players.
		</p>
	</div>
</section>

<!-- Status -->
<section class="nba-section">
	<div class="nba-container">
		{#if data.scheduled && data.game}
			<div class="nba-scheduled-state">
				<Clock size={32} class="nba-scheduled-icon" />
				<h2 class="nba-scheduled-title">
					{data.game.awayTeam.abbreviation} @ {data.game.homeTeam.abbreviation}
				</h2>
				<p class="nba-scheduled-message">
					This game hasn't started yet. Check back at{' '}
					<strong>
						{new Date(data.game.startTime).toLocaleTimeString([], {
							hour: 'numeric',
							minute: '2-digit',
							timeZoneName: 'short'
						})}
					</strong>
					{' '}to see shot network analysis.
				</p>
				<p class="nba-scheduled-hint">
					The page will automatically refresh every 30 seconds and show live data once the game starts.
				</p>
				<a href="/experiments/nba-live" class="nba-back-link">
					<ArrowLeft size={14} />
					Back to all games
				</a>
			</div>
		{:else if data.error}
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

<!-- Networks -->
{#if !data.error && !data.scheduled && data.gameId}
	<section class="nba-section">
		<div class="nba-container">
			<div class="nba-grid-2">
				{#if data.network.away}
					<ShotNetwork
						nodes={data.network.away.nodes}
						edges={data.network.away.edges}
						title="{awayTeamAbbr} Shot Creation"
						teamAbbr={awayTeamAbbr}
					/>
				{/if}
				{#if data.network.home}
					<ShotNetwork
						nodes={data.network.home.nodes}
						edges={data.network.home.edges}
						title="{homeTeamAbbr} Shot Creation"
						teamAbbr={homeTeamAbbr}
					/>
				{/if}
			</div>
		</div>
	</section>

	<!-- Network Summary -->
	<section class="nba-section">
		<div class="nba-container">
			<h2 class="nba-section-label">Network Summary</h2>

			<div class="nba-grid-2">
				{#each [
					{ team: 'away', abbr: awayTeamAbbr, network: data.network.away },
					{ team: 'home', abbr: homeTeamAbbr, network: data.network.home }
				] as { abbr, network }}
					{#if network}
						{@const topCreator = network.nodes.reduce(
							(max, n) => (n.shotCreation > (max?.shotCreation || 0) ? n : max),
							network.nodes[0]
						)}

						<div class="nba-card">
							<h3 class="nba-card-header">{abbr}</h3>
							<table class="nba-stats-table">
								<tbody>
									<tr>
										<td>Active players</td>
										<td>{network.nodes.length}</td>
									</tr>
									<tr>
										<td>Assist connections</td>
										<td>{network.edges.length}</td>
									</tr>
									<tr>
										<td>Total assists</td>
										<td>{network.totalAssists}</td>
									</tr>
									<tr>
										<td>Assisted points</td>
										<td>{network.edges.reduce((s, e) => s + e.pointsCreated, 0)}</td>
									</tr>
									{#if topCreator && topCreator.shotCreation > 0}
										<tr>
											<td><strong>Top creator</strong></td>
											<td class="nba-stat-positive">
												<strong>{topCreator.name.split(' ').pop()} ({topCreator.shotCreation})</strong>
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</section>

	<!-- Reading Guide -->
	<section class="nba-section">
		<div class="nba-container">
			<div class="nba-methodology">
				<h3 class="nba-methodology-title">Reading the graph</h3>
				<ul class="nba-methodology-list">
					<li><strong>Node size</strong> = More shots attempted or created (bigger = more involved)</li>
					<li><strong>Arrows</strong> = Point from passer to scorer (thicker = more assists)</li>
					<li><strong>Blue nodes</strong> = Shot creators (at least one assist)</li>
					<li><strong>Numbers</strong> = Total assists by that player</li>
				</ul>
				<p class="nba-methodology-text" style="margin-top: var(--space-sm);">
					A tightly connected graph suggests ball movement. Isolated nodes suggest isolation scoring.
				</p>
			</div>
		</div>
	</section>

	<!-- Methodology -->
	<section class="nba-section">
		<div class="nba-container">
			<div class="nba-methodology">
				<h3 class="nba-methodology-title">How we calculate this</h3>
				<p class="nba-methodology-text">
					The graph builds from play-by-play data. Each assist creates a directed edge
					from passer to scorer.
				</p>
				<ul class="nba-methodology-list">
					<li><strong>Nodes</strong> = Players with shots or assists in the game</li>
					<li><strong>Edges</strong> = At least one assist from player A to player B</li>
					<li><strong>Node size</strong> = sqrt(shots + assists) for visual balance</li>
					<li><strong>Layout</strong> = D3 force simulation (proximity reflects connection strength)</li>
				</ul>
			</div>
		</div>
	</section>
{/if}
