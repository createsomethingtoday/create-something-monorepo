<script lang="ts">
	/**
	 * NBA Live Analytics Experiment
	 *
	 * Real-time basketball analysis through three lenses.
	 * A spec-driven development meta-experiment.
	 */

	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';
	import type { Game } from '$lib/nba/types';
	import GameSelector from '$lib/components/nba/GameSelector.svelte';
	import GameHighlightCard from '$lib/components/nba/GameHighlightCard.svelte';
	import DateNavigation from '$lib/components/nba/DateNavigation.svelte';
	import { selectGameOfTheNight } from '$lib/nba/calculations';
	import { Zap, Shield, GitBranch, ArrowRight, Clock, Radio, AlertCircle, TrendingUp } from 'lucide-svelte';
	import { invalidate } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let selectedGame = $state<Game | null>(null);

	const analysisOptions = [
		{
			slug: 'duo-synergy',
			title: 'Duo Synergy',
			description: 'Which two-player combinations are most effective? Compare their points per possession against the league average.',
			icon: Zap
		},
		{
			slug: 'defensive-impact',
			title: 'Defensive Impact',
			description: 'How well is each defender limiting their matchup? See actual vs expected shooting percentages.',
			icon: Shield
		},
		{
			slug: 'shot-network',
			title: 'Shot Network',
			description: 'Who creates shots for whom? Trace the passing connections that lead to scoring opportunities.',
			icon: GitBranch
		}
	];

	function handleGameSelect(game: Game) {
		selectedGame = game;

		// Smooth scroll to game details section
		setTimeout(() => {
			const analysisSection = document.getElementById('game-details');
			if (analysisSection) {
				analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 50); // Brief delay to ensure DOM has updated
	}

	// Count games by status for the summary
	const liveCount = $derived(data.games.filter(g => g.status === 'live').length);
	const scheduledCount = $derived(data.games.filter(g => g.status === 'scheduled').length);
	const finalCount = $derived(data.games.filter(g => g.status === 'final').length);

	// Select game of the night from completed games
	const gameOfTheNight = $derived(selectGameOfTheNight(data.games));

	// Check if we're viewing today's games (used in labels and messaging)
	const isToday = $derived(data.currentDate === new Date().toISOString().split('T')[0]);

	// Format date display for section headers
	const dateLabel = $derived.by(() => {
		if (isToday) return "Today's Games";

		const date = new Date(data.currentDate + 'T00:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const dateObj = new Date(date);
		dateObj.setHours(0, 0, 0, 0);

		const diffDays = Math.floor((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === -1) return "Yesterday's Games";

		return `Games - ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
	});

	// Auto-refresh every 30 seconds when games are live or scheduled
	// Uses $effect to reactively start/stop polling when date changes
	$effect(() => {
		const hasActiveGames = data.games.some(g => g.status === 'live' || g.status === 'scheduled');
		const viewingToday = data.currentDate === new Date().toISOString().split('T')[0];

		if (viewingToday && hasActiveGames) {
			console.log('[NBA Live] Starting 30-second auto-refresh polling');
			const interval = setInterval(
				() => {
					console.log('[NBA Live] Refreshing game data...');
					invalidate('/experiments/nba-live');
				},
				30 * 1000 // 30 seconds
			);

			// Cleanup on dependency change or component unmount
			return () => {
				console.log('[NBA Live] Stopping auto-refresh polling');
				clearInterval(interval);
			};
		} else {
			console.log('[NBA Live] Polling disabled', { viewingToday, hasActiveGames });
		}
	});

	// Clear selected game when date changes
	$effect(() => {
		data.currentDate; // Track dependency
		selectedGame = null;
	});
</script>

<SEO
	title="NBA Live Analytics | CREATE SOMETHING"
	description="Analyze live NBA games through duo synergy, defensive impact, and shot creation networks. Real data, real-time insights."
	keywords="NBA analytics, live basketball, duo synergy, defensive impact, shot network, real-time sports data"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Experiments', url: 'https://createsomething.space/experiments' },
		{ name: 'NBA Live Analytics', url: 'https://createsomething.space/experiments/nba-live' }
	]}
/>

<!-- Header -->
<section class="page-header">
	<div class="container">
		<p class="category">Experiment</p>
		<h1 class="title">NBA Live Analytics</h1>
		<p class="subtitle">
			Watch how players work together, defend their matchups, and create scoring opportunities—updated every 30 seconds during live games.
		</p>
	</div>
</section>

<!-- Data Status -->
<section class="status-section">
	<div class="container">
		<div class="status-bar" role="status" aria-live="polite">
			<div class="status-indicator">
				{#if data.error}
					<AlertCircle size={16} class="status-icon status-icon--error" />
					<span class="status-label status-label--error">Connection issue</span>
				{:else if liveCount > 0}
					<Radio size={16} class="status-icon status-icon--live" />
					<span class="status-label status-label--live">{liveCount} live</span>
				{:else if data.cached}
					<Clock size={16} class="status-icon status-icon--cached" />
					<span class="status-label status-label--cached">Cached</span>
				{:else}
					<Clock size={16} class="status-icon" />
					<span class="status-label">Updated</span>
				{/if}
			</div>
			<span class="timestamp">
				{new Date(data.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
			</span>
		</div>
	</div>
</section>

<!-- Game Summary (Tufte: show the data upfront) -->
{#if !data.error && data.games.length > 0}
	<section class="summary-section">
		<div class="container">
			<div class="summary-row">
				{#if liveCount > 0}
					<span class="summary-stat summary-stat--live">{liveCount} live</span>
				{/if}
				{#if scheduledCount > 0}
					<span class="summary-stat">{scheduledCount} upcoming</span>
				{/if}
				{#if finalCount > 0}
					<span class="summary-stat summary-stat--muted">{finalCount} final</span>
				{/if}
			</div>
		</div>
	</section>
{/if}

<!-- Date Navigation -->
<section class="date-section">
	<div class="container">
		<DateNavigation currentDate={data.currentDate} />
	</div>
</section>

<!-- Game Selector -->
<section class="games-section">
	<div class="container">
		<h2 class="section-label">{dateLabel}</h2>

		{#if data.error}
			<div class="error-state">
				<AlertCircle size={24} />
				<p class="error-message">We couldn't load {isToday ? "today's" : 'these'} games.</p>
				<p class="error-hint">
					The NBA data feed may be temporarily unavailable. Check back in a few minutes.
				</p>
			</div>
		{:else if data.noGamesScheduled}
			<div class="empty-state">
				<Clock size={24} />
				<p class="empty-message">No games scheduled for this date</p>
				<p class="empty-hint">
					{#if isToday}
						The schedule hasn't been published yet. Games are typically added a few hours before tip-off—check back later today.
					{:else}
						We only have game data starting from Jan 5, 2026.
					{/if}
				</p>
			</div>
		{:else}
			<GameSelector
				games={data.games}
				selectedGameId={selectedGame?.id}
				onselect={handleGameSelect}
			/>
		{/if}
	</div>
</section>

<!-- Game of the Night -->
{#if gameOfTheNight}
	<section class="highlight-section">
		<div class="container">
			<GameHighlightCard
				game={gameOfTheNight.game}
				reason={gameOfTheNight.reason}
				highlightStat={gameOfTheNight.highlightStat}
			/>
		</div>
	</section>
{/if}

<!-- Analysis Options -->
{#if selectedGame}
	<section id="game-details" class="analysis-section">
		<div class="container">
			<div class="selected-game">
				<h2 class="matchup">
					{selectedGame.awayTeam.abbreviation}
					<span class="score">{selectedGame.awayScore}</span>
					<span class="at">at</span>
					<span class="score">{selectedGame.homeScore}</span>
					{selectedGame.homeTeam.abbreviation}
				</h2>
				{#if selectedGame.status === 'live'}
					<p class="game-status">Q{selectedGame.quarter} · {selectedGame.gameClock}</p>
				{:else if selectedGame.status === 'final'}
					<p class="game-status game-status--final">Final</p>
				{/if}
			</div>

			<h3 class="section-label">Choose an analysis</h3>
			<div class="analysis-grid">
				{#each analysisOptions as option}
					<a
						href="/experiments/nba-live/{option.slug}?gameId={selectedGame.id}"
						class="analysis-card"
					>
						<div class="card-header">
							<option.icon size={20} class="card-icon" />
							<h4 class="card-title">{option.title}</h4>
						</div>
						<p class="card-description">{option.description}</p>
						<span class="card-action">
							View analysis <ArrowRight size={14} />
						</span>
					</a>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- League Insights Link -->
{#if finalCount > 0}
	<section class="insights-link-section">
		<div class="container">
			<a
				href="/experiments/nba-live/league-insights?date={data.currentDate}"
				class="insights-link-card"
			>
				<div class="insights-link-header">
					<TrendingUp size={20} class="insights-link-icon" />
					<h3 class="insights-link-title">League Insights</h3>
				</div>
				<p class="insights-link-description">
					See league-wide trends from {isToday ? "today's" : "this date's"} {finalCount} completed {finalCount ===
					1
						? 'game'
						: 'games'}.
					Ball movement correlation, competitive balance, and more.
				</p>
				<span class="insights-link-action">
					View insights <ArrowRight size={14} />
				</span>
			</a>
		</div>
	</section>
{/if}

<!-- About -->
<section class="about-section">
	<div class="container">
		<div class="about-card">
			<h3 class="about-title">How this works</h3>
			<p class="about-text">
				This dashboard pulls live data from the NBA and calculates advanced metrics in real-time.
				It's also an experiment in AI-assisted development—we built it using structured specifications
				to see how well agents can handle complex, data-driven features.
			</p>
			<a href="https://createsomething.io/papers/spec-driven-development" class="about-link">
				Read about the development process <ArrowRight size={14} />
			</a>
		</div>
	</div>
</section>

<style>
	/* Layout */
	.container {
		max-width: 56rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Header */
	.page-header {
		padding: var(--space-xl) 0 var(--space-lg);
	}

	.category {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		max-width: 40rem;
	}

	/* Date Navigation (Tufte: prominent but minimal) */
	.date-section {
		padding-bottom: var(--space-md);
	}

	/* Status Bar */
	.status-section {
		padding-bottom: var(--space-md);
	}

	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.status-indicator :global(.status-icon) {
		color: var(--color-fg-muted);
	}

	.status-indicator :global(.status-icon--live) {
		color: var(--color-success);
	}

	.status-indicator :global(.status-icon--error) {
		color: var(--color-error);
	}

	.status-indicator :global(.status-icon--cached) {
		color: var(--color-warning);
	}

	.status-label {
		color: var(--color-fg-tertiary);
	}

	.status-label--live {
		color: var(--color-success);
	}

	.status-label--error {
		color: var(--color-error);
	}

	.status-label--cached {
		color: var(--color-warning);
	}

	.timestamp {
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Summary */
	.summary-section {
		padding-bottom: var(--space-md);
	}

	.summary-row {
		display: flex;
		gap: var(--space-md);
	}

	.summary-stat {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.summary-stat--live {
		color: var(--color-success);
		font-weight: 500;
	}

	.summary-stat--muted {
		color: var(--color-fg-muted);
	}

	/* Section Labels */
	.section-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	/* Games Section */
	.games-section {
		padding-bottom: var(--space-md);
	}

	/* Highlight Section */
	.highlight-section {
		padding-bottom: var(--space-xl);
	}

	/* Error State */
	.error-state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-fg-muted);
	}

	.error-state :global(svg) {
		color: var(--color-error);
		margin-bottom: var(--space-sm);
	}

	.error-message {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.error-hint {
		font-size: var(--text-body-sm);
	}

	/* Empty State (No Games Scheduled) */
	.empty-state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-fg-muted);
	}

	.empty-state :global(svg) {
		display: block;
		margin-inline: auto;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-muted);
	}

	.empty-message {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.empty-hint {
		font-size: var(--text-body-sm);
	}

	/* Analysis Section */
	.analysis-section {
		padding-bottom: var(--space-xl);
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-lg);
		scroll-margin-top: var(--space-lg);
	}

	.selected-game {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.matchup {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: var(--space-sm);
	}

	.score {
		font-variant-numeric: tabular-nums;
		color: var(--color-fg-secondary);
	}

	.at {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-weight: 400;
	}

	.game-status {
		font-size: var(--text-body-sm);
		color: var(--color-success);
		margin-top: var(--space-xs);
	}

	.game-status--final {
		color: var(--color-fg-muted);
	}

	/* Analysis Grid */
	.analysis-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.analysis-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		text-decoration: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
		display: flex;
		flex-direction: column;
	}

	.analysis-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.analysis-card :global(.card-icon) {
		color: var(--color-fg-tertiary);
	}

	.card-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.card-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
		flex: 1;
	}

	.card-action {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.analysis-card:hover .card-action {
		color: var(--color-fg-secondary);
	}

	/* Insights Link Section */
	.insights-link-section {
		padding-bottom: var(--space-lg);
	}

	.insights-link-card {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-data-1);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		text-decoration: none;
		display: block;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.insights-link-card:hover {
		border-color: var(--color-fg-primary);
	}

	.insights-link-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.insights-link-card :global(.insights-link-icon) {
		color: var(--color-data-1);
	}

	.insights-link-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.insights-link-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
		margin-bottom: var(--space-sm);
	}

	.insights-link-action {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.insights-link-card:hover .insights-link-action {
		color: var(--color-fg-primary);
	}

	/* About Section */
	.about-section {
		padding-bottom: var(--space-xl);
	}

	.about-card {
		padding: var(--space-md);
		border-left: 2px solid var(--color-border-default);
	}

	.about-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.about-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	.about-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.about-link:hover {
		color: var(--color-fg-primary);
	}
</style>
