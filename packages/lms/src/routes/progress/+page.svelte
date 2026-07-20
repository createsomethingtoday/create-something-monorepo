<script lang="ts">
  /**
   * Progress Page
   *
   * Shows lesson completion and time spent, then resolves one truthful next lesson.
   */

  import { PATHS } from '$content/paths';
  import { CheckCircle, Circle, Clock, ArrowRight, RefreshCw } from 'lucide-svelte';
  import { progress, overallProgress } from '$lib/stores/progress';
  import { buildProgressView } from '$lib/progress/view';
  import { onMount } from 'svelte';

  let mounted = $state(false);

  const hasProgressData = $derived(
    $progress.stats.totalLessons > 0 || $progress.pathProgress.length > 0
  );
  const initialLoading = $derived(!mounted || ($progress.loading && !hasProgressData));
  const progressView = $derived(
    buildProgressView(PATHS, $progress.pathProgress, $progress.stats, $progress.lessonProgress)
  );

  onMount(() => {
    mounted = true;
    void progress.fetch();
  });

  function getPath(pathId: string) {
    return PATHS.find((path) => path.id === pathId);
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  async function refreshProgress() {
    await progress.fetch();
  }
</script>

<svelte:head>
  <title>Your Progress | CREATE SOMETHING LMS</title>
</svelte:head>

<div class="progress-page max-w-5xl mx-auto px-6 py-16">
  <section data-performance-chapter="task-state" class="progress-chapter task-state">
    <header class="page-header">
      <p class="eyebrow">Learning progress</p>
      <h1 class="page-title">Your learning progress.</h1>
      <p class="page-subtitle">See what you finished, then open the next lesson.</p>
    </header>

    <noscript>
      <style>
        .js-progress {
          display: none !important;
        }
      </style>
      <div class="noscript-notice">
        <h2>Saved progress cannot load without JavaScript.</h2>
        <p>
          Enable JavaScript and reload to see your record, or open the course list to choose a
          lesson.
        </p>
        <a href="/paths">Open the course list</a>
      </div>
    </noscript>

    <div class="js-progress" aria-live="polite">
      {#if initialLoading}
        <div class="state-card" data-progress-state="loading">
          <p class="state-label">Loading saved progress</p>
          <h2>Checking your completed lessons.</h2>
          <p>Your next lesson will appear after your record loads.</p>
        </div>
      {:else if $progress.error && !hasProgressData}
        <div class="state-card error-card" data-progress-state="error">
          <p class="state-label">Progress unavailable</p>
          <h2>We could not load your saved progress.</h2>
          <p>No completion numbers are shown because the record could not be verified.</p>
          <button class="secondary-action" type="button" onclick={refreshProgress}>
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      {:else}
        <div class="state-card" data-progress-state={progressView.state}>
          <div class="state-card-header">
            <div>
              <p class="state-label">Recommended next step</p>
              <h2>{progressView.heading}</h2>
            </div>
            <button
              class="refresh-button"
              type="button"
              onclick={refreshProgress}
              disabled={$progress.loading}
              aria-label={$progress.loading
                ? 'Refreshing saved progress'
                : 'Refresh saved progress'}
            >
              <span class:spinning={$progress.loading}>
                <RefreshCw size={18} />
              </span>
              <span>{$progress.loading ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
          <p>{progressView.description}</p>
          <p class="freshness">
            {#if $progress.error}
              Refresh failed. The last loaded record remains below.
            {:else if $progress.lastUpdatedAt}
              Saved progress loaded.
            {/if}
          </p>
        </div>
      {/if}
    </div>
  </section>

  <section data-performance-chapter="workspace" class="progress-chapter js-progress workspace">
    <div class="chapter-heading">
      <p class="eyebrow">Your record</p>
      <h2>Completed work and remaining lessons.</h2>
    </div>

    {#if initialLoading}
      <p class="workspace-status">Waiting for the saved record.</p>
    {:else if $progress.error && !hasProgressData}
      <p class="workspace-status">Progress evidence is withheld until the saved record loads.</p>
    {:else}
      <dl class="stats-grid" aria-label="Learning progress totals">
        <div class="stat-card">
          <dt>Lessons</dt>
          <dd>{$progress.stats.lessonsCompleted}/{$progress.stats.totalLessons}</dd>
        </div>
        <div class="stat-card">
          <dt>Paths</dt>
          <dd>{$progress.stats.pathsCompleted}/{$progress.stats.totalPaths}</dd>
        </div>
        <div class="stat-card">
          <dt>Complete</dt>
          <dd>{$overallProgress}%</dd>
        </div>
        <div class="stat-card">
          <dt>Learning time</dt>
          <dd>{formatTime($progress.stats.totalTimeSpent)}</dd>
        </div>
      </dl>

      <div
        class="overall-progress"
        role="progressbar"
        aria-label="Overall lesson progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={$overallProgress}
      >
        <div class="progress-bar" style="width: {$overallProgress}%"></div>
      </div>

      <div class="paths-list" aria-label="Progress by learning path">
        {#each $progress.pathProgress as pathProgress}
          {@const path = getPath(pathProgress.pathId)}
          {#if path}
            <article
              class="path-progress-card"
              class:completed={pathProgress.status === 'completed'}
              class:in-progress={pathProgress.status === 'in_progress'}
            >
              <div class="path-header">
                <span class="path-indicator" aria-hidden="true">
                  {#if pathProgress.status === 'completed'}
                    <CheckCircle size={20} strokeWidth={1.5} />
                  {:else if pathProgress.status === 'in_progress'}
                    <Clock size={20} strokeWidth={1.5} />
                  {:else}
                    <Circle size={20} strokeWidth={1.5} />
                  {/if}
                </span>
                <div class="path-info">
                  <h3>{path.title}</h3>
                  <p>{path.subtitle}</p>
                </div>
                <span class="lesson-count">
                  {pathProgress.lessonsCompleted}/{pathProgress.totalLessons}
                </span>
              </div>

              <div class="lesson-progress-bar" aria-hidden="true">
                <div
                  class="lesson-progress-fill"
                  style="width: {pathProgress.totalLessons > 0
                    ? (pathProgress.lessonsCompleted / pathProgress.totalLessons) * 100
                    : 0}%"
                ></div>
              </div>
            </article>
          {/if}
        {/each}
      </div>
    {/if}
  </section>

  <section
    data-performance-chapter="decision-receipt"
    class="progress-chapter js-progress decision-receipt"
  >
    {#if initialLoading}
      <p>Wait for the saved record before choosing a lesson.</p>
    {:else if $progress.error && !hasProgressData}
      <div>
        <p class="eyebrow">Recovery</p>
        <h2>Choose a lesson without claiming progress.</h2>
        <p>The course list remains available while the saved record is unavailable.</p>
        <a class="primary-action" href="/paths">Open the course list</a>
      </div>
    {:else}
      <div>
        <p class="eyebrow">Continue</p>
        <h2>
          {progressView.state === 'complete' ? 'Choose what to practice.' : 'Open the next lesson.'}
        </h2>
        <p>
          {progressView.state === 'complete'
            ? 'Your completion record is intact. Revisit the path that will be most useful now.'
            : 'The selected lesson is the first unfinished step in your saved record.'}
        </p>
        <a class="primary-action" href={progressView.href}>
          {progressView.label}
          <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
    {/if}
  </section>
</div>

<style>
  .progress-page {
    --color-fg-primary: #1a1a1a;
    --color-fg-secondary: rgba(26, 26, 26, 0.8);
    --color-fg-tertiary: rgba(26, 26, 26, 0.62);
    --color-fg-muted: rgba(26, 26, 26, 0.5);
    --color-bg-elevated: #ffffff;
    --color-bg-surface: #e8e8e4;
    --color-border-default: rgba(26, 26, 26, 0.14);
    --color-border-emphasis: #1a1a1a;
    --color-data-1: #155fb8;
    --color-success: #176b43;
    color: var(--color-fg-primary);
  }

  .progress-chapter {
    padding-block: clamp(2.5rem, 7vw, 5rem);
  }

  .progress-chapter + .progress-chapter {
    border-top: 1px solid var(--color-border-default);
  }

  .task-state {
    padding-top: 0;
  }

  .page-header,
  .chapter-heading {
    max-width: 48rem;
  }

  .eyebrow,
  .state-label {
    margin: 0 0 var(--space-sm);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .page-title {
    margin: 0 0 var(--space-sm);
    font-size: var(--text-display);
    font-weight: var(--font-light);
  }

  .page-subtitle {
    margin: 0;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-lg);
  }

  .state-card,
  .noscript-notice {
    margin-top: var(--space-xl);
    padding: clamp(1.25rem, 4vw, 2rem);
    background: #111111;
    border-radius: var(--radius-lg);
    color: #ffffff;
  }

  .state-card h2,
  .noscript-notice h2,
  .decision-receipt h2,
  .chapter-heading h2 {
    margin: 0 0 var(--space-sm);
    font-size: var(--text-h2);
  }

  .state-card p:not(.state-label),
  .noscript-notice p {
    color: rgba(255, 255, 255, 0.74);
  }

  .state-card .state-label {
    color: rgba(255, 255, 255, 0.68);
  }

  .state-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .freshness {
    min-height: 1.5em;
    margin: var(--space-md) 0 0;
    font-size: var(--text-body-sm);
  }

  .refresh-button,
  .secondary-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    min-height: 2.75rem;
    padding: 0 var(--space-sm);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: var(--radius-md);
    color: #ffffff;
  }

  .refresh-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinning {
    display: flex;
    animation: spin 1s linear infinite;
  }

  .workspace-status {
    margin-top: var(--space-xl);
    color: var(--color-fg-secondary);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-sm);
    margin: var(--space-xl) 0 var(--space-md);
  }

  .stat-card {
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-xs);
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .stat-card dt {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .stat-card dd {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--text-h2);
    font-weight: var(--font-light);
  }

  .overall-progress {
    height: 4px;
    margin-bottom: var(--space-xl);
    overflow: hidden;
    background: var(--color-bg-surface);
    border-radius: var(--radius-full);
  }

  .progress-bar {
    height: 100%;
    background: var(--color-fg-primary);
    border-radius: var(--radius-full);
    transition: width var(--duration-complex) var(--ease-standard);
  }

  .paths-list {
    display: grid;
    gap: var(--space-md);
  }

  .path-progress-card {
    display: block;
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    color: var(--color-fg-primary);
  }

  .path-progress-card.in-progress {
    border-color: var(--color-border-emphasis);
  }

  .path-progress-card.completed {
    border-color: var(--color-success);
  }

  .path-header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-sm);
  }

  .path-indicator {
    display: flex;
    color: var(--color-fg-muted);
  }

  .in-progress .path-indicator {
    color: var(--color-data-1);
  }

  .completed .path-indicator {
    color: var(--color-success);
  }

  .path-info h3 {
    margin: 0 0 0.125rem;
    font-size: var(--text-body-lg);
  }

  .path-info p,
  .lesson-count {
    margin: 0;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  .lesson-count {
    font-family: var(--font-mono);
  }

  .lesson-progress-bar {
    height: 2px;
    margin: var(--space-md) 0 0;
    overflow: hidden;
    background: var(--color-bg-surface);
    border-radius: var(--radius-full);
  }

  .lesson-progress-fill {
    height: 100%;
    background: var(--color-fg-primary);
  }

  .decision-receipt {
    max-width: 48rem;
  }

  .decision-receipt p:not(.eyebrow) {
    color: var(--color-fg-secondary);
  }

  .primary-action,
  .noscript-notice a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    margin-top: var(--space-md);
    padding: 0.8rem 1rem;
    background: #111111;
    border-radius: var(--radius-md);
    color: #ffffff;
    font-weight: var(--font-medium);
  }

  .noscript-notice a {
    background: #ffffff;
    color: #111111;
  }

  @media (min-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 540px) {
    .state-card-header {
      flex-direction: column;
    }

    .path-header {
      align-items: start;
    }

    .path-info p {
      max-width: 24ch;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress-bar,
    .path-progress-card {
      transition: none;
    }

    .spinning {
      animation: none;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
