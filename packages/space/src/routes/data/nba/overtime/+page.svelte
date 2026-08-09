<script lang="ts">
  /**
   * Overtime Performance Tracker
   *
   * Whole-game proxy for possible fatigue signals in overtime games.
   */

  import { SEO } from '@create-something/canon';
  import { Clock, TrendingDown, AlertTriangle } from 'lucide-svelte';
  import { AnalyticsNav } from '$lib/experiments/nba-live';
  import { OvertimeInsights } from '$lib/experiments/nba-live';
  import { DateNavigation } from '$lib/experiments/nba-live';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Derived state
  const totalOvertimeGames = $derived(data.overtimeGames.length);
  const avgFatigueIndex = $derived(
    totalOvertimeGames > 0
      ? data.overtimeGames.reduce((sum, g) => sum + g.fatigueIndex, 0) / totalOvertimeGames
      : 0
  );
  const severeFatigueCount = $derived(
    data.overtimeGames.filter((g) => g.fatigueIndex >= 70).length
  );
</script>

<SEO
  title="Overtime Performance | NBA Live Analytics"
  description="Review whole-game shooting and turnover signals from NBA games that reached overtime."
  keywords="NBA overtime, fatigue index, OT performance, basketball analytics, extended play analysis"
  propertyName="space"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.space' },
    { name: 'Data Studio', url: 'https://createsomething.space/data' },
    { name: 'NBA Live Analytics', url: 'https://createsomething.space/data/nba' },
    { name: 'Overtime Performance', url: 'https://createsomething.space/data/nba/overtime' }
  ]}
/>

<div class="overtime-page">
  <AnalyticsNav />

  <div class="container max-w-7xl">
    <header class="page-header">
      <div class="title-section">
        <Clock size={32} />
        <div>
          <h1>Which overtime games show fatigue signals?</h1>
          <p class="subtitle">
            Review whole-game shooting and turnovers as a rough proxy—not a period-by-period
            comparison.
          </p>
        </div>
      </div>
      <DateNavigation currentDate={data.date} baseUrl="/data/nba/overtime" />
    </header>

    <!-- Data Note -->
    {#if data.dataNote}
      <div class="data-note">
        <p>{data.dataNote}</p>
      </div>
    {/if}

    {#if totalOvertimeGames > 0}
      <!-- Summary Stats -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Overtime Games</div>
          <div class="summary-value">{totalOvertimeGames}</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">Average proxy score</div>
          <div
            class="summary-value"
            class:warning={avgFatigueIndex >= 40}
            class:error={avgFatigueIndex >= 70}
          >
            {avgFatigueIndex.toFixed(1)}/100
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-label">High proxy scores</div>
          <div class="summary-value" class:error={severeFatigueCount > 0}>
            {severeFatigueCount}
          </div>
        </div>
      </div>

      <!-- Overtime Games -->
      <section class="overtime-section">
        <h2 class="section-title">Games That Went to Overtime</h2>

        <div class="overtime-grid">
          {#each data.overtimeGames as differential (differential.gameId)}
            <OvertimeInsights {differential} />
          {/each}
        </div>
      </section>

      <!-- Methodology -->
      <aside class="methodology">
        <h3>What this proxy can—and cannot—show</h3>
        <p>
          The score combines whole-game field-goal percentage and turnovers from games that reached
          overtime. A higher number flags a game for closer review; it does not prove fatigue or
          compare regulation with overtime.
        </p>
        <ul>
          <li><strong>0-39:</strong> lower whole-game proxy score</li>
          <li><strong>40-69:</strong> middle whole-game proxy score</li>
          <li><strong>70-100:</strong> higher whole-game proxy score</li>
        </ul>
        <p>
          Period-level play data is required before this view can attribute a change to overtime.
        </p>
      </aside>
    {:else}
      <!-- Empty State -->
      <div class="empty-state">
        <Clock size={48} />
        <h2>No overtime games on this date</h2>
        <p>This view needs a completed game that continued beyond regulation.</p>
        <div class="empty-actions">
          <span>Choose another date above</span>
          <a href="/data/nba?date={data.date}">Back to all games</a>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .overtime-page {
    min-height: 100vh;
    background: var(--color-performance-bg-pure);
  }

  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-performance-xl);
  }

  /* Page Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 3rem;
    padding-bottom: var(--space-performance-xl);
  }

  .title-section {
    display: flex;
    gap: var(--space-performance-lg);
    align-items: flex-start;
  }

  .title-section h1 {
    font-size: var(--text-performance-h1);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
    margin: 0 0 var(--space-performance-sm);
    line-height: 1.2;
  }

  .subtitle {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    margin: 0;
    max-width: 600px;
  }

  /* Summary Grid */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-performance-lg);
    margin-bottom: 3rem;
  }

  .summary-card {
    padding: var(--space-performance-lg);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-lg);
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

  .summary-value.warning {
    color: var(--color-performance-warning);
  }

  .summary-value.error {
    color: var(--color-performance-error);
  }

  /* Overtime Section */
  .overtime-section {
    margin-bottom: 3rem;
  }

  .section-title {
    font-size: var(--text-performance-h2);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    margin: 0 0 var(--space-performance-xl);
  }

  .overtime-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: var(--space-performance-lg);
  }

  /* Methodology */
  .methodology {
    padding: var(--space-performance-xl);
    background: var(--color-performance-bg-surface);
    border-left: 3px solid var(--color-performance-border-strong);
    border-radius: var(--radius-performance-scale-sm);
    margin-top: 3rem;
  }

  .methodology h3 {
    font-size: var(--text-performance-body-lg);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    margin: 0 0 var(--space-performance-md);
  }

  .methodology p {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
    margin: 0 0 var(--space-performance-md);
  }

  .methodology ul {
    margin: var(--space-performance-md) 0;
    padding-left: var(--space-performance-xl);
    color: var(--color-performance-fg-secondary);
  }

  .methodology li {
    margin-bottom: var(--space-performance-sm);
    line-height: 1.6;
  }

  .methodology strong {
    color: var(--color-performance-fg-primary);
    font-weight: 600;
  }

  .data-note {
    padding: var(--space-performance-lg);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-lg);
    margin-bottom: var(--space-performance-xl);
  }

  .data-note p {
    margin: 0;
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6rem var(--space-performance-xl);
    text-align: center;
    color: var(--color-performance-fg-tertiary);
  }

  .empty-state h2 {
    font-size: var(--text-performance-h2);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    margin: var(--space-performance-lg) 0 var(--space-performance-md);
  }

  .empty-state p {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    max-width: 500px;
    line-height: 1.6;
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-performance-sm) var(--space-performance-md);
    font-size: var(--text-performance-body-sm);
  }

  .empty-actions a {
    color: var(--color-performance-fg-primary);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .container {
      padding: var(--space-performance-lg);
    }

    .page-header {
      flex-direction: column;
      gap: var(--space-performance-lg);
    }

    .title-section h1 {
      font-size: var(--text-performance-h2);
    }

    .overtime-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
