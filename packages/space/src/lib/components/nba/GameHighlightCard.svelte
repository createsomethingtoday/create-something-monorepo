<script lang="ts">
	/**
	 * GameHighlightCard Component
	 *
	 * Highlights the most interesting game of the night.
	 * Auto-selects based on criteria (highest scoring OR closest margin).
	 * Tufte principle: surface the insight, minimal decoration.
	 */

	import type { Game } from '$lib/nba/types';
	import { Trophy } from 'lucide-svelte';

	interface Props {
		game: Game;
		reason: 'highest-scoring' | 'closest-margin';
		highlightStat?: string;
	}

	let { game, reason, highlightStat }: Props = $props();

	const totalPoints = $derived(game.homeScore + game.awayScore);
	const margin = $derived(Math.abs(game.homeScore - game.awayScore));

	const badgeText = $derived(() => {
		if (reason === 'highest-scoring') {
			return `Highest Scoring (${totalPoints} pts)`;
		}
		return `Closest Game (${margin} pt margin)`;
	});
</script>

<div class="highlight-card">
	<div class="badge">
		<Trophy size={14} class="badge-icon" />
		<span class="badge-text">Game of the Night</span>
	</div>

	<div class="matchup">
		<div class="team team--away" class:winner={game.awayScore > game.homeScore}>
			<span class="team-abbr">{game.awayTeam.abbreviation}</span>
			<span class="team-score">{game.awayScore}</span>
		</div>

		<div class="at">@</div>

		<div class="team team--home" class:winner={game.homeScore > game.awayScore}>
			<span class="team-score">{game.homeScore}</span>
			<span class="team-abbr">{game.homeTeam.abbreviation}</span>
		</div>
	</div>

	<div class="highlight-reason">
		<p class="reason-text">{badgeText()}</p>
		{#if highlightStat}
			<p class="stat-text">{highlightStat}</p>
		{/if}
	</div>

	<div class="status">Final</div>
</div>

<style>
	.highlight-card {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-data-4);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		position: relative;
		overflow: hidden;
	}

	.highlight-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 4px;
		height: 100%;
		background: var(--color-data-4);
	}

	/* Badge */
	.badge {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.highlight-card :global(.badge-icon) {
		color: var(--color-data-4);
	}

	.badge-text {
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-data-4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Matchup */
	.matchup {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.team {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		flex: 1;
	}

	.team--away {
		justify-content: flex-end;
	}

	.team--home {
		justify-content: flex-start;
	}

	.team.winner .team-abbr {
		font-weight: 700;
	}

	.team.winner .team-score {
		color: var(--color-fg-primary);
	}

	.team-abbr {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.team-score {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-secondary);
		font-variant-numeric: tabular-nums;
	}

	.at {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	/* Highlight reason */
	.highlight-reason {
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-sm);
	}

	.reason-text {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.stat-text {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	/* Status */
	.status {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
	}
</style>
