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
  import { grow } from '$lib/motion/actions';
  import { gsap, motionOK } from '$lib/motion/core';
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

  let refreshIconEl = $state<HTMLElement | null>(null);

  async function handleRefresh() {
    if (userEmail) {
      // The icon turns while the request runs, then settles.
      const spin =
        refreshIconEl && motionOK()
          ? gsap.to(refreshIconEl, { rotation: '+=360', duration: 0.7, ease: 'none', repeat: -1 })
          : null;
      try {
        await submissionStore.forceRefresh(userEmail);
        toast.info('Refreshed submission status');
      } finally {
        if (spin && refreshIconEl) {
          spin.kill();
          gsap.to(refreshIconEl, {
            rotation: '+=180',
            duration: 0.5,
            ease: 'power3.out',
            clearProps: 'transform'
          });
        }
      }
    }
  }

  const ROLLING_WINDOW_DAYS = 30;

  /** How far a submission is through its 30-day window, 0 to 1. */
  function windowProgress(daysUntilExpiry: number): number {
    return Math.min(1, Math.max(0, (ROLLING_WINDOW_DAYS - daysUntilExpiry) / ROLLING_WINDOW_DAYS));
  }

  const quotaSlots = $derived(
    Array.from({ length: SUBMISSION_LIMIT }, (_, index) => index < submissionData.assetsSubmitted30)
  );

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
            {submissionData.assetsSubmitted30}/{SUBMISSION_LIMIT} in last 30 days
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
            <span>Rolling 30 days:</span>
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
    <Card interactive>
      <CardHeader>
        <div class="card-header-content">
          <CardTitle>Submission Status</CardTitle>
          <div class="header-badges">
            {#if submissionData.isDevMode}
              <Badge variant="default">DEV</Badge>
            {/if}
            <Badge variant={getBadgeVariant()}>
              {getStatusText()}
            </Badge>
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

          <div
            class="quota"
            class:warning={submissionData.warningLevel === 'caution'}
            class:critical={submissionData.isAtLimit && !submissionData.isWhitelisted}
          >
            <div class="quota-line">
              <p class="quota-figure">
                <span class="quota-used">{submissionData.assetsSubmitted30}</span>
                <span class="quota-limit">of {SUBMISSION_LIMIT}</span>
                <span class="quota-caption">submissions used in the last 30 days</span>
              </p>
              <p class="quota-remaining">
                <strong>{submissionData.isWhitelisted ? '∞' : submissionData.remainingSubmissions}</strong>
                remaining
              </p>
            </div>
            {#if !submissionData.isWhitelisted}
              <div
                class="quota-meter"
                role="img"
                aria-label={`${submissionData.assetsSubmitted30} of ${SUBMISSION_LIMIT} submissions used`}
                use:grow={{ children: '.quota-slot-fill' }}
              >
                {#each quotaSlots as used}
                  <span class="quota-slot">
                    {#if used}<span class="quota-slot-fill"></span>{/if}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          {#if submissionData.submissions.length > 0}
            <div class="active-submissions">
              <h4>Active submissions, by time left in the 30-day window</h4>
              <div class="submissions-full-list">
                {#each submissionData.submissions as submission}
                  <div class="submission-row" class:soon={submission.daysUntilExpiry <= 7}>
                    <span class="submission-name-full">{submission.name}</span>
                    <span class="submission-expiry-full">
                      {submission.daysUntilExpiry}d until expiry
                    </span>
                    <span class="submission-date">
                      exp. {formatLongDate(submission.expiryDate)}
                    </span>
                    <!-- Decorative: the text beside it already states the days left. -->
                    <span class="submission-track" aria-hidden="true" use:grow={{ children: 'span' }}>
                      <span style="width: {windowProgress(submission.daysUntilExpiry) * 100}%"></span>
                    </span>
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
              <span class="status-facts">
                <strong>{submissionData.publishedCount}</strong> published templates
                <span aria-hidden="true">·</span>
                <strong>{submissionData.totalSubmitted}</strong> total submitted
              </span>
              <span>
                {submissionData.dataSource === 'external'
                  ? 'Synced with server'
                  : 'Local calculation'}
                {#if submissionData.isDevMode}
                  (Dev mode)
                {/if}
              </span>
            </span>
            <button type="button" class="refresh-button" onclick={handleRefresh}>
              <span class="refresh-icon" bind:this={refreshIconEl}><RefreshCw size={14} /></span>
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
    color: var(--color-info-ink);
  }

  .error-banner {
    background: var(--color-error-muted);
    color: var(--color-error-ink);
    flex-wrap: wrap;
  }

  .whitelist-banner {
    background: var(--color-success-muted);
    color: var(--color-success-ink);
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
    color: var(--color-warning-ink);
  }

  .stat-value.critical {
    color: var(--color-error-ink);
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
    color: var(--color-warning-ink);
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
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
    width: 100%;
  }

  .card-header-content :global(.card-title) {
    white-space: nowrap;
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
    color: var(--color-error-ink);
    font-size: var(--text-body-sm);
  }

  .whitelist-banner-full {
    background: var(--color-success-muted);
    color: var(--color-success-ink);
    font-size: var(--text-body-sm);
  }

  .whitelist-banner-full :global(svg) {
    flex-shrink: 0;
  }

  .warning-banner {
    background: var(--color-warning-muted);
    color: var(--color-warning-ink);
    font-size: var(--text-body-sm);
  }

  .warning-banner :global(svg) {
    flex-shrink: 0;
  }

  /* Quota: the 30-day submission allowance as a meter, one segment per slot. */
  .quota {
    --quota-color: var(--color-info);
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .quota.warning {
    --quota-color: var(--color-warning);
  }

  .quota.critical {
    --quota-color: var(--color-error);
  }

  .quota-line {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
  }

  .quota-figure,
  .quota-remaining {
    margin: 0;
  }

  .quota-figure {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.1rem 0.45rem;
  }

  .quota-used {
    font-family: var(--font-heading);
    font-size: 2.5rem;
    font-weight: var(--font-semibold);
    line-height: 0.95;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: var(--color-fg-primary);
  }

  .quota-limit {
    font-size: 1.15rem;
    font-weight: var(--font-medium);
    color: var(--color-fg-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .quota-caption {
    flex-basis: 100%;
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .quota-remaining {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    white-space: nowrap;
  }

  .quota-remaining strong {
    margin-right: 0.15rem;
    color: var(--color-fg-primary);
    font-size: 1.15rem;
    font-weight: var(--font-semibold);
    font-variant-numeric: tabular-nums;
  }

  .quota-meter {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 0.3rem;
  }

  .quota-slot {
    height: 0.5rem;
    border-radius: 999px;
    background: var(--color-bg-subtle);
    overflow: hidden;
  }

  .quota-slot-fill {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background: var(--quota-color);
  }

  .status-facts {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  .status-facts strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
    font-variant-numeric: tabular-nums;
  }

  .active-submissions {
    margin: 1.25rem 0 0;
  }

  .active-submissions h4 {
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
    margin: 0 0 0.6rem;
  }

  .submissions-full-list {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  /* Name, days left and date on one line; the window track runs underneath. */
  .submission-row {
    --track-color: var(--color-data-1);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: baseline;
    gap: 0.35rem 0.9rem;
  }

  .submission-row.soon {
    --track-color: var(--color-warning);
  }

  .submission-name-full {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .submission-expiry-full {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .submission-row.soon .submission-expiry-full {
    color: var(--color-warning-ink);
    font-weight: var(--font-medium);
  }

  .submission-date {
    min-width: 7.2rem;
    text-align: right;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .submission-track {
    grid-column: 1 / -1;
    height: 4px;
    border-radius: 999px;
    background: var(--color-bg-subtle);
    overflow: hidden;
  }

  .submission-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--track-color);
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
    /* Its own top margin: with no active submission it follows the meter directly. */
    margin-top: 1.25rem;
    padding-top: 0.85rem;
    border-top: 1px solid var(--color-border-default);
  }

  .data-source-full {
    display: grid;
    gap: 0.15rem;
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

  .refresh-icon {
    display: inline-flex;
  }

  @media (max-width: 30rem) {
    .submission-row {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .submission-date {
      display: none;
    }
  }

  .tracker-button:focus-visible,
  .retry-button:focus-visible,
  .refresh-link:focus-visible,
  .refresh-button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
