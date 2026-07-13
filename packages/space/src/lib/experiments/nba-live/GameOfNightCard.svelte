<script lang="ts">
	/**
	 * Game of the Night Card
	 * 
	 * Featured card showing the most exciting game of the day.
	 * Uses the excitement score algorithm to auto-select.
	 */
	
	import type { NBAGameSummary, NBAPlayerBoxScore } from '$lib/nba/types';
	import type { ExcitementScore } from '$lib/nba/excitement-score';
	import { Trophy, Zap, Clock, TrendingUp } from 'lucide-svelte';
	
	interface Props {
		game: NBAGameSummary;
		excitementScore: ExcitementScore;
		topPerformer?: NBAPlayerBoxScore;
		onclick?: () => void;
	}
	
	let { game, excitementScore, topPerformer, onclick }: Props = $props();
	
	// Determine badge color based on excitement level
	const badgeClass = $derived(() => {
		if (excitementScore.total >= 85) return 'instant-classic';
		if (excitementScore.total >= 70) return 'game-of-night';
		return 'entertaining';
	});
	
	const badgeText = $derived(() => {
		if (excitementScore.total >= 85) return '🔥 INSTANT CLASSIC';
		if (excitementScore.total >= 70) return '⭐ GAME OF THE NIGHT';
		return '✨ Featured Game';
	});
	
	const isOT = $derived(game.period > 4);
	const isFinal = $derived(game.gameStatus === 3);
</script>

<button
	class="game-of-night-card"
	class:instant-classic={badgeClass() === 'instant-classic'}
	class:game-of-night={badgeClass() === 'game-of-night'}
	onclick={onclick}
	type="button"
>
	<!-- Badge -->
	<div class="badge">
		<Trophy size={16} />
		<span>{badgeText()}</span>
		<div class="score-pill">
			{excitementScore.total}/100
		</div>
	</div>
	
	<!-- Matchup -->
	<div class="matchup">
		<div class="team away">
			<span class="team-name">{game.awayTeam.teamCity} {game.awayTeam.teamName}</span>
			<span class="team-score">{game.awayTeam.score}</span>
		</div>
		
		<div class="vs">
			<span>@</span>
		</div>
		
		<div class="team home">
			<span class="team-name">{game.homeTeam.teamCity} {game.homeTeam.teamName}</span>
			<span class="team-score">{game.homeTeam.score}</span>
		</div>
	</div>
	
	<!-- Status & Highlights -->
	<div class="meta">
		<div class="status">
			{#if isFinal}
				<Clock size={14} />
				<span>FINAL{isOT ? ` / ${game.period - 4}OT` : ''}</span>
			{:else}
				<span class="live-indicator">● LIVE</span>
				<span>Q{game.period} {game.gameClock}</span>
			{/if}
		</div>
		
		{#if topPerformer}
			<div class="top-performer">
				<Zap size={14} />
				<span>{topPerformer.firstName} {topPerformer.familyName}: {topPerformer.statistics.points} PTS</span>
			</div>
		{/if}
	</div>
	
	<!-- Excitement Breakdown -->
	<div class="excitement-breakdown">
		<TrendingUp size={14} />
		<span class="explanation">{excitementScore.explanation}</span>
	</div>
</button>

<style>
	.game-of-night-card {
		all: unset;
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
		padding: var(--space-performance-2xl);
		border: 2px solid var(--color-performance-border-default);
		border-radius: var(--radius-performance-scale-lg);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		width: 100%;
		box-sizing: border-box;
	}

	.game-of-night-card:hover {
		border-color: var(--color-performance-data-1);
		transform: translateY(-2px);
		box-shadow: var(--shadow-performance-scale-lg);
	}

	.game-of-night-card:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	/* Special styling for high-excitement games */
	.game-of-night-card.instant-classic {
		border-color: var(--color-performance-warning);
		background: linear-gradient(135deg, var(--color-performance-bg-elevated) 0%, var(--color-performance-warning-muted) 100%);
	}

	.game-of-night-card.game-of-night {
		border-color: var(--color-performance-data-1);
		background: linear-gradient(135deg, var(--color-performance-bg-elevated) 0%, var(--color-performance-data-1-muted) 100%);
	}

	.badge {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.score-pill {
		margin-left: auto;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-data-1);
		color: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-caption);
		font-weight: 700;
	}

	.matchup {
		display: flex;
		align-items: center;
		gap: var(--space-performance-lg);
		padding: var(--space-performance-md) 0;
	}

	.team {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		flex: 1;
	}

	.team.away {
		align-items: flex-start;
	}

	.team.home {
		align-items: flex-end;
	}

	.team-name {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.team-score {
		font-size: var(--text-performance-display);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.vs {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		font-weight: 500;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-performance-lg);
		flex-wrap: wrap;
		padding-top: var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.status {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
	}

	.live-indicator {
		color: var(--color-performance-error);
		animation: pulse var(--duration-performance-complex) var(--ease-performance-standard) infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.top-performer {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		color: var(--color-performance-data-1);
		font-weight: 500;
	}

	.excitement-breakdown {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.explanation {
		flex: 1;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.game-of-night-card {
			padding: var(--space-performance-lg);
		}

		.team-name {
			font-size: var(--text-performance-body);
		}

		.team-score {
			font-size: var(--text-performance-h2);
		}

		.meta {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-performance-sm);
		}
	}
</style>
