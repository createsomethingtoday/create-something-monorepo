<!--
  Site Analytics

  Basic analytics dashboard for Pro tier.
  Heideggerian: Numbers that matter, not vanity metrics.
-->
<script lang="ts">
  import type { Tenant } from '$lib/types';

  interface AnalyticsData {
    period: string;
    totals: {
      pageViews: number;
      uniqueVisitors: number;
      avgSessionDuration: number;
      bounceRate: number;
    };
    daily: Array<{
      date: string;
      pageViews: number;
      uniqueVisitors: number;
      avgSessionDuration: number;
    }>;
    topPages: Array<{ path: string; views: number }>;
    topReferrers: Array<{ source: string; visits: number }>;
  }

  interface Props {
    data: {
      site: Tenant;
      analytics: AnalyticsData;
    };
  }

  let { data }: Props = $props();

  const siteName = (data.site.config.name as string) || data.site.subdomain;

  // Format duration as "Xm Ys"
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  // Calculate chart bar heights (normalize to 100%)
  const maxViews = Math.max(...data.analytics.daily.map(d => d.pageViews));
</script>

<svelte:head>
  <title>Analytics | {siteName}</title>
</svelte:head>

<div class="analytics-layout">
  <nav class="analytics-nav">
    <a href="/dashboard/{data.site.id}" class="back-link">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Back to Editor
    </a>
  </nav>

  <main class="analytics-main">
    <header class="analytics-header">
      <div>
        <h1>Analytics</h1>
        <p>{siteName} · Last 30 days</p>
      </div>
    </header>

    <!-- Key Metrics -->
    <section class="metrics-grid">
      <div class="metric-card">
        <span class="metric-value">{data.analytics.totals.pageViews.toLocaleString()}</span>
        <span class="metric-label">Page Views</span>
      </div>
      <div class="metric-card">
        <span class="metric-value">{data.analytics.totals.uniqueVisitors.toLocaleString()}</span>
        <span class="metric-label">Unique Visitors</span>
      </div>
      <div class="metric-card">
        <span class="metric-value">{formatDuration(data.analytics.totals.avgSessionDuration)}</span>
        <span class="metric-label">Avg. Session</span>
      </div>
      <div class="metric-card">
        <span class="metric-value">{data.analytics.totals.bounceRate}%</span>
        <span class="metric-label">Bounce Rate</span>
      </div>
    </section>

    <!-- Traffic Chart -->
    <section class="chart-section">
      <h2>Traffic</h2>
      <div class="chart-container">
        <div class="chart-bars">
          {#each data.analytics.daily as day}
            <div class="chart-bar-wrapper" title="{day.date}: {day.pageViews} views">
              <div
                class="chart-bar"
                style="height: {(day.pageViews / maxViews) * 100}%"
              ></div>
            </div>
          {/each}
        </div>
        <div class="chart-labels">
          <span>{data.analytics.daily[0].date}</span>
          <span>{data.analytics.daily[data.analytics.daily.length - 1].date}</span>
        </div>
      </div>
    </section>

    <div class="two-column">
      <!-- Top Pages -->
      <section class="list-section">
        <h2>Top Pages</h2>
        <ul class="stat-list">
          {#each data.analytics.topPages as page}
            <li class="stat-item">
              <span class="stat-name">{page.path}</span>
              <span class="stat-value">{page.views.toLocaleString()}</span>
            </li>
          {/each}
        </ul>
      </section>

      <!-- Top Referrers -->
      <section class="list-section">
        <h2>Top Referrers</h2>
        <ul class="stat-list">
          {#each data.analytics.topReferrers as referrer}
            <li class="stat-item">
              <span class="stat-name">{referrer.source}</span>
              <span class="stat-value">{referrer.visits.toLocaleString()}</span>
            </li>
          {/each}
        </ul>
      </section>
    </div>
  </main>
</div>

<style>
  .analytics-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .analytics-nav {
    padding: var(--space-sm) var(--gutter);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border-default);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .back-link:hover {
    color: var(--color-fg-primary);
  }

  .analytics-main {
    max-width: var(--content-width);
    margin: 0 auto;
    padding: var(--space-lg) var(--gutter);
    width: 100%;
  }

  .analytics-header {
    margin-bottom: var(--space-xl);
  }

  .analytics-header h1 {
    font-size: var(--text-h1);
    margin: 0 0 var(--space-xs);
  }

  .analytics-header p {
    color: var(--color-fg-muted);
    margin: 0;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .metric-card {
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .metric-value {
    display: block;
    font-size: var(--text-h1);
    font-weight: 600;
    margin-bottom: var(--space-xs);
  }

  .metric-label {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .chart-section {
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-xl);
  }

  .chart-section h2 {
    font-size: var(--text-h3);
    margin: 0 0 var(--space-md);
  }

  .chart-container {
    height: 200px;
    display: flex;
    flex-direction: column;
  }

  .chart-bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 2px;
  }

  .chart-bar-wrapper {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }

  .chart-bar {
    width: 100%;
    background: var(--color-accent);
    border-radius: 2px 2px 0 0;
    min-height: 4px;
    transition: background var(--duration-micro) var(--ease-standard);
  }

  .chart-bar-wrapper:hover .chart-bar {
    background: var(--color-accent-hover);
  }

  .chart-labels {
    display: flex;
    justify-content: space-between;
    padding-top: var(--space-xs);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .two-column {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-lg);
  }

  .list-section {
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .list-section h2 {
    font-size: var(--text-h3);
    margin: 0 0 var(--space-md);
  }

  .stat-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border-default);
  }

  .stat-item:last-child {
    border-bottom: none;
  }

  .stat-name {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .stat-value {
    font-size: var(--text-body-sm);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
</style>
