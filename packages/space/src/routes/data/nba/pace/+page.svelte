<script lang="ts">
	/**
	 * Pace Analysis Dashboard
	 * 
	 * Interactive dashboard visualizing team pace, points per possession, and efficiency.
	 * Uses LayerCake for charts.
	 */
	
	import { SEO } from '@create-something/canon';
	import type { PageData } from './$types';
	import { AnalyticsNav } from '$lib/experiments/nba-live';
	import { DateNavigation } from '$lib/experiments/nba-live';
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

<SEO
	title="Pace Analysis | NBA Live Analytics"
	description="Team pace, tempo, and offensive efficiency analysis. Possessions per game and points per possession metrics."
	keywords="NBA pace, tempo analysis, offensive efficiency, possessions per game, points per possession"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Data Studio', url: 'https://createsomething.space/data' },
		{ name: 'NBA Live Analytics', url: 'https://createsomething.space/data/nba' },
		{ name: 'Pace Analysis', url: 'https://createsomething.space/data/nba/pace' }
	]}
/>

<div class="pace-page">
	<AnalyticsNav />

	<div class="container max-w-7xl">
		<!-- Header -->
		<header class="page-header">
			<div class="title-section">
				<TrendingUp size={32} />
				<div>
					<h1>Pace & Tempo Analysis</h1>
					<p class="subtitle">Possessions per game and offensive efficiency</p>
				</div>
			</div>
			
			<DateNavigation currentDate={data.date} baseUrl="/data/nba/pace" />
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
		background: var(--color-performance-bg-pure);
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-performance-xl) var(--space-performance-lg);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-performance-lg);
		margin-bottom: var(--space-performance-xl);
		flex-wrap: wrap;
	}

	.title-section {
		display: flex;
		align-items: flex-start;
		gap: var(--space-performance-md);
		color: var(--color-performance-data-1);
	}

	.title-section h1 {
		margin: 0;
		font-size: var(--text-performance-h1);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.subtitle {
		margin: var(--space-performance-xs) 0 0;
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
	}

	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-performance-lg);
		margin-bottom: var(--space-performance-xl);
	}

	.summary-card {
		display: flex;
		align-items: center;
		gap: var(--space-performance-lg);
		padding: var(--space-performance-lg);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.summary-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--color-performance-data-1);
		color: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-sm);
	}

	.summary-content {
		flex: 1;
	}

	.summary-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-xs);
	}

	.summary-value {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.summary-note {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
		margin-top: var(--space-performance-xs);
	}

	.section {
		margin-bottom: 3rem;
	}

	.section-header {
		margin-bottom: var(--space-performance-lg);
	}

	.section-header h2 {
		margin: 0 0 var(--space-performance-xs);
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.section-subtitle {
		margin: 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.pace-chart {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-lg);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.pace-bar-container {
		display: grid;
		grid-template-columns: 120px 1fr 80px;
		gap: var(--space-performance-md);
		align-items: center;
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		transition: background 0.2s ease;
	}

	.pace-bar-container:hover {
		background: var(--color-performance-bg-surface);
	}

	.team-label {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
	}

	.rank {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-caption);
		font-weight: 700;
		color: var(--color-performance-fg-secondary);
	}

	.team-name {
		font-weight: 500;
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
	}

	.bar-wrapper {
		position: relative;
		height: 32px;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		overflow: hidden;
	}

	.pace-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--color-performance-data-1) 0%, var(--color-performance-success) 100%);
		border-radius: var(--radius-performance-scale-sm);
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: var(--space-performance-sm);
		transition: width 0.3s ease;
	}

	.pace-bar-container.fast .pace-bar {
		background: linear-gradient(90deg, var(--color-performance-success) 0%, var(--color-performance-warning) 100%);
	}

	.pace-bar-container.slow .pace-bar {
		background: linear-gradient(90deg, var(--color-performance-fg-tertiary) 0%, var(--color-performance-fg-secondary) 100%);
	}

	.bar-value {
		font-size: var(--text-performance-body-sm);
		font-weight: 700;
		color: white;
		font-variant-numeric: tabular-nums;
	}

	.pace-badge {
		text-align: right;
	}

	.badge {
		display: inline-block;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-caption);
		font-weight: 600;
	}

	.badge.fast {
		background: var(--color-performance-success);
		color: var(--color-performance-bg-pure);
	}

	.badge.slow {
		background: var(--color-performance-fg-secondary);
		color: var(--color-performance-bg-pure);
	}

	.badge.average {
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-secondary);
	}

	.efficiency-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-performance-lg);
	}

	.efficiency-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
		padding: var(--space-performance-lg);
		background: var(--color-performance-bg-surface);
		border: 2px solid var(--color-performance-border-default);
		border-radius: var(--radius-performance-scale-lg);
		transition: all 0.2s ease;
	}

	.efficiency-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.efficiency-card.high-efficiency {
		border-color: var(--color-performance-success);
	}

	.efficiency-card.low-efficiency {
		border-color: var(--color-performance-error);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: var(--space-performance-sm);
	}

	.card-header .team-name {
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.score {
		font-size: var(--text-performance-body-lg);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.card-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-performance-sm);
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.stat-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.efficiency-indicator {
		padding-top: var(--space-performance-sm);
	}

	.indicator {
		display: inline-block;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-caption);
		font-weight: 600;
	}

	.indicator.high {
		background: var(--color-performance-success);
		color: var(--color-performance-bg-pure);
	}

	.indicator.low {
		background: var(--color-performance-error);
		color: var(--color-performance-fg-primary);
	}

	.indicator.average {
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-secondary);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-performance-md);
		padding: 6rem var(--space-performance-lg);
		text-align: center;
		color: var(--color-performance-fg-secondary);
	}

	.empty-state h2 {
		margin: 0;
		font-size: var(--text-performance-h2);
		color: var(--color-performance-fg-primary);
	}

	.empty-state p {
		margin: 0;
		max-width: 400px;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.pace-bar-container {
			grid-template-columns: 1fr;
			gap: var(--space-performance-sm);
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
