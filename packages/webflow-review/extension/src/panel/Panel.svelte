<script lang="ts">
  import { onMount } from 'svelte';
  import type { Finding } from '../../../shared/types';
  import FindingCard from './FindingCard.svelte';
  import ScoreRing from './ScoreRing.svelte';

  let isLoading = false;
  let error: string | null = null;
  let findings: Finding[] = [];
  let score: number | null = null;
  let duration: number | null = null;

  let currentUrl: string = '';
  let projectId: string = '';

  // Group findings by severity
  $: criticalFindings = findings.filter(f => f.severity === 'critical');
  $: warningFindings = findings.filter(f => f.severity === 'warning');
  $: infoFindings = findings.filter(f => f.severity === 'info');

  onMount(() => {
    // Get current page info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageUrl' }, (response) => {
          if (response) {
            currentUrl = response.url;
            projectId = response.projectId;
          }
        });
      }
    });

    // Listen for review completion
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'reviewComplete') {
        handleReviewResult(message.result);
      }
    });
  });

  async function startReview() {
    if (!currentUrl) {
      error = 'No URL detected. Make sure you\'re on a Webflow page.';
      return;
    }

    isLoading = true;
    error = null;
    findings = [];
    score = null;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startReview',
        url: currentUrl,
        projectId,
      });

      handleReviewResult(response);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Review failed';
      isLoading = false;
    }
  }

  function handleReviewResult(result: any) {
    isLoading = false;

    if (!result.success) {
      error = result.error || 'Review failed';
      return;
    }

    findings = result.findings || [];
    score = result.score;
    duration = result.duration;
  }

  function handleFindingClick(finding: Finding) {
    if (!finding.elementSelector) return;

    // Send message to content script to highlight element
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'highlightElement',
          selector: finding.elementSelector,
          severity: finding.severity,
        });
      }
    });
  }

  function getScoreColor(score: number): string {
    if (score >= 90) return '#10b981'; // green
    if (score >= 75) return '#3b82f6'; // blue
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }

  function getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Needs Work';
    return 'Poor';
  }
</script>

<div class="panel">
  <!-- Header -->
  <header class="header">
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor"/>
      </svg>
      <h1>Webflow Review</h1>
    </div>

    {#if currentUrl}
      <div class="url-info">
        <span class="url-label">Page:</span>
        <span class="url-text" title={currentUrl}>
          {new URL(currentUrl).pathname}
        </span>
      </div>
    {/if}
  </header>

  <!-- Main Content -->
  <main class="content">
    {#if !isLoading && !score && !error}
      <!-- Initial State -->
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h2>Ready to Review</h2>
        <p>Click the button below to check this page for SEO issues, broken links, and more.</p>
        <button class="btn-primary" on:click={startReview}>
          Review This Page
        </button>
      </div>
    {:else if isLoading}
      <!-- Loading State -->
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Analyzing page...</p>
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h2>Review Failed</h2>
        <p class="error-message">{error}</p>
        <button class="btn-secondary" on:click={startReview}>
          Try Again
        </button>
      </div>
    {:else if score !== null}
      <!-- Results State -->
      <div class="results">
        <!-- Score -->
        <div class="score-section">
          <ScoreRing {score} color={getScoreColor(score)} />
          <div class="score-details">
            <div class="score-label">{getScoreLabel(score)}</div>
            {#if duration}
              <div class="score-meta">Completed in {(duration / 1000).toFixed(1)}s</div>
            {/if}
          </div>
        </div>

        <!-- Summary -->
        <div class="summary">
          <div class="summary-item">
            <span class="summary-count critical">{criticalFindings.length}</span>
            <span class="summary-label">Critical</span>
          </div>
          <div class="summary-item">
            <span class="summary-count warning">{warningFindings.length}</span>
            <span class="summary-label">Warning</span>
          </div>
          <div class="summary-item">
            <span class="summary-count info">{infoFindings.length}</span>
            <span class="summary-label">Info</span>
          </div>
        </div>

        <!-- Findings -->
        <div class="findings">
          {#if criticalFindings.length > 0}
            <div class="findings-group">
              <h3 class="findings-title critical">Critical Issues</h3>
              {#each criticalFindings as finding}
                <FindingCard {finding} on:click={() => handleFindingClick(finding)} />
              {/each}
            </div>
          {/if}

          {#if warningFindings.length > 0}
            <div class="findings-group">
              <h3 class="findings-title warning">Warnings</h3>
              {#each warningFindings as finding}
                <FindingCard {finding} on:click={() => handleFindingClick(finding)} />
              {/each}
            </div>
          {/if}

          {#if infoFindings.length > 0}
            <div class="findings-group">
              <h3 class="findings-title info">Informational</h3>
              {#each infoFindings as finding}
                <FindingCard {finding} on:click={() => handleFindingClick(finding)} />
              {/each}
            </div>
          {/if}
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn-secondary" on:click={startReview}>
            Review Again
          </button>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .panel {
    min-height: 100vh;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1f2937;
  }

  .header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .logo svg {
    color: #3b82f6;
  }

  .logo h1 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .url-info {
    font-size: 12px;
    color: #6b7280;
    overflow: hidden;
  }

  .url-label {
    font-weight: 500;
    margin-right: 4px;
  }

  .url-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .content {
    padding: 16px;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 48px 24px;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-state h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .empty-state p {
    color: #6b7280;
    margin: 0 0 24px;
    line-height: 1.5;
  }

  /* Loading State */
  .loading-state {
    text-align: center;
    padding: 64px 24px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-state p {
    color: #6b7280;
    margin: 0;
  }

  /* Error State */
  .error-state {
    text-align: center;
    padding: 48px 24px;
  }

  .error-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .error-state h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .error-message {
    color: #ef4444;
    margin: 0 0 24px;
    line-height: 1.5;
  }

  /* Results */
  .score-section {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px;
    background: #f9fafb;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .score-details {
    flex: 1;
  }

  .score-label {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .score-meta {
    font-size: 14px;
    color: #6b7280;
  }

  /* Summary */
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .summary-count {
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 8px;
  }

  .summary-count.critical { color: #ef4444; }
  .summary-count.warning { color: #f59e0b; }
  .summary-count.info { color: #3b82f6; }

  .summary-label {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Findings */
  .findings-group {
    margin-bottom: 24px;
  }

  .findings-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid;
  }

  .findings-title.critical {
    color: #ef4444;
    border-color: #ef4444;
  }

  .findings-title.warning {
    color: #f59e0b;
    border-color: #f59e0b;
  }

  .findings-title.info {
    color: #3b82f6;
    border-color: #3b82f6;
  }

  /* Actions */
  .actions {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }

  /* Buttons */
  .btn-primary,
  .btn-secondary {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #1f2937;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }

  button {
    width: 100%;
  }
</style>
