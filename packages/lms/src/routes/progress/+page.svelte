<script lang="ts">
  /**
   * Progress Page
   *
   * Shows the learner's journey through the hermeneutic spiral.
   * Canon: Progress is not linear—each return deepens understanding.
   */

  import type { PageData } from './$types';
  import { PATHS } from '$content/paths';
  import { CheckCircle, Circle, Clock, BookOpen, ArrowRight, RefreshCw } from 'lucide-svelte';
  import { progress, overallProgress } from '$lib/stores/progress';
  import { onMount } from 'svelte';

  let { data }: { data: PageData } = $props();
  const { user } = data;

  // Use store for reactive progress data
  onMount(() => {
    progress.fetch();
  });

  // Helper to get path info
  function getPath(pathId: string) {
    return PATHS.find((p) => p.id === pathId);
  }

  // Format time spent
  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  // Refresh progress
  async function refreshProgress() {
    await progress.fetch();
  }
</script>

<svelte:head>
  <title>Your Progress | CREATE SOMETHING LMS</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-6 py-16">
  <!-- Header -->
  <header class="mb-12">
    <div class="flex items-center justify-between mb-4">
      <h1 class="page-title">Your Progress</h1>
      <button
        class="refresh-button"
        onclick={refreshProgress}
        disabled={$progress.loading}
        title="Refresh progress"
      >
        <span class:spinning={$progress.loading}>
          <RefreshCw size={20} />
        </span>
      </button>
    </div>
    <p class="page-subtitle">
      Welcome back{user?.name ? `, ${user.name}` : ''}. Continue your journey.
    </p>
  </header>

  <!-- Stats Overview -->
  <section class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{$progress.stats.pathsCompleted}/{$progress.stats.totalPaths}</div>
      <div class="stat-label">Paths Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{$progress.stats.lessonsCompleted}/{$progress.stats.totalLessons}</div>
      <div class="stat-label">Lessons Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{$overallProgress}%</div>
      <div class="stat-label">Overall Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{formatTime($progress.stats.totalTimeSpent)}</div>
      <div class="stat-label">Time Learning</div>
    </div>
  </section>

  <!-- Overall Progress Bar -->
  <div class="overall-progress">
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: {$overallProgress}%"></div>
    </div>
  </div>

  <!-- Path Progress -->
  <section class="paths-section">
    <h2 class="section-title">Learning Paths</h2>

    <div class="paths-list">
      {#each $progress.pathProgress as pathProg}
        {@const path = getPath(pathProg.pathId)}
        {#if path}
          <a
            href="/paths/{path.id}"
            class="path-progress-card {path.color}"
            class:completed={pathProg.status === 'completed'}
            class:in-progress={pathProg.status === 'in_progress'}
          >
            <div class="path-header">
              <div class="path-indicator">
                {#if pathProg.status === 'completed'}
                  <CheckCircle size={20} strokeWidth={1.5} />
                {:else if pathProg.status === 'in_progress'}
                  <Clock size={20} strokeWidth={1.5} />
                {:else}
                  <Circle size={20} strokeWidth={1.5} />
                {/if}
              </div>
              <div class="path-info">
                <h3 class="path-name">{path.title}</h3>
                <p class="path-sub">{path.subtitle}</p>
              </div>
              <div class="path-stats">
                <span class="lesson-count">
                  {pathProg.lessonsCompleted}/{pathProg.totalLessons}
                </span>
              </div>
            </div>

            <!-- Lesson Progress Bar -->
            <div class="lesson-progress-bar">
              <div
                class="lesson-progress-fill"
                style="width: {pathProg.totalLessons > 0
                  ? (pathProg.lessonsCompleted / pathProg.totalLessons) * 100
                  : 0}%"
              ></div>
            </div>

            <!-- Continue CTA for in-progress paths -->
            {#if pathProg.status === 'in_progress' && pathProg.currentLesson}
              <div class="continue-cta">
                <span>Continue: {pathProg.currentLesson}</span>
                <ArrowRight size={16} />
              </div>
            {:else if pathProg.status === 'not_started'}
              <div class="start-cta">
                <span>Start Path</span>
                <ArrowRight size={16} />
              </div>
            {:else if pathProg.status === 'completed'}
              <div class="completed-label">
                <span>Completed</span>
                <CheckCircle size={16} />
              </div>
            {/if}
          </a>
        {/if}
      {/each}
    </div>
  </section>

  <!-- Empty State -->
  {#if $progress.stats.lessonsCompleted === 0}
    <section class="empty-state">
      <div class="empty-icon"><BookOpen size={48} strokeWidth={1} /></div>
      <h3>Begin Your Journey</h3>
      <p>
        Start with <a href="/paths/foundations">Foundations</a> to learn the Subtractive Triad—the
        philosophical core of CREATE SOMETHING.
      </p>
    </section>
  {/if}
</div>

<style>
  .page-title {
    font-size: var(--text-display);
    font-weight: var(--font-light);
    margin-bottom: var(--space-xs);
  }

  .page-subtitle {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-lg);
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }

  @media (min-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .stat-card {
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .stat-value {
    font-size: var(--text-h2);
    font-weight: var(--font-light);
    margin-bottom: var(--space-xs);
  }

  .stat-label {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Overall Progress */
  .overall-progress {
    margin-bottom: var(--space-xl);
  }

  .progress-bar-container {
    height: 4px;
    background: var(--color-bg-surface);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--color-fg-primary);
    border-radius: var(--radius-full);
    transition: width var(--duration-complex) var(--ease-standard);
  }

  /* Paths Section */
  .paths-section {
    margin-top: var(--space-xl);
  }

  .section-title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-lg);
  }

  .paths-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .path-progress-card {
    display: block;
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .path-progress-card:hover {
    border-color: var(--color-border-emphasis);
  }

  .path-progress-card.completed {
    border-color: var(--color-success);
    border-width: 1px;
  }

  .path-progress-card.in-progress {
    border-color: var(--color-border-emphasis);
  }

  .path-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .path-indicator {
    color: var(--color-fg-muted);
    display: flex;
    align-items: center;
  }

  .path-progress-card.completed .path-indicator {
    color: var(--color-success);
  }

  .path-progress-card.in-progress .path-indicator {
    color: var(--color-data-1);
  }

  .path-info {
    flex: 1;
  }

  .path-name {
    font-size: var(--text-body-lg);
    font-weight: var(--font-medium);
    margin-bottom: 0.125rem;
  }

  .path-sub {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  .path-stats {
    text-align: right;
  }

  .lesson-count {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-family: var(--font-mono);
  }

  /* Lesson Progress Bar */
  .lesson-progress-bar {
    height: 2px;
    background: var(--color-bg-surface);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: var(--space-sm);
  }

  .lesson-progress-fill {
    height: 100%;
    background: var(--path-color, var(--color-fg-secondary));
    transition: width var(--duration-complex) var(--ease-standard);
  }

  /* CTAs */
  .continue-cta,
  .start-cta,
  .completed-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-body-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border-default);
  }

  .continue-cta {
    color: var(--color-data-1);
  }

  .start-cta {
    color: var(--color-fg-muted);
  }

  .completed-label {
    color: var(--color-success);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--space-2xl) var(--space-xl);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    margin-top: var(--space-xl);
  }

  .empty-icon {
    color: var(--color-fg-muted);
    margin-bottom: var(--space-md);
  }

  .empty-state h3 {
    font-size: var(--text-h3);
    margin-bottom: var(--space-sm);
  }

  .empty-state p {
    color: var(--color-fg-secondary);
    max-width: 32rem;
    margin: 0 auto;
  }

  .empty-state a {
    color: var(--color-fg-primary);
    text-decoration: underline;
  }

  /* Refresh Button */
  .refresh-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    color: var(--color-fg-secondary);
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .refresh-button:hover:not(:disabled) {
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .refresh-button:disabled {
    color: var(--color-fg-muted);
    cursor: not-allowed;
  }

  .refresh-button .spinning {
    animation: spin 1s linear infinite;
    display: flex;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
