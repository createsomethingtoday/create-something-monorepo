<script lang="ts">
	/**
	 * GameSelector Component
	 *
	 * Displays today's NBA games as selectable cards.
	 * Used on the NBA Live experiment landing page.
	 */

	import type { Game } from '$lib/nba/types';

	interface Props {
		games: Game[];
		selectedGameId?: string;
		onselect?: (game: Game) => void;
	}

	let { games, selectedGameId, onselect }: Props = $props();

	function getStatusLabel(status: Game['status']): string {
		switch (status) {
			case 'live':
				return 'LIVE';
			case 'final':
				return 'FINAL';
			case 'scheduled':
				return 'SCHEDULED';
			default:
				return status.toUpperCase();
		}
	}

	function getStatusClass(status: Game['status']): string {
		switch (status) {
			case 'live':
				return 'status-live';
			case 'final':
				return 'status-final';
			case 'scheduled':
				return 'status-scheduled';
			default:
				return '';
		}
	}

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
		<p class="empty-text">No games scheduled for today</p>
		<p class="empty-subtext">Check back later or explore historical data</p>
	</div>
{:else}
	<div class="games-grid">
		{#each games as game}
			<button
				class="game-card"
				class:selected={selectedGameId === game.id}
				onclick={() => onselect?.(game)}
			>
				<div class="game-header">
					<span class="status-badge {getStatusClass(game.status)}">
						{getStatusLabel(game.status)}
					</span>
					<span class="game-clock">{formatGameClock(game)}</span>
				</div>

				<div class="teams-container">
					<div class="team away">
						<span class="team-abbr">{game.awayTeam.abbreviation}</span>
						<span class="team-score">{game.awayScore}</span>
					</div>
					<span class="vs-divider">@</span>
					<div class="team home">
						<span class="team-score">{game.homeScore}</span>
						<span class="team-abbr">{game.homeTeam.abbreviation}</span>
					</div>
				</div>

				<div class="game-footer">
					<span class="arena-name">{game.arena}</span>
				</div>
			</button>
		{/each}
	</div>
{/if}

<style>
	.empty-state {
		text-align: center;
		padding: var(--space-xl) var(--space-md);
	}

	.empty-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		margin-bottom: var(--space-xs);
	}

	.empty-subtext {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.games-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.game-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		text-align: left;
		width: 100%;
	}

	.game-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.game-card.selected {
		border-color: var(--color-fg-primary);
		background: var(--color-active);
	}

	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.status-badge {
		font-size: var(--text-caption);
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-live {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.status-final {
		background: var(--color-bg-subtle);
		color: var(--color-fg-muted);
	}

	.status-scheduled {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.game-clock {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.teams-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) 0;
	}

	.team {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.team.away {
		flex-direction: row;
	}

	.team.home {
		flex-direction: row;
	}

	.team-abbr {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.team-score {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.vs-divider {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.game-footer {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.arena-name {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
</style>
