<script lang="ts">
  /**
   * NBA Live Analytics Experiment
   *
   * Real-time basketball analysis through three lenses.
   * A spec-driven development meta-experiment.
   */

  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';
  import type { Game } from '$lib/nba/types';
  import { GameSelector } from '$lib/experiments/nba-live';
  import { GameHighlightCard } from '$lib/experiments/nba-live';
  import { DateNavigation } from '$lib/experiments/nba-live';
  import { RecentHistory } from '$lib/experiments/nba-live';
  import { selectGameOfTheNight } from '$lib/nba/calculations';
  import {
    Zap,
    Shield,
    GitBranch,
    ArrowRight,
    Clock,
    Radio,
    AlertCircle,
    TrendingUp
  } from 'lucide-svelte';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  let selectedGame = $state<Game | null>(null);

  const analysisOptions = [
    {
      slug: 'duo-synergy',
      title: 'Duo Synergy',
      description:
        'Which two-player combinations are most effective? Compare their points per possession against the league average.',
      icon: Zap
    },
    {
      slug: 'defensive-impact',
      title: 'Defensive Impact',
      description:
        'Did either team hold opponents below expected points? Compare outcomes with a shot-zone estimate.',
      icon: Shield
    },
    {
      slug: 'shot-network',
      title: 'Shot Network',
      description:
        'Who creates shots for whom? Trace the passing connections that lead to scoring opportunities.',
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
  const liveCount = $derived(data.games.filter((g) => g.status === 'live').length);
  const scheduledCount = $derived(data.games.filter((g) => g.status === 'scheduled').length);
  const finalCount = $derived(data.games.filter((g) => g.status === 'final').length);
  const nextScheduledGame = $derived(
    [...data.games]
      .filter((game) => game.status === 'scheduled')
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0] ?? null
  );

  // Select game of the night from completed games
  const gameOfTheNight = $derived(selectGameOfTheNight(data.games));

  // Check if we're viewing today's games (used in labels and messaging)
  const isToday = $derived(data.currentDate === data.nbaToday);

  // Format date display for section headers
  const dateLabel = $derived.by(() => {
    if (isToday) return "Today's Games";

    const date = new Date(data.currentDate + 'T12:00:00Z');
    if (data.dateRelation === 'past' && data.currentDate < data.nbaToday) {
      const yesterday = new Date(data.nbaToday + 'T12:00:00Z');
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      if (data.currentDate === yesterday.toISOString().slice(0, 10)) return "Yesterday's Games";
    }
    return `Games - ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
  });

  const pollIntervalMs = $derived.by(() => {
    if (!isToday) return null;
    if (data.scoreboardState === 'live') return 30_000;
    if (data.scoreboardState === 'unavailable' || data.scoreboardState === 'stale') return 60_000;
    if (data.scoreboardState === 'pregame') return 5 * 60_000;
    return 15 * 60_000;
  });

  // Poll every current-day state so an empty or unavailable page can recover.
  $effect(() => {
    const intervalMs = pollIntervalMs;
    if (intervalMs) {
      const interval = setInterval(() => {
        invalidateAll();
      }, intervalMs);

      return () => {
        clearInterval(interval);
      };
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
    { name: 'Data Studio', url: 'https://createsomething.space/data' },
    { name: 'NBA Live Analytics', url: 'https://createsomething.space/data/nba' }
  ]}
/>

<!-- Header -->
<section class="page-header">
  <div class="container">
    <p class="category">NBA analysis</p>
    <h1 class="title">Choose a game. See what the numbers support.</h1>
    <p class="subtitle">
      Pick a date, choose a game, then open an analysis. Detailed views appear only when the
      available play data can support them.
    </p>
  </div>
</section>

<!-- Data Status -->
<section class="status-section">
  <div class="container">
    <div class="status-bar" role="status" aria-live="polite">
      <div class="status-indicator">
        {#if data.scoreboardState === 'unavailable'}
          <AlertCircle size={16} class="status-icon status-icon--error" />
          <span class="status-label status-label--error">Feed unavailable</span>
        {:else if data.scoreboardState === 'stale'}
          <Clock size={16} class="status-icon status-icon--cached" />
          <span class="status-label status-label--cached">Last known data</span>
        {:else if data.scoreboardState === 'live'}
          <Radio size={16} class="status-icon status-icon--live" />
          <span class="status-label status-label--live">{liveCount} live</span>
        {:else if data.scoreboardState === 'pregame'}
          <Clock size={16} class="status-icon" />
          <span class="status-label">No games live</span>
        {:else if data.scoreboardState === 'complete'}
          <Clock size={16} class="status-icon" />
          <span class="status-label">Slate complete</span>
        {:else if data.scoreboardState === 'off_day'}
          <Clock size={16} class="status-icon" />
          <span class="status-label">No games scheduled</span>
        {:else if data.cached}
          <Clock size={16} class="status-icon status-icon--cached" />
          <span class="status-label status-label--cached">Cached</span>
        {:else}
          <Clock size={16} class="status-icon" />
          <span class="status-label">Updated</span>
        {/if}
      </div>
      <span class="timestamp">
        {#if data.timestamp}
          Data from {new Date(data.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })}
        {:else}
          Retrying automatically
        {/if}
      </span>
      {#if data.provider === 'espn'}
        <span class="source-label">Scoreboard fallback</span>
      {/if}
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
          <span class="summary-stat summary-stat--muted">
            {finalCount} completed {finalCount === 1 ? 'game' : 'games'}
          </span>
        {/if}
      </div>
    </div>
  </section>
{/if}

<!-- Date Navigation -->
<section class="date-section">
  <div class="container">
    <DateNavigation currentDate={data.currentDate} todayDate={data.nbaToday} />
  </div>
</section>

<!-- Game Selector -->
<section class="games-section">
  <div class="container">
    <h2 class="section-label">{dateLabel}</h2>

    {#if data.scoreboardState === 'unavailable'}
      <div class="error-state">
        <AlertCircle size={24} />
        <p class="error-message">We couldn't load {isToday ? "today's" : 'these'} games.</p>
        <p class="error-hint">
          {#if isToday}
            The primary and fallback scoreboards are unavailable. This page will retry
            automatically.
          {:else}
            The primary and fallback scoreboards are unavailable for this date. Reload or try
            another date.
          {/if}
        </p>
        {#if data.correlationId}
          <p class="diagnostic-id">Reference: {data.correlationId}</p>
        {/if}
      </div>
    {:else if data.scoreboardState === 'off_day' || (data.scoreboardState === 'stale' && data.games.length === 0)}
      <div class="empty-state">
        <Clock size={24} />
        <p class="empty-message">
          {#if data.scoreboardState === 'stale'}
            Last known scoreboard has no games
          {:else}
            {data.dateRelation === 'today' ? 'No NBA games today' : 'No games listed for this date'}
          {/if}
        </p>
        <p class="empty-hint">
          {#if data.scoreboardState === 'stale'}
            Live sources are unavailable. Showing the last successful result while this page
            retries.
          {:else if data.dateRelation === 'today'}
            There are no games live or scheduled for the current slate.
          {:else if data.dateRelation === 'future'}
            The published schedule does not currently include a game on this date.
          {:else}
            The scoreboard has no games recorded for this date.
          {/if}
        </p>
      </div>
    {:else}
      {#if data.scoreboardState === 'pregame'}
        <div class="slate-note">
          <p>No games are live right now.</p>
          {#if nextScheduledGame}
            <p>
              Next tip-off:
              {new Date(nextScheduledGame.startTime).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          {/if}
        </div>
      {:else if data.scoreboardState === 'complete'}
        <div class="slate-note"><p>All games on this slate are final.</p></div>
      {:else if data.scoreboardState === 'stale'}
        <div class="slate-note">
          <p>Showing the last known scoreboard while live sources recover.</p>
        </div>
      {/if}
      <GameSelector
        games={data.games}
        selectedGameId={selectedGame?.id}
        onselect={handleGameSelect}
      />
    {/if}
  </div>
</section>

{#if data.games.length === 0 && data.recentHistory?.slates.length}
  <RecentHistory history={data.recentHistory} />
{/if}

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
{#if selectedGame && selectedGame.analyticsAvailable !== false}
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
            href="/data/nba/{option.slug}?gameId={selectedGame.id}&date={data.currentDate}"
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
{#if finalCount > 0 && data.games.some((game) => game.analyticsAvailable !== false)}
  <section class="insights-link-section">
    <div class="container">
      <a href="/data/nba/league-insights?date={data.currentDate}" class="insights-link-card">
        <div class="insights-link-header">
          <TrendingUp size={20} class="insights-link-icon" />
          <h3 class="insights-link-title">League Insights</h3>
        </div>
        <p class="insights-link-description">
          See league-wide trends from {isToday ? "today's" : "this date's"}
          {finalCount} completed {finalCount === 1 ? 'game' : 'games'}. Ball movement correlation,
          competitive balance, and more.
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
      <h3 class="about-title">Start here</h3>
      <ol class="about-steps">
        <li>Choose the date you want to inspect.</li>
        <li>Select a game from the scoreboard.</li>
        <li>Open the question that matches your decision.</li>
      </ol>
      <p class="about-text">
        Scoreboard data can confirm the score and game state. Advanced views need detailed play
        data, so some games remain scoreboard-only.
      </p>
      <a href="https://createsomething.io/papers/spec-driven-development" class="about-link">
        How this experiment was built <ArrowRight size={14} />
      </a>
    </div>
  </div>
</section>

<style>
  /* Layout */
  .container {
    max-width: 56rem;
    margin: 0 auto;
    padding: 0 var(--space-performance-md);
  }

  /* Header */
  .page-header {
    padding: var(--space-performance-xl) 0 var(--space-performance-lg);
  }

  .category {
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-performance-fg-muted);
    margin-bottom: var(--space-performance-xs);
  }

  .title {
    font-size: var(--text-performance-h1);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
    margin: 0 0 var(--space-performance-sm);
  }

  .subtitle {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
    max-width: 40rem;
  }

  /* Date Navigation (Tufte: prominent but minimal) */
  .date-section {
    padding-bottom: var(--space-performance-md);
  }

  /* Status Bar */
  .status-section {
    padding-bottom: var(--space-performance-md);
  }

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-performance-xs) var(--space-performance-sm);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-sm);
    font-size: var(--text-performance-body-sm);
    flex-wrap: wrap;
    gap: var(--space-performance-xs) var(--space-performance-sm);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
  }

  .status-indicator :global(.status-icon) {
    color: var(--color-performance-fg-muted);
  }

  .status-indicator :global(.status-icon--live) {
    color: var(--color-performance-success);
  }

  .status-indicator :global(.status-icon--error) {
    color: var(--color-performance-error);
  }

  .status-indicator :global(.status-icon--cached) {
    color: var(--color-performance-warning);
  }

  .status-label {
    color: var(--color-performance-fg-tertiary);
  }

  .status-label--live {
    color: var(--color-performance-success);
  }

  .status-label--error {
    color: var(--color-performance-error);
  }

  .status-label--cached {
    color: var(--color-performance-warning);
  }

  .timestamp {
    color: var(--color-performance-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .source-label {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-caption);
  }

  /* Summary */
  .summary-section {
    padding-bottom: var(--space-performance-md);
  }

  .summary-row {
    display: flex;
    gap: var(--space-performance-md);
  }

  .summary-stat {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
  }

  .summary-stat--live {
    color: var(--color-performance-success);
    font-weight: 500;
  }

  .summary-stat--muted {
    color: var(--color-performance-fg-muted);
  }

  /* Section Labels */
  .section-label {
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-performance-fg-muted);
    margin-bottom: var(--space-performance-sm);
  }

  /* Games Section */
  .games-section {
    padding-bottom: var(--space-performance-md);
  }

  /* Highlight Section */
  .highlight-section {
    padding-bottom: var(--space-performance-xl);
  }

  /* Error State */
  .error-state {
    text-align: center;
    padding: var(--space-performance-xl);
    color: var(--color-performance-fg-muted);
  }

  .error-state :global(svg) {
    color: var(--color-performance-error);
    margin-bottom: var(--space-performance-sm);
  }

  .error-message {
    color: var(--color-performance-fg-secondary);
    margin-bottom: var(--space-performance-xs);
  }

  .error-hint {
    font-size: var(--text-performance-body-sm);
  }

  .diagnostic-id {
    margin-top: var(--space-performance-sm);
    color: var(--color-performance-fg-muted);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
  }

  /* Empty State (No Games Scheduled) */
  .empty-state {
    text-align: center;
    padding: var(--space-performance-xl);
    color: var(--color-performance-fg-muted);
  }

  .empty-state :global(svg) {
    display: block;
    margin-inline: auto;
    margin-bottom: var(--space-performance-sm);
    color: var(--color-performance-fg-muted);
  }

  .empty-message {
    color: var(--color-performance-fg-secondary);
    margin-bottom: var(--space-performance-xs);
  }

  .empty-hint {
    font-size: var(--text-performance-body-sm);
  }

  .slate-note {
    display: flex;
    justify-content: space-between;
    gap: var(--space-performance-sm);
    margin-bottom: var(--space-performance-sm);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
  }

  /* Analysis Section */
  .analysis-section {
    padding-bottom: var(--space-performance-xl);
    padding-top: var(--space-performance-lg);
    scroll-margin-top: var(--space-performance-lg);
  }

  .selected-game {
    text-align: center;
    margin-bottom: var(--space-performance-lg);
  }

  .matchup {
    font-size: var(--text-performance-h2);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: var(--space-performance-sm);
  }

  .score {
    font-variant-numeric: tabular-nums;
    color: var(--color-performance-fg-secondary);
  }

  .at {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    font-weight: 400;
  }

  .game-status {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-success);
    margin-top: var(--space-performance-xs);
  }

  .game-status--final {
    color: var(--color-performance-fg-muted);
  }

  /* Analysis Grid */
  .analysis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-performance-md);
  }

  .analysis-card {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    padding: var(--space-performance-md);
    text-decoration: none;
    transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
    display: flex;
    flex-direction: column;
  }

  .analysis-card:hover {
    border-color: var(--color-performance-border-emphasis);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    margin-bottom: var(--space-performance-sm);
  }

  .analysis-card :global(.card-icon) {
    color: var(--color-performance-fg-tertiary);
  }

  .card-title {
    font-size: var(--text-performance-body);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
  }

  .card-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: 1.5;
    flex: 1;
  }

  .card-action {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    margin-top: var(--space-performance-sm);
    padding-top: var(--space-performance-sm);
  }

  .analysis-card:hover .card-action {
    color: var(--color-performance-fg-secondary);
  }

  /* Insights Link Section */
  .insights-link-section {
    padding-bottom: var(--space-performance-lg);
  }

  .insights-link-card {
    background: var(--color-performance-bg-surface);
    border: 2px solid var(--color-performance-data-1);
    border-radius: var(--radius-performance-scale-lg);
    padding: var(--space-performance-md);
    text-decoration: none;
    display: block;
    transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .insights-link-card:hover {
    border-color: var(--color-performance-fg-primary);
  }

  .insights-link-header {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    margin-bottom: var(--space-performance-sm);
  }

  .insights-link-card :global(.insights-link-icon) {
    color: var(--color-performance-data-1);
  }

  .insights-link-title {
    font-size: var(--text-performance-body-lg);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
  }

  .insights-link-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: 1.5;
    margin-bottom: var(--space-performance-sm);
  }

  .insights-link-action {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    padding-top: var(--space-performance-sm);
  }

  .insights-link-card:hover .insights-link-action {
    color: var(--color-performance-fg-primary);
  }

  /* About Section */
  .about-section {
    padding-bottom: var(--space-performance-xl);
  }

  .about-card {
    padding: var(--space-performance-md);
    border-left: 2px solid var(--color-performance-border-default);
  }

  .about-title {
    font-size: var(--text-performance-body);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    margin-bottom: var(--space-performance-xs);
  }

  .about-text {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
    margin-bottom: var(--space-performance-sm);
  }

  .about-steps {
    margin: 0 0 var(--space-performance-sm);
    padding-left: var(--space-performance-md);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    line-height: 1.7;
  }

  .about-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs);
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    text-decoration: none;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .about-link:hover {
    color: var(--color-performance-fg-primary);
  }
</style>
