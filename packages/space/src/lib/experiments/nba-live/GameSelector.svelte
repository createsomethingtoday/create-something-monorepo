<script lang="ts">
	/**
	 * GameSelector Component
	 *
	 * Displays today's NBA games as selectable cards.
	 * Tufte principle: show the data upfront, minimal decoration.
	 */

	import type { Game } from '$lib/nba/types';
	import { Radio, Clock, CheckCircle } from 'lucide-svelte';
	import VolumeMetric from './VolumeMetric.svelte';

	interface GameWithVolume extends Game {
		volumeMetric?: {
			awayMadeFG: number;
			homeMadeFG: number;
			differential: number;
		};
	}

	interface Props {
		games: GameWithVolume[];
		selectedGameId?: string;
		onselect?: (game: GameWithVolume) => void;
	}

	let { games, selectedGameId, onselect }: Props = $props();

	function formatGameClock(game: Game): string {
		if (game.status === 'scheduled') {
			const date = new Date(game.startTime);
			return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}
		if (game.status === 'final') {
			return 'Final';
		}
		return `Q${game.quarter} ${game.gameClock}`;
	}
</script>

{#if games.length === 0}
	<div class="empty-state">
		<Clock size={24} />
		<p class="empty-text">No games scheduled for today</p>
		<p class="empty-subtext">Check back later for the next slate</p>
	</div>
{:else}
	<div class="games-grid">
		{#each games as game}
			<button
				class="game-card"
				class:selected={selectedGameId === game.id}
				class:live={game.status === 'live'}
				class:scoreboard-only={game.analyticsAvailable === false}
				disabled={game.analyticsAvailable === false}
				onclick={() => onselect?.(game)}
			>
				<div class="game-header">
					<span class="status-indicator">
						{#if game.status === 'live'}
							<Radio size={14} class="status-icon status-icon--live" />
							<span class="status-label status-label--live">Live</span>
						{:else if game.status === 'final'}
							<CheckCircle size={14} class="status-icon" />
							<span class="status-label">Final</span>
						{:else}
							<Clock size={14} class="status-icon" />
							<span class="status-label">{formatGameClock(game)}</span>
						{/if}
						{#if game.analyticsAvailable === false}
							<span class="provider-label">Scoreboard only</span>
						{/if}
					</span>
				</div>

				<div class="matchup">
					<span class="team-abbr">{game.awayTeam.abbreviation}</span>
					<span class="score">{game.awayScore}</span>
					<span class="at">@</span>
					<span class="score">{game.homeScore}</span>
					<span class="team-abbr">{game.homeTeam.abbreviation}</span>
				</div>

				{#if game.status === 'live' && game.gameClock}
					<div class="game-clock">Q{game.quarter} · {game.gameClock}</div>
				{/if}

				{#if game.volumeMetric}
					<VolumeMetric
						awayTeam={game.awayTeam.abbreviation}
						homeTeam={game.homeTeam.abbreviation}
						awayMadeFG={game.volumeMetric.awayMadeFG}
						homeMadeFG={game.volumeMetric.homeMadeFG}
						differential={game.volumeMetric.differential}
					/>
				{/if}
			</button>
		{/each}
	</div>
{/if}

<style>
	/* Empty state */
	.empty-state {
		text-align: center;
		padding: var(--space-performance-xl) var(--space-performance-md);
		color: var(--color-performance-fg-muted);
	}

	.empty-state :global(svg) {
		margin-bottom: var(--space-performance-sm);
	}

	.empty-text {
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-xs);
	}

	.empty-subtext {
		font-size: var(--text-performance-body-sm);
	}

	/* Grid */
	.games-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-performance-sm);
	}

	/* Card */
	.game-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		padding: var(--space-performance-sm) var(--space-performance-md);
		cursor: pointer;
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
		text-align: left;
		width: 100%;
	}

	.game-card:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.game-card.selected {
		border-color: var(--color-performance-fg-primary);
	}

	.game-card.live {
		border-left: 3px solid var(--color-performance-success);
	}

	.game-card.scoreboard-only {
		cursor: default;
		opacity: 0.88;
	}

	.game-card.scoreboard-only:hover {
		border-color: var(--color-performance-border-default);
	}

	/* Header */
	.game-header {
		margin-bottom: var(--space-performance-xs);
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	.game-card :global(.status-icon) {
		color: var(--color-performance-fg-muted);
	}

	.game-card :global(.status-icon--live) {
		color: var(--color-performance-success);
	}

	.status-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
	}

	.status-label--live {
		color: var(--color-performance-success);
		font-weight: 500;
	}

	.provider-label {
		margin-left: auto;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	/* Matchup (Tufte: data-ink ratio) */
	.matchup {
		display: flex;
		align-items: baseline;
		gap: var(--space-performance-xs);
		font-variant-numeric: tabular-nums;
	}

	.team-abbr {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.score {
		font-size: var(--text-performance-h3);
		font-weight: 700;
		color: var(--color-performance-fg-secondary);
	}

	.at {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	/* Game clock */
	.game-clock {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-success);
		margin-top: var(--space-performance-xs);
	}
</style>
