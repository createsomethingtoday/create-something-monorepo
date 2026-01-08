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
		gap: var(--space-3);
		padding: var(--space-5);
		background: var(--color-surface-raised);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-3);
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
		box-sizing: border-box;
	}
	
	.game-of-night-card:hover {
		border-color: var(--color-primary);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	}
	
	.game-of-night-card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	/* Special styling for high-excitement games */
	.game-of-night-card.instant-classic {
		border-color: var(--color-warning);
		background: linear-gradient(135deg, var(--color-surface-raised) 0%, rgba(255, 193, 7, 0.05) 100%);
	}
	
	.game-of-night-card.game-of-night {
		border-color: var(--color-primary);
		background: linear-gradient(135deg, var(--color-surface-raised) 0%, rgba(99, 102, 241, 0.05) 100%);
	}
	
	.badge {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}
	
	.score-pill {
		margin-left: auto;
		padding: var(--space-1) var(--space-2);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
	}
	
	.matchup {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) 0;
	}
	
	.team {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1;
	}
	
	.team.away {
		align-items: flex-start;
	}
	
	.team.home {
		align-items: flex-end;
	}
	
	.team-name {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}
	
	.team-score {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}
	
	.vs {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-weight: var(--font-weight-medium);
	}
	
	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		flex-wrap: wrap;
		padding-top: var(--space-2);
		border-top: 1px solid var(--color-border);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
	
	.status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	
	.live-indicator {
		color: var(--color-error);
		animation: pulse 2s ease-in-out infinite;
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	
	.top-performer {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-primary);
		font-weight: var(--font-weight-medium);
	}
	
	.excitement-breakdown {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-surface);
		border-radius: var(--radius-2);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
	
	.explanation {
		flex: 1;
	}
	
	/* Responsive */
	@media (max-width: 640px) {
		.game-of-night-card {
			padding: var(--space-4);
		}
		
		.team-name {
			font-size: var(--font-size-base);
		}
		
		.team-score {
			font-size: var(--font-size-2xl);
		}
		
		.meta {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
	}
</style>
