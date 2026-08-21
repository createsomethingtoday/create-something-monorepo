<script lang="ts">
	import { Archive, ArrowRight, BarChart3 } from 'lucide-svelte';
	import type { RecentHistory } from '$lib/nba/types';

	interface Props {
		history: RecentHistory;
	}

	let { history }: Props = $props();

	function formatDate(date: string): string {
		return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		});
	}
</script>

<section class="history" aria-labelledby="recent-history-title">
	<div class="history-heading">
		<div>
			<p class="history-kicker">
				<Archive size={14} />
				{history.source === 'archive' ? 'NBA archive' : 'Scoreboard history'}
			</p>
			<h2 id="recent-history-title">Recent games</h2>
			<p class="history-description">
				Browse the latest completed slates and open their score, play-by-play, and analysis views.
			</p>
		</div>
	</div>

	<div class="slate-grid">
		{#each history.slates as slate}
			<a class="slate-card" href="/data/nba?date={slate.date}">
				<div class="slate-header">
					<time datetime={slate.date}>{formatDate(slate.date)}</time>
					<ArrowRight size={15} aria-hidden="true" />
				</div>

				<div class="game-list">
					{#each slate.games.slice(0, 2) as game}
						<div class="game-row">
							<div class="matchup">
								<span>{game.awayTeam.abbreviation}</span>
								<strong>{game.awayScore}</strong>
								<span class="at">at</span>
								<strong>{game.homeScore}</strong>
								<span>{game.homeTeam.abbreviation}</span>
							</div>
							<span class:analysis-ready={game.analyticsAvailable !== false} class="capability">
								{#if game.analyticsAvailable !== false}
									<BarChart3 size={12} aria-hidden="true" /> Full analysis
								{:else}
									Scores only
								{/if}
							</span>
						</div>
					{/each}
				</div>

				{#if slate.games.length > 2}
					<span class="more-games">+{slate.games.length - 2} more games</span>
				{/if}
			</a>
		{/each}
	</div>
</section>

<style>
	.history {
		max-width: 56rem;
		margin: 0 auto;
		padding: 0 var(--space-performance-md) var(--space-performance-xl);
	}

	.history-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: var(--space-performance-md);
		margin-bottom: var(--space-performance-md);
	}

	.history-kicker {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		margin: 0 0 var(--space-performance-xs);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	h2 {
		margin: 0;
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
	}

	.history-description {
		margin: var(--space-performance-xs) 0 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.slate-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-performance-sm);
	}

	.slate-card {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-md);
		border: 1px solid var(--color-performance-border-subtle);
		border-radius: var(--radius-performance-scale-md);
		background: var(--color-performance-bg-surface);
		color: inherit;
		text-decoration: none;
		transition:
			border-color var(--duration-performance-micro) var(--ease-performance-standard),
			transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.slate-card:hover,
	.slate-card:focus-visible {
		border-color: var(--color-performance-border-emphasis);
		transform: translateY(-2px);
		outline: none;
	}

	.slate-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-performance-sm);
		color: var(--color-performance-fg-primary);
	}

	time {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
	}

	.game-list {
		display: grid;
		gap: var(--space-performance-sm);
	}

	.game-row {
		display: grid;
		gap: var(--space-performance-xs);
	}

	.matchup {
		display: grid;
		grid-template-columns: 1fr auto auto auto 1fr;
		align-items: baseline;
		gap: 0.35rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-performance-fg-primary);
	}

	.matchup span:last-child {
		text-align: right;
	}

	.at {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.capability {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.capability.analysis-ready {
		color: var(--color-performance-fg-secondary);
	}

	.more-games {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	@media (max-width: 48rem) {
		.slate-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
