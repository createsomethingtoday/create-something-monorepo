<script lang="ts">
  /**
   * Defensive Impact Page
   *
   * How well is each team's defense limiting opponents?
   * Compares actual shooting to expected based on shot zones.
   */

  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';
  import { DefensiveHeatmap } from '$lib/experiments/nba-live';
  import { ArrowLeft, Clock, Radio, AlertCircle } from 'lucide-svelte';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  const homeTeamAbbr = $derived(data.players.home[0]?.teamAbbr || 'HOME');
  const awayTeamAbbr = $derived(data.players.away[0]?.teamAbbr || 'AWAY');
</script>

<SEO
  title="Defensive Impact | NBA Live Analytics"
  description="Compare team points allowed with a shot-zone estimate of expected points."
  keywords="NBA defensive impact, defensive rating, expected shooting, shot zone analysis, basketball defense"
  propertyName="space"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.space' },
    { name: 'Data Studio', url: 'https://createsomething.space/data' },
    { name: 'NBA Live Analytics', url: 'https://createsomething.space/data/nba' },
    { name: 'Defensive Impact', url: 'https://createsomething.space/data/nba/defensive-impact' }
  ]}
/>

<!-- Header -->
<section class="nba-header">
  <div class="nba-container">
    <nav class="nba-breadcrumb">
      <a href="/data/nba" class="nba-breadcrumb-link">
        <ArrowLeft size={14} />
        NBA Live
      </a>
      <span class="nba-breadcrumb-sep">/</span>
      <span class="nba-breadcrumb-current">Defensive Impact</span>
    </nav>

    <h1 class="nba-title">Which defense changed shot outcomes?</h1>
    <p class="nba-subtitle">
      Compare actual points allowed with an estimate based on shot location and each shooter's
      season average. This is a team-level proxy, not player-tracking proof.
    </p>
  </div>
</section>

<!-- Status -->
<section class="nba-section">
  <div class="nba-container">
    {#if data.scheduled && data.game}
      <div class="nba-scheduled-state">
        <Clock size={32} class="nba-scheduled-icon" />
        <h2 class="nba-scheduled-title">
          {data.game.awayTeam.abbreviation} @ {data.game.homeTeam.abbreviation}
        </h2>
        <p class="nba-scheduled-message">
          This game hasn't started yet. Check back at{' '}
          <strong>
            {new Date(data.game.startTime).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </strong>
          {' '}to see defensive impact analysis.
        </p>
        <p class="nba-scheduled-hint">
          The page will automatically refresh every 30 seconds and show live data once the game
          starts.
        </p>
        <a href="/data/nba" class="nba-back-link">
          <ArrowLeft size={14} />
          Back to all games
        </a>
      </div>
    {:else if data.error}
      <div class="nba-error-state">
        <AlertCircle size={24} />
        {#if !data.gameId}
          <p class="nba-error-message">Choose a game before opening this analysis.</p>
          <a href="/data/nba?date={data.date}" class="nba-back-link">
            <ArrowLeft size={14} />
            Choose a game
          </a>
        {:else}
          <p class="nba-error-message">We couldn't load defensive analysis for this game.</p>
          <p class="nba-error-hint">The detailed feed returned: {data.error}</p>
          <div class="nba-recovery-actions">
            <button class="nba-retry-button" onclick={() => invalidateAll()}>Try again</button>
            <a class="nba-handoff" href="/data/nba?date={data.date}">Choose another game</a>
          </div>
        {/if}
      </div>
    {:else}
      <div class="nba-status-bar">
        <div class="nba-status-indicator">
          {#if data.cached}
            <Clock size={14} class="nba-status-icon" />
            <span class="nba-status-label">Cached</span>
          {:else}
            <Radio size={14} class="nba-status-icon nba-status-icon--live" />
            <span class="nba-status-label nba-status-label--live">Live</span>
          {/if}
        </div>
        <span class="nba-timestamp">
          {new Date(data.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
    {/if}
  </div>
</section>

<!-- Heatmaps -->
{#if !data.error && !data.scheduled && data.gameId}
  <section class="nba-section">
    <div class="nba-container">
      <div class="nba-grid-2">
        {#if data.defensive.home}
          <DefensiveHeatmap
            shotsByZone={data.defensive.home.shotsByZone}
            title="{homeTeamAbbr} Defense vs {awayTeamAbbr}"
            teamAbbr={homeTeamAbbr}
          />
        {/if}
        {#if data.defensive.away}
          <DefensiveHeatmap
            shotsByZone={data.defensive.away.shotsByZone}
            title="{awayTeamAbbr} Defense vs {homeTeamAbbr}"
            teamAbbr={awayTeamAbbr}
          />
        {/if}
      </div>
    </div>
  </section>

  <!-- Summary Stats -->
  <section class="nba-section">
    <div class="nba-container">
      <h2 class="nba-section-label">Expected vs Actual</h2>

      <div class="nba-grid-2">
        {#each ['home', 'away'] as team}
          {@const defensive = team === 'home' ? data.defensive.home : data.defensive.away}
          {@const abbr = team === 'home' ? homeTeamAbbr : awayTeamAbbr}
          {@const opponent = team === 'home' ? awayTeamAbbr : homeTeamAbbr}

          {#if defensive}
            <div class="nba-card">
              <h3 class="nba-card-header">{abbr} Defense</h3>
              <table class="nba-stats-table">
                <tbody>
                  <tr>
                    <td>Opponent</td>
                    <td>{opponent}</td>
                  </tr>
                  <tr>
                    <td>Shots allowed</td>
                    <td>{defensive.shotsAllowed}</td>
                  </tr>
                  <tr>
                    <td>Points allowed</td>
                    <td>{defensive.pointsAllowed.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>Expected points</td>
                    <td>{defensive.expectedPointsAllowed.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td><strong>Delta</strong></td>
                    <td
                      class={defensive.deltaVsExpected < 0
                        ? 'nba-stat-positive'
                        : 'nba-stat-negative'}
                    >
                      <strong>
                        {defensive.deltaVsExpected >= 0
                          ? '+'
                          : ''}{defensive.deltaVsExpected.toFixed(1)}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </section>

  <!-- Methodology -->
  <section class="nba-section">
    <div class="nba-container">
      <div class="nba-methodology">
        <h3 class="nba-methodology-title">How we calculate this</h3>
        <p class="nba-methodology-text">
          We estimate "expected points" based on each shot's location and the shooter's season
          averages. A negative delta means the defense held opponents below expectations.
        </p>
        <ul class="nba-methodology-list">
          <li><strong>Zone FG%</strong> = Made shots ÷ Attempted shots per zone</li>
          <li><strong>Expected</strong> = Shot value × Player's baseline FG% for that zone</li>
          <li><strong>Delta</strong> = Actual − Expected (negative = good defense)</li>
        </ul>
        <p
          class="nba-methodology-text"
          style="margin-top: var(--space-performance-sm); color: var(--color-performance-fg-muted);"
        >
          <em
            >Note: True defensive impact requires tracking data (Second Spectrum) for matchup-level
            analysis. This uses shot zones as a proxy.</em
          >
        </p>
      </div>
      <div class="nba-handoff-row">
        <a class="nba-handoff" href="/data/nba?date={data.date}">Choose another analysis</a>
      </div>
    </div>
  </section>
{/if}
