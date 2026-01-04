<script lang="ts">
	/**
	 * Shot Network Page
	 *
	 * Force-directed graph of shot creation relationships.
	 * Shows who creates shots for whom on each team.
	 */

	import type { PageData } from './$types';
	import ShotNetwork from '$lib/components/nba/ShotNetwork.svelte';

	let { data }: { data: PageData } = $props();

	// Get team abbreviations from player data
	const homeTeamAbbr = $derived(data.players.home[0]?.teamAbbr || 'HOME');
	const awayTeamAbbr = $derived(data.players.away[0]?.teamAbbr || 'AWAY');
</script>

<svelte:head>
	<title>Shot Network | NBA Live Analytics</title>
	<meta
		name="description"
		content="Force-directed visualization of shot creation relationships between players."
	/>
</svelte:head>

<!-- Header -->
<section class="relative pt-16 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<nav class="breadcrumb mb-4">
			<a href="/experiments/nba-live" class="breadcrumb-link">NBA Live</a>
			<span class="breadcrumb-sep">/</span>
			<span class="breadcrumb-current">Shot Network</span>
		</nav>

		<h1 class="page-title">Shot Network</h1>
		<p class="page-subtitle">
			Who creates shots for whom? See the assist connections.
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

<!-- Networks -->
{#if !data.error && data.gameId}
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<div class="networks-grid">
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

	<!-- How to read this -->
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<div class="reading-guide p-6">
				<h3 class="guide-title mb-4">Reading the Graph</h3>
				<div class="guide-content">
					<div class="guide-item">
						<span class="guide-icon">●</span>
						<div>
							<strong>Node size</strong> reflects involvement: bigger circles mean more shots
							attempted or created. The playmakers and high-volume scorers stand out.
						</div>
					</div>
					<div class="guide-item">
						<span class="guide-icon">→</span>
						<div>
							<strong>Arrows show assists</strong>: point from passer to scorer. Thicker lines
							mean more assists between that pair.
						</div>
					</div>
					<div class="guide-item">
						<span class="guide-icon" style="color: var(--color-data-1)">●</span>
						<div>
							<strong>Blue nodes</strong> are shot creators (at least one assist). Gray nodes
							are scorers who haven't assisted yet.
						</div>
					</div>
					<div class="guide-item">
						<span class="guide-icon">5</span>
						<div>
							<strong>Numbers inside nodes</strong> show total assists. Look for the hub players
							who connect the offense.
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Team comparison -->
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<h2 class="section-title mb-4">Network Summary</h2>

			<div class="summary-grid">
				{#each [
					{ team: 'away', abbr: awayTeamAbbr, network: data.network.away },
					{ team: 'home', abbr: homeTeamAbbr, network: data.network.home }
				] as { team, abbr, network }}
					{#if network}
						{@const topCreator = network.nodes.reduce(
							(max, n) => (n.shotCreation > (max?.shotCreation || 0) ? n : max),
							network.nodes[0]
						)}
						{@const assistRate = network.totalPoints > 0
							? ((network.totalAssists / network.nodes.filter(n => n.shotsAttempted > 0).length) || 0)
							: 0}

						<div class="summary-card">
							<h3 class="card-header">{abbr}</h3>
							<div class="card-content">
								<div class="stat-row">
									<span class="stat-label">Active players</span>
									<span class="stat-value">{network.nodes.length}</span>
								</div>
								<div class="stat-row">
									<span class="stat-label">Assist connections</span>
									<span class="stat-value">{network.edges.length}</span>
								</div>
								<div class="stat-row">
									<span class="stat-label">Total assists</span>
									<span class="stat-value">{network.totalAssists}</span>
								</div>
								<div class="stat-row">
									<span class="stat-label">Assisted points</span>
									<span class="stat-value">{network.edges.reduce((s, e) => s + e.pointsCreated, 0)}</span>
								</div>
								{#if topCreator && topCreator.shotCreation > 0}
									<div class="stat-row highlight">
										<span class="stat-label">Top creator</span>
										<span class="stat-value creator">
											{topCreator.name.split(' ').pop()} ({topCreator.shotCreation})
										</span>
									</div>
								{/if}
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
						Shot networks reveal how teams generate offense. A tightly connected graph
						suggests ball movement; isolated nodes suggest isolation scoring.
					</p>
					<ul class="methodology-list mt-4">
						<li><strong>Nodes</strong> = Players with shots or assists</li>
						<li><strong>Edges</strong> = At least one assist from A to B</li>
						<li><strong>Node size</strong> = sqrt(shots + assists) for visual balance</li>
						<li><strong>Edge thickness</strong> = Number of assists between pair</li>
					</ul>
					<p class="mt-4 note">
						<em>Visualization uses D3 force simulation for layout. Positions are
						determined algorithmically—spatial proximity reflects connection strength.</em>
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

	.networks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: var(--space-lg);
	}

	.reading-guide {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.guide-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.guide-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.guide-item {
		display: flex;
		gap: var(--space-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.guide-icon {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-muted);
		width: 20px;
		flex-shrink: 0;
		text-align: center;
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.summary-grid {
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

	.stat-value.creator {
		color: var(--color-data-1);
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
