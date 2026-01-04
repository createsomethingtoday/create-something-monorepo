<script lang="ts">
	/**
	 * NBA Live Analytics Experiment
	 *
	 * Meta-experiment testing spec-driven development with harness/Gastown.
	 * Analyzes NBA games through three lenses:
	 * - Duo Synergy (two-man efficiency)
	 * - Defensive Impact (matchup vs expected)
	 * - Shot Network (creation graph)
	 */

	import type { PageData } from './$types';
	import type { Game } from '$lib/nba/types';
	import GameSelector from '$lib/components/nba/GameSelector.svelte';

	let { data }: { data: PageData } = $props();

	// Selected game state
	let selectedGame = $state<Game | null>(null);

	// Navigation options for selected game
	const analysisOptions = [
		{
			slug: 'duo-synergy',
			title: 'Duo Synergy',
			description: 'Two-man efficiency vs league average',
			icon: '⚡'
		},
		{
			slug: 'defensive-impact',
			title: 'Defensive Impact',
			description: 'Matchup outcomes vs baseline expectations',
			icon: '🛡️'
		},
		{
			slug: 'shot-network',
			title: 'Shot Network',
			description: 'Ball movement and shot creation graph',
			icon: '🕸️'
		}
	];

	function handleGameSelect(game: Game) {
		selectedGame = game;
	}
</script>

<svelte:head>
	<title>NBA Live Analytics | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content="Real-time NBA analytics experiment exploring duo synergy, defensive impact, and shot creation networks."
	/>
</svelte:head>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   NBA LIVE ANALYTICS                            |
    |                                                 |
    |   [Game] --> +------------------+               |
    |              |  Duo Synergy     | PPP vs League |
    |              |  Defensive Impact| vs Expected   |
    |              |  Shot Network    | Creation Flow |
    |              +------------------+               |
    |                                                 |
    |   Spec-driven development meta-experiment       |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="hero-title">NBA Live Analytics</h1>
		<p class="hero-subtitle">
			Real-time basketball intelligence
		</p>
		<p class="hero-description max-w-2xl mx-auto">
			Analyze live NBA games through three analytical lenses:
			<span class="highlight-text">duo synergy</span>,
			<span class="highlight-text">defensive impact</span>, and
			<span class="highlight-text">shot creation networks</span>.
		</p>
	</div>
</section>

<!-- Data Status -->
<section class="px-6 pb-8">
	<div class="max-w-4xl mx-auto">
		<div class="status-bar flex items-center justify-between">
			<span class="status-text">
				{#if data.error}
					<span class="error-indicator">Error loading games</span>
				{:else if data.cached}
					<span class="cached-indicator">Cached data</span>
				{:else}
					<span class="live-indicator">Live data</span>
				{/if}
			</span>
			<span class="timestamp-text">
				Updated: {new Date(data.timestamp).toLocaleTimeString()}
			</span>
		</div>
	</div>
</section>

<!-- Game Selector -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto">
		<h2 class="section-title mb-6">Today's Games</h2>

		{#if data.error}
			<div class="error-card p-4">
				<p class="error-message">{data.error}</p>
				<p class="error-hint">The NBA API may be unavailable. Try again later.</p>
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

<!-- Analysis Options (shown when game selected) -->
{#if selectedGame}
	<section class="px-6 pb-16">
		<div class="max-w-4xl mx-auto">
			<div class="selected-game-header mb-6">
				<h2 class="section-title">
					{selectedGame.awayTeam.abbreviation} @ {selectedGame.homeTeam.abbreviation}
				</h2>
				<p class="selected-game-meta">
					{selectedGame.awayScore} - {selectedGame.homeScore}
					{#if selectedGame.status === 'live'}
						• Q{selectedGame.quarter} {selectedGame.gameClock}
					{/if}
				</p>
			</div>

			<div class="analysis-grid">
				{#each analysisOptions as option}
					<a
						href="/experiments/nba-live/{option.slug}?gameId={selectedGame.id}"
						class="analysis-card"
					>
						<span class="analysis-icon">{option.icon}</span>
						<h3 class="analysis-title">{option.title}</h3>
						<p class="analysis-description">{option.description}</p>
					</a>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Methodology Note -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto">
		<div class="methodology-card p-6">
			<h3 class="card-title mb-4">Meta-Experiment</h3>
			<p class="methodology-text">
				This experiment tests the hypothesis that spec-driven development can be managed by
				agents using harness and Gastown abstractions. Both the dashboard and the methodology
				documentation are primary artifacts.
			</p>
			<div class="methodology-links mt-4">
				<a href="/papers/spec-driven-development" class="methodology-link">
					Read the methodology paper →
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.ascii-container {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.ascii-art {
		color: var(--color-fg-secondary);
		font-size: clamp(0.5rem, 1.2vw, 0.8rem);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.hero-description {
		color: var(--color-fg-muted);
	}

	.highlight-text {
		color: var(--color-fg-secondary);
	}

	.status-bar {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.status-text {
		font-size: var(--text-body-sm);
	}

	.live-indicator {
		color: var(--color-success);
	}

	.live-indicator::before {
		content: '●';
		margin-right: 0.5rem;
		animation: pulse 2s infinite;
	}

	.cached-indicator {
		color: var(--color-warning);
	}

	.error-indicator {
		color: var(--color-error);
	}

	.timestamp-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
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

	.error-hint {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin-top: var(--space-xs);
	}

	.selected-game-header {
		text-align: center;
	}

	.selected-game-meta {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body);
		margin-top: var(--space-xs);
	}

	.analysis-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-md);
	}

	.analysis-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		display: block;
	}

	.analysis-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
		transform: translateY(-2px);
	}

	.analysis-icon {
		font-size: var(--text-h2);
		display: block;
		margin-bottom: var(--space-sm);
	}

	.analysis-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.analysis-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
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

	.methodology-text {
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.methodology-links {
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.methodology-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.methodology-link:hover {
		color: var(--color-fg-primary);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
