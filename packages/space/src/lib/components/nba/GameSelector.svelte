<script lang="ts">
	/**
	 * GameSelector Component
	 *
	 * Displays today's NBA games as selectable cards.
	 * Tufte principle: show the data upfront, minimal decoration.
	 */

	import type { Game } from '$lib/nba/types';
	import { Radio, Clock, CheckCircle } from 'lucide-svelte';

	interface Props {
		games: Game[];
		selectedGameId?: string;
		onselect?: (game: Game) => void;
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
			</button>
		{/each}
	</div>
{/if}

<style>
	/* Empty state */
	.empty-state {
		text-align: center;
		padding: var(--space-xl) var(--space-md);
		color: var(--color-fg-muted);
	}

	.empty-state :global(svg) {
		margin-bottom: var(--space-sm);
	}

	.empty-text {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.empty-subtext {
		font-size: var(--text-body-sm);
	}

	/* Grid */
	.games-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-sm);
	}

	/* Card */
	.game-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		cursor: pointer;
		transition: border-color var(--duration-micro) var(--ease-standard);
		text-align: left;
		width: 100%;
	}

	.game-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.game-card.selected {
		border-color: var(--color-fg-primary);
	}

	.game-card.live {
		border-left: 3px solid var(--color-success);
	}

	/* Header */
	.game-header {
		margin-bottom: var(--space-xs);
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.game-card :global(.status-icon) {
		color: var(--color-fg-muted);
	}

	.game-card :global(.status-icon--live) {
		color: var(--color-success);
	}

	.status-label {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.status-label--live {
		color: var(--color-success);
		font-weight: 500;
	}

	/* Matchup (Tufte: data-ink ratio) */
	.matchup {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
		font-variant-numeric: tabular-nums;
	}

	.team-abbr {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.score {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-secondary);
	}

	.at {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Game clock */
	.game-clock {
		font-size: var(--text-caption);
		color: var(--color-success);
		margin-top: var(--space-xs);
	}
</style>
