<script lang="ts">
	/**
	 * Pace Analysis Dashboard
	 * 
	 * Interactive dashboard visualizing team pace, points per possession, and efficiency.
	 * Uses LayerCake for charts.
	 */
	
	import type { PageData } from './$types';
	import AnalyticsNav from '$lib/components/nba/AnalyticsNav.svelte';
	import DateNavigation from '$lib/components/nba/DateNavigation.svelte';
	import { TrendingUp, Activity, Target, Zap } from 'lucide-svelte';
	import { invalidate } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	
	let { data }: { data: PageData } = $props();
	
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	
	// Start polling for live games
	onMount(() => {
		if (data.hasLiveGames) {
			pollInterval = setInterval(() => {
				invalidate('pace:data');
			}, 60000); // Poll every 60s
		}
	});
	
	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});
	
	// Calculate league averages
	const leagueAvgPace = $derived(() => {
		if (data.paceData.length === 0) return 0;
		return data.paceData.reduce((sum, team) => sum + team.pace, 0) / data.paceData.length;
	});
	
	const leagueAvgPPP = $derived(() => {
		if (data.paceData.length === 0) return 0;
		return data.paceData.reduce((sum, team) => sum + team.pointsPerPossession, 0) / data.paceData.length;
	});
	
	// Determine pace category
	const getPaceCategory = (pace: number) => {
		const avg = leagueAvgPace();
		if (pace > avg + 5) return 'fast';
		if (pace < avg - 5) return 'slow';
		return 'average';
	};
	
	// Determine efficiency category
	const getEfficiencyCategory = (ppp: number) => {
		const avg = leagueAvgPPP();
		if (ppp > avg + 0.05) return 'high';
		if (ppp < avg - 0.05) return 'low';
		return 'average';
	};
</script>

<svelte:head>
	<title>Pace Analysis | NBA Live Analytics</title>
	<meta name="description" content="Team pace, tempo, and offensive efficiency analysis" />
</svelte:head>

<div class="pace-page">
	<AnalyticsNav />
	
	<div class="container">
		<!-- Header -->
		<header class="page-header">
			<div class="title-section">
				<TrendingUp size={32} />
				<div>
					<h1>Pace & Tempo Analysis</h1>
					<p class="subtitle">Possessions per game and offensive efficiency</p>
				</div>
			</div>
			
			<DateNavigation currentDate={data.date} baseUrl="/experiments/nba-live/pace" />
		</header>
		
		<!-- League Averages -->
		{#if data.paceData.length > 0}
			<div class="summary-cards">
				<div class="summary-card">
					<div class="summary-icon">
						<Activity size={24} />
					</div>
					<div class="summary-content">
						<div class="summary-label">League Avg Pace</div>
						<div class="summary-value">{leagueAvgPace().toFixed(1)}</div>
						<div class="summary-note">possessions/game</div>
					</div>
				</div>
				
				<div class="summary-card">
					<div class="summary-icon">
						<Target size={24} />
					</div>
					<div class="summary-content">
						<div class="summary-label">League Avg PPP</div>
						<div class="summary-value">{leagueAvgPPP().toFixed(3)}</div>
						<div class="summary-note">points/possession</div>
					</div>
				</div>
				
				<div class="summary-card">
					<div class="summary-icon">
						<Zap size={24} />
					</div>
					<div class="summary-content">
						<div class="summary-label">Teams Tracked</div>
						<div class="summary-value">{data.paceData.length}</div>
						<div class="summary-note">from {data.paceData.length / 2} games</div>
					</div>
				</div>
			</div>
			
			<!-- Pace Distribution -->
			<div class="section">
				<div class="section-header">
					<h2>Pace Distribution</h2>
					<p class="section-subtitle">Teams ranked by possessions per game</p>
				</div>
				
				<div class="pace-chart">
					{#each data.paceData as team, index}
						<div 
							class="pace-bar-container"
							class:fast={getPaceCategory(team.pace) === 'fast'}
							class:slow={getPaceCategory(team.pace) === 'slow'}
						>
							<div class="team-label">
								<span class="rank">{index + 1}</span>
								<span class="team-name">{team.teamName}</span>
							</div>
							
							<div class="bar-wrapper">
								<div 
									class="pace-bar" 
									style="width: {(team.pace / 120) * 100}%"
								>
									<span class="bar-value">{team.pace.toFixed(1)}</span>
								</div>
							</div>
							
							<div class="pace-badge">
								{#if getPaceCategory(team.pace) === 'fast'}
									<span class="badge fast">Fast</span>
								{:else if getPaceCategory(team.pace) === 'slow'}
									<span class="badge slow">Slow</span>
								{:else}
									<span class="badge average">Avg</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Efficiency Matrix -->
			<div class="section">
				<div class="section-header">
					<h2>Pace vs Efficiency</h2>
					<p class="section-subtitle">Points per possession by pace category</p>
				</div>
				
				<div class="efficiency-grid">
					{#each data.paceData as team}
						<div 
							class="efficiency-card"
							class:high-efficiency={getEfficiencyCategory(team.pointsPerPossession) === 'high'}
							class:low-efficiency={getEfficiencyCategory(team.pointsPerPossession) === 'low'}
						>
							<div class="card-header">
								<span class="team-name">{team.teamName}</span>
								<span class="score">{team.points} pts</span>
							</div>
							
							<div class="card-stats">
								<div class="stat">
									<span class="stat-label">Pace</span>
									<span class="stat-value">{team.pace.toFixed(1)}</span>
								</div>
								
								<div class="stat">
									<span class="stat-label">PPP</span>
									<span class="stat-value">{team.pointsPerPossession.toFixed(3)}</span>
								</div>
								
								<div class="stat">
									<span class="stat-label">Possessions</span>
									<span class="stat-value">{team.possessions.toFixed(0)}</span>
								</div>
							</div>
							
							<div class="efficiency-indicator">
								{#if getEfficiencyCategory(team.pointsPerPossession) === 'high'}
									<span class="indicator high">High Efficiency</span>
								{:else if getEfficiencyCategory(team.pointsPerPossession) === 'low'}
									<span class="indicator low">Low Efficiency</span>
								{:else}
									<span class="indicator average">Average</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<TrendingUp size={48} />
				<h2>No pace data available</h2>
				<p>Pace analysis appears once games have sufficient data to calculate possessions.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.pace-page {
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
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	
	.summary-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-3);
	}
	
	.summary-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: var(--radius-2);
	}
	
	.summary-content {
		flex: 1;
	}
	
	.summary-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-1);
	}
	
	.summary-value {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}
	
	.summary-note {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		margin-top: var(--space-1);
	}
	
	.section {
		margin-bottom: var(--space-8);
	}
	
	.section-header {
		margin-bottom: var(--space-4);
	}
	
	.section-header h2 {
		margin: 0 0 var(--space-1);
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}
	
	.section-subtitle {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
	
	.pace-chart {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-3);
	}
	
	.pace-bar-container {
		display: grid;
		grid-template-columns: 120px 1fr 80px;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-2);
		border-radius: var(--radius-2);
		transition: background 0.2s ease;
	}
	
	.pace-bar-container:hover {
		background: var(--color-surface);
	}
	
	.team-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	
	.rank {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: var(--color-surface);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-secondary);
	}
	
	.team-name {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
	}
	
	.bar-wrapper {
		position: relative;
		height: 32px;
		background: var(--color-surface);
		border-radius: var(--radius-2);
		overflow: hidden;
	}
	
	.pace-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-success) 100%);
		border-radius: var(--radius-2);
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: var(--space-2);
		transition: width 0.3s ease;
	}
	
	.pace-bar-container.fast .pace-bar {
		background: linear-gradient(90deg, var(--color-success) 0%, var(--color-warning) 100%);
	}
	
	.pace-bar-container.slow .pace-bar {
		background: linear-gradient(90deg, var(--color-text-tertiary) 0%, var(--color-text-secondary) 100%);
	}
	
	.bar-value {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: white;
		font-variant-numeric: tabular-nums;
	}
	
	.pace-badge {
		text-align: right;
	}
	
	.badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
	}
	
	.badge.fast {
		background: var(--color-success);
		color: var(--color-text-on-primary);
	}
	
	.badge.slow {
		background: var(--color-text-secondary);
		color: var(--color-text-on-primary);
	}
	
	.badge.average {
		background: var(--color-surface);
		color: var(--color-text-secondary);
	}
	
	.efficiency-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
	}
	
	.efficiency-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--color-surface-raised);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-3);
		transition: all 0.2s ease;
	}
	
	.efficiency-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.efficiency-card.high-efficiency {
		border-color: var(--color-success);
	}
	
	.efficiency-card.low-efficiency {
		border-color: var(--color-error);
	}
	
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}
	
	.card-header .team-name {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}
	
	.score {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}
	
	.card-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
	}
	
	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	
	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.stat-value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}
	
	.efficiency-indicator {
		padding-top: var(--space-2);
		border-top: 1px solid var(--color-border);
	}
	
	.indicator {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
	}
	
	.indicator.high {
		background: var(--color-success);
		color: var(--color-text-on-primary);
	}
	
	.indicator.low {
		background: var(--color-error);
		color: var(--color-text-on-primary);
	}
	
	.indicator.average {
		background: var(--color-surface);
		color: var(--color-text-secondary);
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
	
	/* Mobile responsive */
	@media (max-width: 768px) {
		.pace-bar-container {
			grid-template-columns: 1fr;
			gap: var(--space-2);
		}
		
		.team-label {
			justify-content: space-between;
		}
		
		.pace-badge {
			text-align: left;
		}
		
		.efficiency-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
