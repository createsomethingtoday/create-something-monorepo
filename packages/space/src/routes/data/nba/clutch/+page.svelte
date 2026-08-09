<script lang="ts">
  /**
   * Clutch Performance Page
   *
   * Leaderboard showing top clutch performers.
   * Filters by date range and displays ice-in-veins ratings.
   */

  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';
  import type { ClutchStats } from '$lib/nba/clutch-calculator';
  import { AnalyticsNav } from '$lib/experiments/nba-live';
  import { DateNavigation } from '$lib/experiments/nba-live';
  import { Zap, TrendingUp, TrendingDown, Flame } from 'lucide-svelte';
  import { invalidate } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';

  let { data }: { data: PageData } = $props();

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  // Start polling for live games
  onMount(() => {
    if (data.hasLiveGames) {
      pollInterval = setInterval(() => {
        invalidate('clutch:data');
      }, 60000); // Poll every 60s
    }
  });

  onDestroy(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  // Determine if player has "clutch gene" (rating 80+)
  const hasClutchGene = (rating: number) => rating >= 80;

  // Format percentage
  const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;
</script>

<SEO
  title="Close-game performers | NBA Live Analytics"
  description="Compare whole-game player performance from NBA games decided by five points or fewer."
  keywords="NBA close games, whole-game player performance, close-game rating, basketball analytics"
  propertyName="space"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.space' },
    { name: 'Data Studio', url: 'https://createsomething.space/data' },
    { name: 'NBA Live Analytics', url: 'https://createsomething.space/data/nba' },
    { name: 'Close-game performers', url: 'https://createsomething.space/data/nba/clutch' }
  ]}
/>

{#snippet playerRow(player: ClutchStats, index: number)}
  <div class="table-row" class:clutch-gene={hasClutchGene(player.iceInVeinsRating)}>
    <div class="col rank">
      {#if index === 0}
        <Flame size={18} class="gold" />
      {:else if index === 1}
        <Flame size={18} class="silver" />
      {:else if index === 2}
        <Flame size={18} class="bronze" />
      {:else}
        <span>{index + 1}</span>
      {/if}
    </div>

    <div class="col player">
      <div class="player-info">
        <span class="player-name">{player.playerName}</span>
        {#if hasClutchGene(player.iceInVeinsRating)}
          <span class="clutch-badge">
            <Zap size={12} />
            80+ rating
          </span>
        {/if}
      </div>
    </div>

    <div class="col rating">
      <div class="rating-display">
        <span class="rating-value">{player.iceInVeinsRating}</span>
        <div class="rating-bar">
          <div class="rating-fill" style="width: {player.iceInVeinsRating}%"></div>
        </div>
      </div>
    </div>

    <div class="col stat">
      <span class="stat-value">{formatPct(player.fieldGoalPercentage)}</span>
    </div>
    <div class="col stat"><span class="stat-value">{player.pointsScored}</span></div>
    <div class="col stat"><span class="stat-value">{player.assists}</span></div>
    <div class="col stat"><span class="stat-value">{player.turnovers}</span></div>
    <div class="col stat"><span class="stat-value">{player.possessions}</span></div>
  </div>
{/snippet}

<div class="clutch-page">
  <AnalyticsNav />

  <div class="container max-w-7xl">
    <!-- Header -->
    <header class="page-header">
      <div class="title-section">
        <Zap size={32} />
        <div>
          <h1>Who stood out in close games?</h1>
          <p class="subtitle">
            Rank whole-game performances from games decided by five points or fewer. This is a
            clutch proxy—not a final-two-minute split.
          </p>
        </div>
      </div>

      <DateNavigation currentDate={data.date} baseUrl="/data/nba/clutch" />
    </header>

    <!-- Data Note -->
    {#if data.dataNote}
      <div class="data-note">
        <p>{data.dataNote}</p>
      </div>
    {/if}

    <!-- Stats Summary -->
    {#if data.clutchStats.length > 0}
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-label">Close games</div>
          <div class="summary-value">{data.totalClutchSituations}</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">Players tracked</div>
          <div class="summary-value">{data.clutchStats.length}</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">Ratings of 80 or more</div>
          <div class="summary-value">
            {data.clutchStats.filter((s) => hasClutchGene(s.iceInVeinsRating)).length}
          </div>
        </div>
      </div>

      <!-- Leaderboard -->
      <div class="leaderboard">
        <div class="leaderboard-header">
          <h2>Close-game performance</h2>
          <p class="leaderboard-subtitle">Whole-game composite rating from 0 to 100</p>
        </div>

        <div class="leaderboard-table">
          <!-- Table Header -->
          <div class="table-header">
            <div class="col rank">Rank</div>
            <div class="col player">Player</div>
            <div class="col rating">Rating</div>
            <div class="col stat">FG%</div>
            <div class="col stat">PTS</div>
            <div class="col stat">AST</div>
            <div class="col stat">TOV</div>
            <div class="col stat">POSS</div>
          </div>

          <!-- Table Body -->
          <div class="table-body">
            {#each data.clutchStats.slice(0, 10) as player, index}
              {@render playerRow(player, index)}
            {/each}

            {#if data.clutchStats.length > 10}
              <details class="more-players">
                <summary>Show {data.clutchStats.length - 10} more players</summary>
                <div class="more-player-rows">
                  {#each data.clutchStats.slice(10) as player, index}
                    {@render playerRow(player, index + 10)}
                  {/each}
                </div>
              </details>
            {/if}
          </div>
        </div>
      </div>

      <aside class="methodology">
        <h2>How the close-game rating works</h2>
        <p>
          The score combines whole-game shooting, points, assists, plus-minus, and
          assist-to-turnover performance. It helps compare players from close finals; it does not
          isolate what happened in the final two minutes.
        </p>
      </aside>
    {:else}
      <div class="empty-state">
        <Zap size={48} />
        <h2>No close games on this date</h2>
        <p>This view needs a completed game decided by five points or fewer.</p>
        <div class="empty-actions">
          <span>Choose another date above</span>
          <a href="/data/nba?date={data.date}">Back to all games</a>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .clutch-page {
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
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-performance-lg);
    margin-bottom: var(--space-performance-xl);
  }

  .summary-card {
    padding: var(--space-performance-lg);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
  }

  .summary-label {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    margin-bottom: var(--space-performance-sm);
  }

  .summary-value {
    font-size: var(--text-performance-h1);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  .data-note {
    padding: var(--space-performance-lg);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    margin-bottom: var(--space-performance-xl);
  }

  .data-note p {
    margin: 0;
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
  }

  .leaderboard {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    padding: var(--space-performance-xl);
  }

  .leaderboard-header {
    margin-bottom: var(--space-performance-lg);
  }

  .leaderboard-header h2 {
    margin: 0 0 var(--space-performance-xs);
    font-size: var(--text-performance-h2);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
  }

  .leaderboard-subtitle {
    margin: 0;
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
  }

  .leaderboard-table {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-xs);
  }

  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 60px 1fr 120px repeat(5, 80px);
    gap: var(--space-performance-md);
    align-items: center;
    padding: var(--space-performance-md);
  }

  .table-header {
    font-size: var(--text-performance-caption);
    font-weight: 600;
    color: var(--color-performance-fg-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 2px solid var(--color-performance-border-default);
  }

  .table-row {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-sm);
    transition: all var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .table-row:hover {
    background: var(--color-performance-bg-surface);
    transform: translateX(4px);
  }

  .table-row.clutch-gene {
    border-left: 3px solid var(--color-performance-data-1);
  }

  .col.rank {
    text-align: center;
    font-weight: 700;
    color: var(--color-performance-fg-primary);
  }

  .col.player {
    min-width: 0;
  }

  .player-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-xs);
  }

  .player-name {
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .clutch-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-xs) var(--space-performance-sm);
    background: var(--color-performance-data-1);
    color: var(--color-performance-fg-primary);
    border-radius: var(--radius-performance-scale-full);
    font-size: var(--text-performance-caption);
    font-weight: 500;
    width: fit-content;
  }

  .rating-display {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-xs);
  }

  .rating-value {
    font-size: var(--text-performance-body-lg);
    font-weight: 700;
    color: var(--color-performance-data-1);
    font-variant-numeric: tabular-nums;
  }

  .rating-bar {
    height: 4px;
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-full);
    overflow: hidden;
  }

  .rating-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--color-performance-error) 0%,
      var(--color-performance-warning) 50%,
      var(--color-performance-success) 100%
    );
    border-radius: var(--radius-performance-scale-full);
    transition: width var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .stat-value {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--color-performance-fg-primary);
  }

  .more-players {
    margin-top: var(--space-performance-sm);
  }

  .more-players summary {
    padding: var(--space-performance-md);
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-body-sm);
    text-align: center;
    cursor: pointer;
  }

  .more-player-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-xs);
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

  .methodology {
    margin-top: var(--space-performance-lg);
    padding: var(--space-performance-lg);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
  }

  .methodology h2 {
    margin: 0 0 var(--space-performance-xs);
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-primary);
  }

  .methodology p,
  .empty-actions {
    margin: 0;
    font-size: var(--text-performance-body-sm);
    line-height: 1.6;
    color: var(--color-performance-fg-secondary);
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-performance-sm) var(--space-performance-md);
  }

  .empty-actions a {
    color: var(--color-performance-fg-primary);
  }

  /* Icon colors for podium */
  :global(.gold) {
    color: var(--color-performance-rank-gold);
  }
  :global(.silver) {
    color: var(--color-performance-fg-secondary);
  }
  :global(.bronze) {
    color: var(--color-performance-rank-bronze);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .table-row {
      grid-template-columns: 2rem repeat(5, minmax(0, 1fr));
      grid-template-areas:
        'rank player player player rating rating'
        'rank field-goal points assists turnovers possessions';
      gap: var(--space-performance-sm);
      padding: var(--space-performance-md) var(--space-performance-sm);
      font-size: var(--text-performance-body-sm);
    }

    .leaderboard {
      padding: var(--space-performance-md);
    }

    .table-header {
      display: none;
    }

    .col.rank {
      grid-area: rank;
    }

    .col.player {
      grid-area: player;
    }

    .col.rating {
      grid-area: rating;
    }

    .col.stat {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
      text-align: center;
    }

    .col.stat::before {
      color: var(--color-performance-fg-muted);
      font-size: 0.55rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .col.stat:nth-child(4) {
      grid-area: field-goal;
    }

    .col.stat:nth-child(4)::before {
      content: 'FG%';
    }

    .col.stat:nth-child(5) {
      grid-area: points;
    }

    .col.stat:nth-child(5)::before {
      content: 'PTS';
    }

    .col.stat:nth-child(6) {
      grid-area: assists;
    }

    .col.stat:nth-child(6)::before {
      content: 'AST';
    }

    .col.stat:nth-child(7) {
      grid-area: turnovers;
    }

    .col.stat:nth-child(7)::before {
      content: 'TOV';
    }

    .col.stat:nth-child(8) {
      grid-area: possessions;
    }

    .col.stat:nth-child(8)::before {
      content: 'POSS';
    }
  }
</style>
