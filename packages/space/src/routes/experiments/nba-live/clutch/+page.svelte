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
	
	<div class="container">
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
		background: var(--color-surface);
	}
	
	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
	}
	
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
		flex-wrap: wrap;
	}
	
	.title-section {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		color: var(--color-primary);
	}
	
	.title-section h1 {
		margin: 0;
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}
	
	.subtitle {
		margin: var(--space-1) 0 0;
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
	}
	
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
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
	
	.leaderboard {
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-3);
		padding: var(--space-5);
	}
	
	.leaderboard-header {
		margin-bottom: var(--space-4);
	}
	
	.leaderboard-header h2 {
		margin: 0 0 var(--space-1);
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}
	
	.leaderboard-subtitle {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
	
	.leaderboard-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	
	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 60px 1fr 120px repeat(5, 80px);
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-3);
	}
	
	.table-header {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 2px solid var(--color-border);
	}
	
	.table-row {
		background: var(--color-surface);
		border-radius: var(--radius-2);
		transition: all 0.2s ease;
	}
	
	.table-row:hover {
		background: var(--color-surface-raised);
		transform: translateX(4px);
	}
	
	.table-row.clutch-gene {
		border-left: 3px solid var(--color-primary);
	}
	
	.col.rank {
		text-align: center;
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}
	
	.col.player {
		min-width: 0;
	}
	
	.player-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	
	.player-name {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.clutch-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		width: fit-content;
	}
	
	.rating-display {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	
	.rating-value {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
	}
	
	.rating-bar {
		height: 4px;
		background: var(--color-surface-raised);
		border-radius: var(--radius-full);
		overflow: hidden;
	}
	
	.rating-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-error) 0%, var(--color-warning) 50%, var(--color-success) 100%);
		border-radius: var(--radius-full);
		transition: width 0.3s ease;
	}
	
	.stat-value {
		font-variant-numeric: tabular-nums;
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
	}
	
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-12) var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
	}
	
	.empty-state h2 {
		margin: 0;
		font-size: var(--font-size-2xl);
		color: var(--color-text-primary);
	}
	
	.empty-state p {
		margin: 0;
		max-width: 400px;
	}
	
	/* Icon colors for podium */
	:global(.gold) { color: #FFD700; }
	:global(.silver) { color: #C0C0C0; }
	:global(.bronze) { color: #CD7F32; }
	
	/* Mobile responsive */
	@media (max-width: 768px) {
		.table-header,
		.table-row {
			grid-template-columns: 40px 1fr 80px 60px 60px;
			font-size: var(--font-size-sm);
		}
		
		/* Hide some columns on mobile */
		.col.stat:nth-child(n+6) {
			display: none;
		}
	}
</style>
