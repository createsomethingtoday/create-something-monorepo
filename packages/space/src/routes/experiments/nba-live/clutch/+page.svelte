<script lang="ts">
	/**
	 * Clutch Performance Page
	 * 
	 * Leaderboard showing top clutch performers.
	 * Filters by date range and displays ice-in-veins ratings.
	 */
	
	import type { PageData } from './$types';
	import type { ClutchStats } from '$lib/nba/clutch-calculator';
	import AnalyticsNav from '$lib/components/nba/AnalyticsNav.svelte';
	import DateNavigation from '$lib/components/nba/DateNavigation.svelte';
	import { Zap, TrendingUp, TrendingDown, Flame } from 'lucide-svelte';
	import { invalidate } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	
	let { data }: { data: PageData } = $props();
	
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	
	// Start polling for live games
	onMount(() => {
		if (data.hasLiveGames) {
			pollInterval = setInterval(() => {
				invalidate('clutch:data');
			}, 60000); // Poll every 60s
		}
	});
	
	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});
	
	// Determine if player has "clutch gene" (rating 80+)
	const hasClutchGene = (rating: number) => rating >= 80;
	
	// Format percentage
	const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;
</script>

<svelte:head>
	<title>Clutch Performance | NBA Live Analytics</title>
	<meta name="description" content="Track player and team performance in high-pressure situations" />
</svelte:head>

<div class="clutch-page">
	<AnalyticsNav />

	<div class="container max-w-7xl">
		<!-- Header -->
		<header class="page-header">
			<div class="title-section">
				<Zap size={32} />
				<div>
					<h1>Clutch Performance</h1>
					<p class="subtitle">High-pressure situations: last 2 minutes, 5-point margin or less</p>
				</div>
			</div>
			
			<DateNavigation currentDate={data.date} baseUrl="/experiments/nba-live/clutch" />
		</header>
		
		<!-- Data Note -->
		{#if data.dataNote}
			<div class="data-note">
				<p>{data.dataNote}</p>
			</div>
		{/if}

		<!-- Stats Summary -->
		{#if data.clutchStats.length > 0}
			<div class="summary-cards">
				<div class="summary-card">
					<div class="summary-label">Total Clutch Situations</div>
					<div class="summary-value">{data.totalClutchSituations}</div>
				</div>
				
				<div class="summary-card">
					<div class="summary-label">Players Tracked</div>
					<div class="summary-value">{data.clutchStats.length}</div>
				</div>
				
				<div class="summary-card">
					<div class="summary-label">Clutch Gene Players</div>
					<div class="summary-value">
						{data.clutchStats.filter(s => hasClutchGene(s.iceInVeinsRating)).length}
					</div>
				</div>
			</div>
			
			<!-- Leaderboard -->
			<div class="leaderboard">
				<div class="leaderboard-header">
					<h2>Ice in Veins Leaderboard</h2>
					<p class="leaderboard-subtitle">Composite clutch performance rating (0-100)</p>
				</div>
				
				<div class="leaderboard-table">
					<!-- Table Header -->
					<div class="table-header">
						<div class="col rank">Rank</div>
						<div class="col player">Player</div>
						<div class="col rating">Rating</div>
						<div class="col stat">FG%</div>
						<div class="col stat">PTS</div>
						<div class="col stat">AST</div>
						<div class="col stat">TOV</div>
						<div class="col stat">POSS</div>
					</div>
					
					<!-- Table Body -->
					<div class="table-body">
						{#each data.clutchStats as player, index}
							<div 
								class="table-row" 
								class:clutch-gene={hasClutchGene(player.iceInVeinsRating)}
							>
								<div class="col rank">
									{#if index === 0}
										<Flame size={18} class="gold" />
									{:else if index === 1}
										<Flame size={18} class="silver" />
									{:else if index === 2}
										<Flame size={18} class="bronze" />
									{:else}
										<span>{index + 1}</span>
									{/if}
								</div>
								
								<div class="col player">
									<div class="player-info">
										<span class="player-name">{player.playerName}</span>
										{#if hasClutchGene(player.iceInVeinsRating)}
											<span class="clutch-badge">
												<Zap size={12} />
												Clutch Gene
											</span>
										{/if}
									</div>
								</div>
								
								<div class="col rating">
									<div class="rating-display">
										<span class="rating-value">{player.iceInVeinsRating}</span>
										<div class="rating-bar">
											<div 
												class="rating-fill" 
												style="width: {player.iceInVeinsRating}%"
											></div>
										</div>
									</div>
								</div>
								
								<div class="col stat">
									<span class="stat-value">{formatPct(player.fgPct)}</span>
								</div>
								
								<div class="col stat">
									<span class="stat-value">{player.points}</span>
								</div>
								
								<div class="col stat">
									<span class="stat-value">{player.assists}</span>
								</div>
								
								<div class="col stat">
									<span class="stat-value">{player.turnovers}</span>
								</div>
								
								<div class="col stat">
									<span class="stat-value">{player.possessions}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<Zap size={48} />
				<h2>No clutch situations yet</h2>
				<p>Clutch stats appear when games reach the final 2 minutes with a 5-point margin or less.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.clutch-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-lg);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-lg);
		margin-bottom: var(--space-2xl);
		flex-wrap: wrap;
	}

	.title-section {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		color: var(--color-data-1);
	}

	.title-section h1 {
		margin: 0;
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.subtitle {
		margin: var(--space-xs) 0 0;
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-2xl);
	}

	.summary-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
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

	.data-note {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-2xl);
	}

	.data-note p {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.leaderboard {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-xl);
	}

	.leaderboard-header {
		margin-bottom: var(--space-lg);
	}

	.leaderboard-header h2 {
		margin: 0 0 var(--space-xs);
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.leaderboard-subtitle {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.leaderboard-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 60px 1fr 120px repeat(5, 80px);
		gap: var(--space-md);
		align-items: center;
		padding: var(--space-md);
	}

	.table-header {
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 2px solid var(--color-border-default);
	}

	.table-row {
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.table-row:hover {
		background: var(--color-bg-surface);
		transform: translateX(4px);
	}

	.table-row.clutch-gene {
		border-left: 3px solid var(--color-data-1);
	}

	.col.rank {
		text-align: center;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.col.player {
		min-width: 0;
	}

	.player-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.player-name {
		font-weight: 600;
		color: var(--color-fg-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.clutch-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-data-1);
		color: var(--color-fg-primary);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		font-weight: 500;
		width: fit-content;
	}

	.rating-display {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.rating-value {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-data-1);
		font-variant-numeric: tabular-nums;
	}

	.rating-bar {
		height: 4px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.rating-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-error) 0%, var(--color-warning) 50%, var(--color-success) 100%);
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.stat-value {
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: calc(var(--space-2xl) * 2) var(--space-lg);
		text-align: center;
		color: var(--color-fg-secondary);
	}

	.empty-state h2 {
		margin: 0;
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	.empty-state p {
		margin: 0;
		max-width: 400px;
	}

	/* Icon colors for podium */
	:global(.gold) { color: var(--color-rank-gold); }
	:global(.silver) { color: var(--color-fg-secondary); }
	:global(.bronze) { color: var(--color-rank-bronze); }

	/* Mobile responsive */
	@media (max-width: 768px) {
		.table-header,
		.table-row {
			grid-template-columns: 40px 1fr 80px 60px 60px;
			font-size: var(--text-body-sm);
		}

		/* Hide some columns on mobile */
		.col.stat:nth-child(n+6) {
			display: none;
		}
	}
</style>
