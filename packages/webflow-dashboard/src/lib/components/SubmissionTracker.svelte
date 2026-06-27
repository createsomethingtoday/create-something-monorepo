<script lang="ts">
  import { Badge, Card, CardHeader, CardTitle, CardContent, Button } from './ui';
  import type { Asset } from '$lib/server/airtable';
  import {
    submissionStore,
    SUBMISSION_LIMIT,
    formatTimeUntil,
    type SubmissionState
  } from '$lib/stores/submission';
  import { formatLongDate } from '$lib/utils/format';
  import { untrack } from 'svelte';
  import { toast } from '$lib/stores/toast';
  import {
    CheckCircle2,
    Clock,
    Shield,
    AlertCircle,
    AlertTriangle,
    RefreshCw
  } from 'lucide-svelte';

  interface Props {
    assets: Asset[];
    variant?: 'default' | 'compact';
    userEmail?: string;
  }

  let { assets, variant = 'default', userEmail }: Props = $props();

  let isTooltipOpen = $state(false);
  let storeData = $state<SubmissionState | null>(null);
  let countdownStartedAt = $state<number | null>(null);
  let initialTimeUntilNextSlot = $state<number | null>(null);
  let displayedTimeUntilSlot = $state<string>('');
  let hasRefreshedAfterCountdown = false;

  function syncDisplayedTimeUntilSlot(): void {
    if (
      initialTimeUntilNextSlot === null ||
      initialTimeUntilNextSlot <= 0 ||
      countdownStartedAt === null
    ) {
      displayedTimeUntilSlot = '';
      return;
    }

    const elapsedMs = Date.now() - countdownStartedAt;
    const remainingMs = Math.max(0, initialTimeUntilNextSlot - elapsedMs);
    displayedTimeUntilSlot = formatTimeUntil(remainingMs);

    // The countdown lapsed: re-fetch once so the freed slot appears without a reload.
    if (remainingMs === 0 && !hasRefreshedAfterCountdown) {
      hasRefreshedAfterCountdown = true;
      if (userEmail) {
        submissionStore.refresh(userEmail);
      }
    }
  }

  // Keep the store in sync with the assets prop (covers mount and updates)
  $effect(() => {
    submissionStore.setAssets(assets);
  });

  // Store subscription + 1s countdown tick, torn down together on unmount
  $effect(() => {
    if (userEmail) {
      submissionStore.refresh(userEmail);
    }

    // untrack: the store invokes the subscriber synchronously, and its state
    // reads must not become dependencies of this effect (would re-subscribe
    // and re-fetch on every countdown update).
    const unsubscribe = untrack(() =>
      submissionStore.subscribe((data) => {
        storeData = data;

        if (data.timeUntilNextSlot !== null && data.timeUntilNextSlot > 0) {
          initialTimeUntilNextSlot = data.timeUntilNextSlot;
          countdownStartedAt = Date.now();
          hasRefreshedAfterCountdown = false;
          syncDisplayedTimeUntilSlot();
        } else {
          initialTimeUntilNextSlot = null;
          countdownStartedAt = null;
          displayedTimeUntilSlot = '';
        }
      })
    );

    const interval = setInterval(syncDisplayedTimeUntilSlot, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  });

  // Get submission data from store with fallback
  const submissionData = $derived.by(() => {
    if (!storeData) {
      return {
        submissions: [],
        remainingSubmissions: SUBMISSION_LIMIT,
        isAtLimit: false,
        nextExpiryDate: null,
        publishedCount: 0,
        totalSubmitted: 0,
        assetsSubmitted30: 0,
        isWhitelisted: false,
        isLoading: true,
        isDevMode: false,
        hasError: false,
        errorMessage: '',
        warningLevel: 'none' as const,
        showWarning: false,
        dataSource: 'local' as const,
        timeUntilNextSlot: null,
        message: ''
      };
    }

    return {
      submissions: storeData.submissions,
      remainingSubmissions: storeData.remainingSubmissions,
      isAtLimit: storeData.isAtLimit,
      nextExpiryDate: storeData.nextExpiryDate,
      publishedCount: storeData.publishedTemplates,
      totalSubmitted: storeData.submittedTemplates,
      assetsSubmitted30: storeData.assetsSubmitted30,
      isWhitelisted: storeData.isWhitelisted,
      isLoading: storeData.isLoading,
      isDevMode: storeData.isDevMode,
      hasError: storeData.hasError,
      errorMessage: storeData.errorMessage,
      warningLevel: storeData.warningLevel,
      showWarning: storeData.showWarning,
      dataSource: storeData.dataSource,
      timeUntilNextSlot: storeData.timeUntilNextSlot,
      message: storeData.message
    };
  });

  function toggleTooltip() {
    isTooltipOpen = !isTooltipOpen;
  }

  function closeTooltip() {
    isTooltipOpen = false;
  }

  function handleTooltipKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeTooltip();
    }
  }

  async function handleRefresh() {
    if (userEmail) {
      await submissionStore.forceRefresh(userEmail);
      toast.info('Refreshed submission status');
    }
  }

  function getBadgeVariant(): 'success' | 'warning' | 'error' | 'default' {
    const data = submissionData;
    if (data.isWhitelisted) return 'default';
    if (data.isAtLimit) return 'error';
    if (data.warningLevel === 'caution') return 'warning';
    return 'success';
  }

  function getStatusText(): string {
    const data = submissionData;
    if (data.isWhitelisted) return 'Unlimited';
    if (data.isAtLimit) return 'Limit Reached';
    if (data.warningLevel === 'caution') return 'Near Limit';
    return 'Can Submit';
  }
</script>

{#if variant === 'compact'}
  <div class="compact-tracker">
    <button type="button" class="tracker-button" onclick={toggleTooltip}>
      {#if submissionData.isLoading}
        <Badge variant="default">
          <span class="loading-pulse">Loading...</span>
        </Badge>
      {:else}
        <Badge variant={getBadgeVariant()}>
          {#if submissionData.isWhitelisted}
            <span class="whitelist-icon">
              <CheckCircle2 size={12} />
            </span>
            Unlimited
          {:else}
            {submissionData.assetsSubmitted30}/{SUBMISSION_LIMIT} this month
          {/if}
        </Badge>
      {/if}
      {#if submissionData.isAtLimit && submissionData.nextExpiryDate && !submissionData.isWhitelisted}
        <span class="next-date">
          <Clock size={12} />
          {displayedTimeUntilSlot || formatTimeUntil(submissionData.timeUntilNextSlot)}
        </span>
      {/if}
      {#if submissionData.isDevMode}
        <span class="dev-indicator" title="Development mode - using local calculation">DEV</span>
      {/if}
    </button>

    {#if isTooltipOpen}
      <button
        type="button"
        class="tooltip-overlay"
        aria-label="Close submission status details"
        onclick={closeTooltip}
      ></button>
      <div
        class="tooltip-content"
        class:warning={submissionData.warningLevel === 'caution'}
        class:critical={submissionData.isAtLimit && !submissionData.isWhitelisted}
        role="dialog"
        aria-modal="false"
        aria-label="Submission status details"
        tabindex="-1"
        onkeydown={handleTooltipKeydown}
      >
        <div class="tooltip-header">
          <h4>Submission Status</h4>
          <Badge variant={getBadgeVariant()}>
            {getStatusText()}
          </Badge>
        </div>

        {#if submissionData.isDevMode}
          <div class="dev-mode-banner">
            <Shield size={14} />
            Development mode - external API skipped due to CORS
          </div>
        {/if}

        {#if submissionData.hasError}
          <div class="error-banner">
            <AlertCircle size={14} />
            {submissionData.message || 'Server unavailable'}
            <button type="button" class="retry-button" onclick={handleRefresh}>Retry</button>
          </div>
        {/if}

        {#if submissionData.isWhitelisted}
          <div class="whitelist-banner">
            <CheckCircle2 size={14} />
            Whitelisted account - no submission limits
          </div>
        {/if}

        <div class="tooltip-stats">
          <div class="stat-row">
            <span>Published:</span>
            <span class="stat-value">{submissionData.publishedCount}</span>
          </div>
          <div class="stat-row">
            <span>Total Submitted:</span>
            <span class="stat-value">{submissionData.totalSubmitted}</span>
          </div>
          <div class="stat-row">
            <span>This Month:</span>
            <span
              class="stat-value"
              class:warning={submissionData.warningLevel === 'caution'}
              class:critical={submissionData.isAtLimit}
            >
              {submissionData.assetsSubmitted30}/{SUBMISSION_LIMIT}
            </span>
          </div>
          <div class="stat-row">
            <span>Remaining:</span>
            <span
              class="stat-value"
              class:warning={submissionData.warningLevel === 'caution'}
              class:critical={submissionData.isAtLimit}
            >
              {submissionData.isWhitelisted ? '∞' : submissionData.remainingSubmissions}
            </span>
          </div>
        </div>

        {#if submissionData.submissions.length > 0}
          <div class="submissions-list">
            <h5>Active Submissions</h5>
            <div class="submissions-scroll">
              {#each submissionData.submissions.slice(0, 6) as submission}
                <div class="submission-item">
                  <div class="submission-name">
                    <div
                      class="submission-dot"
                      style="background: {submission.daysUntilExpiry <= 7
                        ? 'var(--color-warning)'
                        : 'var(--color-data-1)'}"
                    ></div>
                    <span>{submission.name}</span>
                  </div>
                  <span class="submission-expiry" class:soon={submission.daysUntilExpiry <= 7}>
                    {submission.daysUntilExpiry}d left
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if submissionData.nextExpiryDate && submissionData.isAtLimit && !submissionData.isWhitelisted}
          <div class="next-slot">
            <Clock size={14} />
            Next slot: {formatLongDate(submissionData.nextExpiryDate)} ({displayedTimeUntilSlot ||
              formatTimeUntil(submissionData.timeUntilNextSlot)})
          </div>
        {/if}

        <div class="tooltip-footer">
          <span class="data-source">
            Data: {submissionData.dataSource === 'external' ? 'Server' : 'Local'}
          </span>
          <button type="button" class="refresh-link" onclick={handleRefresh}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div
    class="card-wrapper"
    class:warning-card={submissionData.warningLevel === 'caution'}
    class:critical-card={submissionData.isAtLimit && !submissionData.isWhitelisted}
  >
    <Card>
      <CardHeader>
        <div class="card-header-content">
          <div class="submission-heading">
            <CardTitle>Submission Status</CardTitle>
            <div class="submission-meta-row">
              <p class="submission-summary">
                <strong>{submissionData.publishedCount}</strong> published
                <span aria-hidden="true">·</span>
                <strong>{submissionData.assetsSubmitted30}/{SUBMISSION_LIMIT}</strong> used this month
                <span aria-hidden="true">·</span>
                <strong>{submissionData.isWhitelisted ? '∞' : submissionData.remainingSubmissions}</strong>
                remaining
              </p>
              <div class="header-badges">
                {#if submissionData.isDevMode}
                  <Badge variant="default">DEV</Badge>
                {/if}
                <Badge variant={getBadgeVariant()}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {#if submissionData.isLoading}
          <div class="loading-state">
            <div class="skeleton-grid">
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
        {:else}
          {#if submissionData.hasError}
            <div class="error-banner-full">
              <div class="error-content">
                <AlertCircle size={16} />
                <span>{submissionData.message || 'Server unavailable - using local data'}</span>
              </div>
              <Button variant="outline" size="sm" onclick={handleRefresh}>Retry</Button>
            </div>
          {/if}

          {#if submissionData.isWhitelisted}
            <div class="whitelist-banner-full">
              <CheckCircle2 size={16} />
              <span>Your account is whitelisted - no submission limits apply</span>
            </div>
          {/if}

          {#if submissionData.warningLevel === 'caution' && !submissionData.isWhitelisted}
            <div class="warning-banner">
              <AlertTriangle size={16} />
              <span
                >Approaching submission limit - {submissionData.remainingSubmissions} slots remaining</span
              >
            </div>
          {/if}

          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">Published Templates</span>
              <span class="status-value">{submissionData.publishedCount}</span>
            </div>
            <div class="status-item">
              <span class="status-label">This Month</span>
              <span
                class="status-value"
                class:warning={submissionData.warningLevel === 'caution'}
                class:critical={submissionData.isAtLimit}
              >
                {submissionData.assetsSubmitted30}/{SUBMISSION_LIMIT}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Total Submitted</span>
              <span class="status-value">{submissionData.totalSubmitted}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Remaining</span>
              <span
                class="status-value"
                class:warning={submissionData.warningLevel === 'caution'}
                class:critical={submissionData.isAtLimit}
              >
                {submissionData.isWhitelisted ? '∞' : submissionData.remainingSubmissions}
              </span>
            </div>
          </div>

          {#if submissionData.submissions.length > 0}
            <div class="active-submissions">
              <h4>Active Submissions (30-day window)</h4>
              <div class="submissions-full-list">
                {#each submissionData.submissions as submission}
                  <div class="submission-row">
                    <div class="submission-name-full">
                      <div
                        class="submission-dot"
                        style="background: {submission.daysUntilExpiry <= 7
                          ? 'var(--color-warning)'
                          : 'var(--color-data-1)'}"
                      ></div>
                      <span>{submission.name}</span>
                    </div>
                    <div class="submission-meta">
                      <span
                        class="submission-expiry-full"
                        class:soon={submission.daysUntilExpiry <= 7}
                      >
                        {submission.daysUntilExpiry}d until expiry
                      </span>
                      <span class="submission-date">
                        exp. {formatLongDate(submission.expiryDate)}
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if submissionData.nextExpiryDate && submissionData.isAtLimit && !submissionData.isWhitelisted}
            <div class="next-slot-full">
              <Clock size={16} />
              <div class="next-slot-info">
                <span class="next-slot-label">Next slot available</span>
                <span class="next-slot-date">{formatLongDate(submissionData.nextExpiryDate)}</span>
                <span class="next-slot-countdown"
                  >({displayedTimeUntilSlot ||
                    formatTimeUntil(submissionData.timeUntilNextSlot)})</span
                >
              </div>
            </div>
          {/if}

          <div class="card-footer">
            <span class="data-source-full">
              {submissionData.dataSource === 'external'
                ? 'Synced with server'
                : 'Local calculation'}
              {#if submissionData.isDevMode}
                (Dev mode)
              {/if}
            </span>
            <button type="button" class="refresh-button" onclick={handleRefresh}>
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
{/if}

<style>
  .card-wrapper {
    border-radius: var(--radius-lg);
    width: 100%;
  }

  .card-wrapper :global(.card) {
    width: 100%;
  }

  .card-wrapper.warning-card :global(.card) {
    border-color: var(--color-warning-border);
  }

  .card-wrapper.critical-card :global(.card) {
    border-color: var(--color-error-border);
  }

  .compact-tracker {
    position: relative;
  }

  .tracker-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .loading-pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  .whitelist-icon {
    margin-right: 0.25rem;
  }

  .next-date {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .dev-indicator {
    font-size: var(--text-caption);
    padding: 0.125rem 0.375rem;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-weight: var(--font-medium);
  }

  .tooltip-overlay {
    position: fixed;
    inset: 0;
    z-index: 49;
  }

  .tooltip-content {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 50;
    width: 20rem;
    margin-top: var(--space-xs);
    padding: var(--space-sm);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
  }

  .tooltip-content.warning {
    border-color: var(--color-warning-border);
  }

  .tooltip-content.critical {
    border-color: var(--color-error-border);
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }

  .tooltip-header h4 {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
    margin: 0;
  }

  .dev-mode-banner,
  .error-banner,
  .whitelist-banner {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-caption);
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-sm);
  }

  .dev-mode-banner {
    background: var(--color-info-muted);
    color: var(--color-info);
  }

  .error-banner {
    background: var(--color-error-muted);
    color: var(--color-error);
    flex-wrap: wrap;
  }

  .whitelist-banner {
    background: var(--color-success-muted);
    color: var(--color-success);
  }

  .retry-button {
    background: none;
    border: none;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
    font-size: var(--text-caption);
    margin-left: auto;
  }

  .tooltip-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .stat-value {
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
  }

  .stat-value.warning {
    color: var(--color-warning);
  }

  .stat-value.critical {
    color: var(--color-error);
  }

  .submissions-list {
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
  }

  .submissions-list h5 {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-xs);
  }

  .submissions-scroll {
    max-height: 8rem;
    overflow-y: auto;
  }

  .submission-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0;
  }

  .submission-name {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    max-width: 9rem;
  }

  .submission-name span {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .submission-dot {
    width: 0.375rem;
    height: 0.375rem;
    background: var(--color-data-1);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .submission-expiry {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .submission-expiry.soon {
    color: var(--color-warning);
    font-weight: var(--font-medium);
  }

  .next-slot {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-sm);
  }

  .tooltip-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-xs);
    border-top: 1px solid var(--color-border-default);
  }

  .data-source {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .refresh-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: var(--radius-sm);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .refresh-link:hover {
    color: var(--color-fg-primary);
  }

  /* Full variant styles */
  .card-header-content {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }

  .submission-heading {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    width: 100%;
  }

  .submission-meta-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .submission-summary {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.5rem;
    font-size: 0.98rem;
    color: var(--color-fg-tertiary);
    line-height: 1.45;
  }

  .submission-summary strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
    font-variant-numeric: tabular-nums;
  }

  .header-badges {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
    flex-shrink: 0;
  }

  .header-badges :global(.badge) {
    font-size: 0.77rem;
    letter-spacing: 0.02em;
  }

  .loading-state {
    padding: var(--space-sm);
  }

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }

  .skeleton-item {
    height: 3rem;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .error-banner-full,
  .whitelist-banner-full,
  .warning-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }

  .error-banner-full {
    background: var(--color-error-muted);
  }

  .error-content {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-error);
    font-size: var(--text-body-sm);
  }

  .whitelist-banner-full {
    background: var(--color-success-muted);
    color: var(--color-success);
    font-size: var(--text-body-sm);
  }

  .whitelist-banner-full :global(svg) {
    flex-shrink: 0;
  }

  .warning-banner {
    background: var(--color-warning-muted);
    color: var(--color-warning);
    font-size: var(--text-body-sm);
  }

  .warning-banner :global(svg) {
    flex-shrink: 0;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.9rem 1rem;
    margin-bottom: 1rem;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .status-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .status-value {
    font-size: clamp(1.45rem, 1vw + 1rem, 1.85rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
    line-height: 1.05;
  }

  .status-value.warning {
    color: var(--color-warning);
  }

  .status-value.critical {
    color: var(--color-error);
  }

  .active-submissions {
    margin-bottom: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border-default);
  }

  .active-submissions h4 {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-sm);
  }

  .submissions-full-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .submission-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .submission-name-full {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .submission-name-full span {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .submission-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .submission-expiry-full {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .submission-expiry-full.soon {
    color: var(--color-warning);
    font-weight: var(--font-medium);
  }

  .submission-date {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .next-slot-full {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }

  .next-slot-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .next-slot-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .next-slot-date {
    font-size: var(--text-body);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
  }

  .next-slot-countdown {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.85rem;
    border-top: 1px solid var(--color-border-default);
  }

  .data-source-full {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    letter-spacing: 0.01em;
  }

  .refresh-button {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: none;
    border: 1px solid var(--color-border-default);
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .refresh-button:hover {
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .tracker-button:focus-visible,
  .retry-button:focus-visible,
  .refresh-link:focus-visible,
  .refresh-button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
