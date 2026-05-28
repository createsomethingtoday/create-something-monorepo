<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type {
    ValidationResult,
    PageResult,
    Recommendation,
    TabOption,
    SortOption
  } from '$lib/types/validation';
  import {
    Header,
    BackNavigation,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
  } from '$lib/components';
  import { trackEvent } from '$lib/utils/analytics';

  let { data }: { data: PageData } = $props();

  // Form state
  let url = $state('');
  let isValidating = $state(false);
  let error = $state<string | null>(null);

  // Results state
  let result = $state<ValidationResult | null>(null);

  // UI state
  let activeTab = $state<TabOption>('overview');
  let sortOption = $state<SortOption>('issues-high');
  let expandedPages = $state<Set<string>>(new Set());

  // Sorted page results
  const sortedPages = $derived(() => {
    if (!result?.pageResults) return [];

    const pages = [...result.pageResults];

    switch (sortOption) {
      case 'issues-high':
        return pages.sort((a, b) => b.flaggedCodeCount - a.flaggedCodeCount);
      case 'issues-low':
        return pages.sort((a, b) => a.flaggedCodeCount - b.flaggedCodeCount);
      case 'name':
        return pages.sort((a, b) => a.url.localeCompare(b.url));
      case 'health':
        return pages.sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? -1 : 1));
      default:
        return pages;
    }
  });

  async function handleValidate() {
    if (!url.trim()) {
      error = 'Please enter a URL';
      return;
    }

    error = null;
    isValidating = true;
    result = null;
    const startedAt = Date.now();

    trackEvent('validation_run_started', {
      validator: 'gsap',
      target_host: (() => {
        try {
          return new URL(url.trim()).hostname;
        } catch {
          return null;
        }
      })()
    });

    try {
      const response = await fetch('/api/validation/gsap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || 'Validation failed');
      }

      const validationResult = (await response.json()) as ValidationResult;
      result = validationResult;

      trackEvent('validation_run_completed', {
        validator: 'gsap',
        duration_ms: Date.now() - startedAt,
        passed: validationResult.passed,
        total_pages: validationResult.summary.totalPages,
        flagged_code_count: validationResult.issues.totalFlaggedCode
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';

      trackEvent('validation_run_failed', {
        validator: 'gsap',
        duration_ms: Date.now() - startedAt,
        error_message: error
      });
    } finally {
      isValidating = false;
    }
  }

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      window.location.href = '/login';
    });
  }

  function togglePageExpand(pageUrl: string) {
    const newSet = new Set(expandedPages);
    if (newSet.has(pageUrl)) {
      newSet.delete(pageUrl);
    } else {
      newSet.add(pageUrl);
    }
    expandedPages = newSet;
  }

  function getRecommendationIcon(type: Recommendation['type']) {
    switch (type) {
      case 'critical':
        return '!';
      case 'warning':
        return '!';
      case 'success':
        return '✓';
    }
  }

  onMount(() => {
    trackEvent('validation_playground_opened');
  });
</script>

<svelte:head>
  <title>GSAP Check Playground | Webflow Asset Dashboard</title>
</svelte:head>

<div class="playground">
  <Header onLogout={handleLogout} showMarketplace={data.hasTemplateAsset} />

  <main class="main-content">
    <div class="content-wrapper">
      <!-- Header Section -->
      <section class="header-section">
        <BackNavigation href="/validation" label="Back to Validation Tools" />
        <h1 class="page-title">GSAP Check Playground</h1>
        <p class="page-subtitle">
          Crawl a published Webflow site for GSAP, legacy interaction, and custom-code compliance.
          This is a fast technical check, not the full Webflow Way Validator app pass.
        </p>
        <div class="scope-note" role="note">
          <strong>Submission requirement:</strong>
          A clean GSAP check is useful, but creators still need the Webflow Way Validator app to add
          the bridge script and confirm a 100% Validator pass before submission.
        </div>
      </section>

      <!-- URL Input Section -->
      <section class="input-section">
        <div class="input-card">
          <form
            onsubmit={(e) => {
              e.preventDefault();
              handleValidate();
            }}
          >
            <div class="input-group">
              <label for="url" class="input-label">Webflow Site URL</label>
              <div class="input-row">
                <input
                  type="url"
                  id="url"
                  bind:value={url}
                  placeholder="https://your-site.webflow.io"
                  class="url-input"
                  disabled={isValidating}
                />
                <button type="submit" class="validate-btn" disabled={isValidating}>
                  {#if isValidating}
                    <span class="spinner"></span>
                    Checking...
                  {:else}
                    Run GSAP Check
                  {/if}
                </button>
              </div>
              {#if error}
                <p class="error-message">{error}</p>
              {/if}
            </div>
          </form>
        </div>
      </section>

      <!-- Results Section -->
      {#if result}
        <section class="results-section">
          <!-- Status Header -->
          <div class="status-header" class:passed={result.passed} class:failed={!result.passed}>
            <div class="status-badge">
              <span class="status-icon">{result.passed ? '✓' : '✗'}</span>
              <span class="status-text">
                {result.passed ? 'GSAP Check Passed' : 'GSAP Check Failed'}
              </span>
            </div>
            <div class="status-meta">
              <span class="validated-url">{result.url}</span>
              <span class="validated-time"
                >Validated {new Date(result.timestamp).toLocaleString()}</span
              >
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{result.summary.passRate}%</div>
              <div class="stat-label">GSAP Pass Rate</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{result.summary.totalPages}</div>
              <div class="stat-label">Total Pages</div>
            </div>
            <div class="stat-card passed">
              <div class="stat-value">{result.summary.passedPages}</div>
              <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
              <div class="stat-value">{result.summary.failedPages}</div>
              <div class="stat-label">Failed</div>
            </div>
          </div>

          <!-- Tabs -->
          <Tabs value={activeTab} class="tabs-shell">
            <TabsList class="tabs">
              <TabsTrigger
                value="overview"
                active={activeTab === 'overview'}
                onclick={() => (activeTab = 'overview')}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="pages"
                active={activeTab === 'pages'}
                onclick={() => (activeTab = 'pages')}
              >
                Pages ({result.pageResults.length})
              </TabsTrigger>
              <TabsTrigger
                value="issues"
                active={activeTab === 'issues'}
                onclick={() => (activeTab = 'issues')}
              >
                Issues ({result.issues.totalFlaggedCode})
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                active={activeTab === 'recommendations'}
                onclick={() => (activeTab = 'recommendations')}
              >
                Recommendations ({result.recommendations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" active={activeTab === 'overview'} class="tab-content">
              <div class="overview-content">
                <div class="overview-grid">
                  <div class="overview-card">
                    <h3 class="overview-title">Issue Summary</h3>
                    <div class="overview-stats">
                      <div class="overview-stat">
                        <span class="overview-stat-value">{result.issues.totalFlaggedCode}</span>
                        <span class="overview-stat-label">Flagged Code</span>
                      </div>
                      <div class="overview-stat">
                        <span class="overview-stat-value">{result.issues.totalSecurityRisks}</span>
                        <span class="overview-stat-label">Security Risks</span>
                      </div>
                      <div class="overview-stat">
                        <span class="overview-stat-value">{result.issues.totalValidGsap}</span>
                        <span class="overview-stat-label">Valid GSAP</span>
                      </div>
                    </div>
                  </div>

                  <div class="overview-card">
                    <h3 class="overview-title">Common Issues</h3>
                    {#if result.issues.commonIssues.length > 0}
                      <ul class="common-issues-list">
                        {#each result.issues.commonIssues as issue}
                          <li class="common-issue">
                            <span class="issue-count">{issue.count}x</span>
                            <span class="issue-text">{issue.issue}</span>
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="no-issues">No common issues found</p>
                    {/if}
                  </div>
                </div>

                {#if result.crawlStats}
                  <div class="crawl-stats">
                    <span class="crawl-stat">
                      Duration: {result.crawlStats.duration?.toFixed(1) || 'N/A'}s
                    </span>
                    {#if result.crawlStats.pagesPerSecond}
                      <span class="crawl-stat">
                        Speed: {result.crawlStats.pagesPerSecond.toFixed(1)} pages/sec
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
            </TabsContent>
            <TabsContent value="pages" active={activeTab === 'pages'} class="tab-content">
              <div class="pages-content">
                <div class="pages-toolbar">
                  <label class="sort-label">
                    Sort by:
                    <select bind:value={sortOption} class="sort-select">
                      <option value="issues-high">Most Issues</option>
                      <option value="issues-low">Least Issues</option>
                      <option value="name">Name</option>
                      <option value="health">Health</option>
                    </select>
                  </label>
                </div>

                <div class="pages-list">
                  {#each sortedPages() as page}
                    <div class="page-item" class:failed={!page.passed}>
                      <button class="page-header" onclick={() => togglePageExpand(page.url)}>
                        <div class="page-info">
                          <span class="page-status" class:passed={page.passed}>
                            {page.passed ? '✓' : '✗'}
                          </span>
                          <div class="page-details">
                            <span class="page-title">{page.title || 'Untitled'}</span>
                            <span class="page-url">{page.url}</span>
                          </div>
                        </div>
                        <div class="page-metrics">
                          {#if page.flaggedCodeCount > 0}
                            <span class="metric flagged">{page.flaggedCodeCount} flagged</span>
                          {/if}
                          {#if page.securityRiskCount > 0}
                            <span class="metric security">{page.securityRiskCount} security</span>
                          {/if}
                          {#if page.validGsapCount > 0}
                            <span class="metric valid">{page.validGsapCount} valid GSAP</span>
                          {/if}
                          <span class="expand-icon">{expandedPages.has(page.url) ? '−' : '+'}</span>
                        </div>
                      </button>

                      {#if expandedPages.has(page.url)}
                        <div class="page-expanded">
                          {#if page.allFlaggedCode.length > 0}
                            <div class="flagged-code-section">
                              <h4 class="flagged-title">Flagged Code</h4>
                              {#each page.allFlaggedCode as flagged}
                                <div class="flagged-item">
                                  <p class="flagged-message">{flagged.message}</p>
                                  {#each flagged.flaggedCode as code}
                                    <pre class="code-preview">{code}</pre>
                                  {/each}
                                </div>
                              {/each}
                            </div>
                          {:else}
                            <p class="no-issues">No issues found on this page</p>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="issues" active={activeTab === 'issues'} class="tab-content">
              <div class="issues-content">
                {#if result.issues.totalFlaggedCode === 0}
                  <div class="no-issues-message">
                    <span class="success-icon">✓</span>
                    <p>No issues found across all pages.</p>
                  </div>
                {:else}
                  <div class="issues-list">
                    {#each result.pageResults.filter((p) => p.flaggedCodeCount > 0) as page}
                      <div class="issue-page">
                        <h4 class="issue-page-title">
                          <a href={page.url} target="_blank" rel="noopener noreferrer">
                            {page.title || page.url}
                          </a>
                        </h4>
                        {#each page.allFlaggedCode as flagged}
                          <div class="issue-item">
                            <p class="issue-message">{flagged.message}</p>
                            {#each flagged.flaggedCode as code}
                              <pre class="code-preview">{code}</pre>
                            {/each}
                          </div>
                        {/each}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </TabsContent>
            <TabsContent
              value="recommendations"
              active={activeTab === 'recommendations'}
              class="tab-content"
            >
              <div class="recommendations-content">
                {#each result.recommendations as rec}
                  <div class="recommendation-card {rec.type}">
                    <div class="recommendation-header">
                      <span class="recommendation-icon">{getRecommendationIcon(rec.type)}</span>
                      <div class="recommendation-title-group">
                        <h4 class="recommendation-title">{rec.title}</h4>
                        {#if rec.required}
                          <span class="required-badge">Required</span>
                        {/if}
                      </div>
                    </div>
                    <p class="recommendation-description">{rec.description}</p>
                    <p class="recommendation-action">
                      <strong>Action:</strong>
                      {rec.action}
                    </p>
                  </div>
                {/each}
              </div>
            </TabsContent>
          </Tabs>
        </section>
      {/if}
    </div>
  </main>
</div>

<style>
  .playground {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }

  .main-content {
    padding: var(--space-lg) var(--space-md);
  }

  .content-wrapper {
    max-width: 80rem;
    margin: 0 auto;
  }

  /* Header Section */
  .header-section {
    margin-bottom: var(--space-lg);
  }

  .page-title {
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-xs);
  }

  .page-subtitle {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    margin: 0;
    max-width: 48rem;
  }

  .scope-note {
    display: flex;
    gap: var(--space-xs);
    max-width: 60rem;
    margin-top: var(--space-md);
    padding: 0.78rem 0.9rem;
    border: 1px solid var(--color-info-border);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-info-muted) 24%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.5;
  }

  .scope-note strong {
    color: var(--color-info);
    white-space: nowrap;
  }

  /* Input Section */
  .input-section {
    margin-bottom: var(--space-md);
  }

  .input-card {
    background: var(--color-bg-surface);
    border: 1px solid color-mix(in srgb, var(--color-border-default) 74%, transparent);
    border-radius: var(--radius-sm);
    padding: 0.9rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .input-label {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
  }

  .input-row {
    display: flex;
    gap: var(--space-sm);
  }

  .url-input {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
  }

  .url-input:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }

  .url-input:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -1px;
  }

  .url-input:disabled {
    opacity: 0.5;
  }

  .validate-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-body);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .validate-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .validate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    color: var(--color-error);
    font-size: var(--text-body-sm);
    margin: 0;
  }

  /* Results Section */
  .results-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  /* Status Header */
  .status-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: 0.85rem 0;
    border-radius: 0;
    border: 1px solid;
    border-right: 0;
    border-left: 0;
  }

  .status-header.passed {
    background: var(--color-success-muted);
    border-color: var(--color-success-border);
  }

  .status-header.failed {
    background: var(--color-error-muted);
    border-color: var(--color-error-border);
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .status-icon {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: var(--font-bold);
  }

  .passed .status-icon {
    background: var(--color-success);
    color: var(--color-bg-pure);
  }

  .failed .status-icon {
    background: var(--color-error);
    color: var(--color-bg-pure);
  }

  .status-text {
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
  }

  .status-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-left: 2.5rem;
  }

  .validated-url {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  .validated-time {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border-top: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .stat-card:nth-child(even) {
      border-right: 0;
    }
  }

  .stat-card {
    background: transparent;
    border: 0;
    border-right: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    border-radius: 0;
    padding: 0.72rem 0.5rem;
    text-align: center;
  }

  .stat-card:last-child {
    border-right: 0;
  }

  .stat-card.passed {
    border-color: var(--color-success-border);
  }

  .stat-card.failed {
    border-color: var(--color-error-border);
  }

  .stat-value {
    font-size: clamp(1.24rem, 1vw + 0.95rem, 1.68rem);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
  }

  .stat-card.passed .stat-value {
    color: var(--color-success);
  }

  .stat-card.failed .stat-value {
    color: var(--color-error);
  }

  .stat-label {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin-top: var(--space-xs);
  }

  /* Tabs */
  .tabs-shell {
    gap: 0;
  }

  .tabs {
    display: flex;
    gap: var(--space-xs);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    padding: 0 0 var(--space-xs);
    border-radius: 0;
    background: transparent;
  }

  .tab-content {
    background: var(--color-bg-surface);
    border: 1px solid color-mix(in srgb, var(--color-border-default) 74%, transparent);
    border-top: none;
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    padding: 0.9rem;
  }

  /* Overview Tab */
  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-sm);
  }

  @media (max-width: 768px) {
    .overview-grid {
      grid-template-columns: 1fr;
    }
  }

  .overview-card {
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    border-radius: var(--radius-sm);
    padding: 0.82rem;
  }

  .overview-title {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-sm);
  }

  .overview-stats {
    display: flex;
    gap: var(--space-lg);
  }

  .overview-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .overview-stat-value {
    font-size: var(--text-body-lg);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
  }

  .overview-stat-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .common-issues-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .common-issue {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .issue-count {
    background: var(--color-error-muted);
    color: var(--color-error);
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
  }

  .issue-text {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  .crawl-stats {
    display: flex;
    gap: var(--space-md);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  /* Pages Tab */
  .pages-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .pages-toolbar {
    display: flex;
    justify-content: flex-end;
  }

  .sort-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .sort-select {
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
  }

  .pages-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .page-item {
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .page-item.failed {
    border-left: 3px solid var(--color-error);
  }

  .page-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .page-header:hover {
    background: var(--color-hover);
  }

  .page-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .page-status {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: var(--text-caption);
    font-weight: var(--font-bold);
    background: var(--color-error);
    color: var(--color-bg-pure);
  }

  .page-status.passed {
    background: var(--color-success);
  }

  .page-details {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .page-title {
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    font-weight: var(--font-medium);
  }

  .page-url {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .page-metrics {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .metric {
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
  }

  .metric.flagged {
    background: var(--color-error-muted);
    color: var(--color-error);
  }

  .metric.security {
    background: var(--color-warning-muted);
    color: var(--color-warning);
  }

  .metric.valid {
    background: var(--color-success-muted);
    color: var(--color-success);
  }

  .expand-icon {
    color: var(--color-fg-muted);
    font-size: var(--text-h3);
    width: 1.5rem;
    text-align: center;
  }

  .page-expanded {
    padding: var(--space-md);
    border-top: 1px solid var(--color-border-default);
    background: var(--color-bg-pure);
  }

  .flagged-code-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .flagged-title {
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0;
  }

  .flagged-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .flagged-message {
    color: var(--color-error);
    font-size: var(--text-body-sm);
    margin: 0;
  }

  .code-preview {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-sm);
    font-family: monospace;
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    overflow-x: auto;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .no-issues {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    margin: 0;
  }

  /* Issues Tab */
  .issues-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .no-issues-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xl);
    text-align: center;
  }

  .success-icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-success);
    color: var(--color-bg-pure);
    border-radius: 50%;
    font-size: var(--text-h3);
  }

  .issues-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .issue-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .issue-page-title {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    margin: 0;
  }

  .issue-page-title a {
    color: var(--color-fg-primary);
    text-decoration: none;
  }

  .issue-page-title a:hover {
    text-decoration: underline;
  }

  .issue-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding-left: var(--space-md);
    border-left: 2px solid var(--color-error-border);
  }

  .issue-message {
    color: var(--color-error);
    font-size: var(--text-body-sm);
    margin: 0;
  }

  /* Recommendations Tab */
  .recommendations-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .recommendation-card {
    padding: 0.82rem;
    border-radius: var(--radius-sm);
    border: 1px solid;
  }

  .recommendation-card.critical {
    background: var(--color-error-muted);
    border-color: var(--color-error-border);
  }

  .recommendation-card.warning {
    background: var(--color-warning-muted);
    border-color: var(--color-warning-border);
  }

  .recommendation-card.success {
    background: var(--color-success-muted);
    border-color: var(--color-success-border);
  }

  .recommendation-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .recommendation-icon {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: var(--text-caption);
    font-weight: var(--font-bold);
  }

  .critical .recommendation-icon {
    background: var(--color-error);
    color: var(--color-bg-pure);
  }

  .warning .recommendation-icon {
    background: var(--color-warning);
    color: var(--color-bg-pure);
  }

  .success .recommendation-icon {
    background: var(--color-success);
    color: var(--color-bg-pure);
  }

  .recommendation-title-group {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex: 1;
  }

  .recommendation-title {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0;
  }

  .required-badge {
    padding: 0.125rem 0.5rem;
    background: var(--color-error);
    color: var(--color-bg-pure);
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
  }

  .recommendation-description {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    margin: 0 0 var(--space-sm);
  }

  .recommendation-action {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    margin: 0;
  }
</style>
