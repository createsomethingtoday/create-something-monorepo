<script lang="ts">
  import type { PageData } from './$types';
  import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-svelte';
  import { progress, getLessonProgress } from '$lib/stores/progress';
  import { onMount } from 'svelte';

  let { data }: { data: PageData } = $props();
  const { path, lesson, lessonNumber, totalLessons, previousLesson, nextLesson } = data;

  // Track time spent on this lesson
  let startTime = 0;
  let isCompleting = false;

  // Get progress for this lesson
  const lessonProgress = getLessonProgress(path.id, lesson.id);

  onMount(() => {
    startTime = Date.now();

    // Mark lesson as started
    progress.startLesson(path.id, lesson.id).catch((err) => {
      console.error('Failed to track lesson start:', err);
    });

    // Fetch full progress on mount
    progress.fetch();

    return () => {
      // Cleanup
    };
  });

  async function handleCompleteLesson() {
    if (isCompleting) return;

    isCompleting = true;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await progress.completeLesson(path.id, lesson.id, timeSpent);

      if (result.pathCompleted) {
        // Show celebration or path completion modal
        console.log('Path completed!');
      }

      // Navigate to next lesson or back to path
      if (nextLesson) {
        window.location.href = `/paths/${path.id}/${nextLesson.id}`;
      } else {
        window.location.href = `/paths/${path.id}`;
      }
    } catch (err) {
      console.error('Failed to complete lesson:', err);
      isCompleting = false;
    }
  }
</script>

<svelte:head>
  <title>{lesson.title} — {path.title} — CREATE SOMETHING LMS</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
  <!-- Breadcrumb -->
  <div class="breadcrumb">
    <a href="/paths" class="breadcrumb-link">Paths</a>
    <span class="breadcrumb-separator">/</span>
    <a href="/paths/{path.id}" class="breadcrumb-link">{path.title}</a>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-current">{lesson.title}</span>
  </div>

  <!-- Progress Bar -->
  <div class="progress-container">
    <div
      class="progress-bar"
      style="width: {(lessonNumber / totalLessons) * 100}%"
    ></div>
  </div>

  <!-- Lesson Header -->
  <div class="mb-12">
    <div class="flex items-center gap-3 mb-4">
      <div class="path-dot {path.color}"></div>
      <span class="lesson-meta">Lesson {lessonNumber} of {totalLessons}</span>
      <span class="lesson-meta">•</span>
      <span class="lesson-meta">{lesson.duration}</span>
    </div>

    <h1 class="lesson-title">{lesson.title}</h1>
    <p class="lesson-description">{lesson.description}</p>
  </div>

  <!-- Lesson Content -->
  <article class="lesson-content">
    <!-- TODO: This will be replaced with actual markdown content -->
    <div class="placeholder-content">
      <h2>Coming Soon</h2>
      <p>
        This lesson's content is being developed. For now, you can navigate through the lesson structure
        to understand the path architecture.
      </p>

      <h3>What you'll learn:</h3>
      <p>{lesson.description}</p>

      {#if lesson.praxis}
        <div class="praxis-callout">
          <h3>Praxis Exercise</h3>
          <p>This lesson includes a hands-on exercise: <strong>{lesson.praxis}</strong></p>
          <p>Complete the exercise to deepen your understanding through practice.</p>
        </div>
      {/if}
    </div>
  </article>

  <!-- Navigation Footer -->
  <div class="lesson-nav">
    <!-- Previous Lesson -->
    {#if previousLesson}
      <a href="/paths/{path.id}/{previousLesson.id}" class="nav-button prev">
        <div class="nav-arrow"><ChevronLeft size={24} /></div>
        <div class="flex-1">
          <div class="nav-label">Previous</div>
          <div class="nav-title">{previousLesson.title}</div>
        </div>
      </a>
    {:else}
      <div class="nav-spacer"></div>
    {/if}

    <!-- Back to Path -->
    <a href="/paths/{path.id}" class="nav-button center">
      <div class="nav-label">All Lessons</div>
    </a>

    <!-- Next Lesson -->
    {#if nextLesson}
      <a href="/paths/{path.id}/{nextLesson.id}" class="nav-button next">
        <div class="flex-1 text-right">
          <div class="nav-label">Next</div>
          <div class="nav-title">{nextLesson.title}</div>
        </div>
        <div class="nav-arrow"><ChevronRight size={24} /></div>
      </a>
    {:else}
      <div class="nav-spacer"></div>
    {/if}
  </div>

  <!-- Completion Action -->
  <div class="completion-section">
    {#if $lessonProgress?.status === 'completed'}
      <div class="completed-indicator">
        <CheckCircle size={20} />
        <span>Lesson Completed</span>
      </div>
      {#if nextLesson}
        <a href="/paths/{path.id}/{nextLesson.id}" class="btn-primary">
          Continue to Next Lesson
        </a>
      {:else}
        <a href="/paths/{path.id}" class="btn-secondary">
          View Path Overview
        </a>
      {/if}
    {:else}
      <button
        class="btn-primary"
        onclick={handleCompleteLesson}
        disabled={isCompleting}
      >
        {isCompleting ? 'Completing...' : nextLesson ? 'Complete & Continue' : 'Complete Lesson'}
      </button>
    {/if}
  </div>
</div>

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: var(--space-md);
    font-size: var(--text-body-sm);
  }

  .breadcrumb-link {
    color: var(--color-fg-tertiary);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .breadcrumb-link:hover {
    color: var(--color-fg-secondary);
  }

  .breadcrumb-separator {
    color: var(--color-fg-muted);
  }

  .breadcrumb-current {
    color: var(--color-fg-secondary);
  }

  .progress-container {
    height: 2px;
    background: var(--color-bg-surface);
    border-radius: var(--radius-full);
    margin-bottom: var(--space-lg);
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--color-fg-primary);
    transition: width var(--duration-complex) var(--ease-standard);
  }

  .path-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .lesson-meta {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .lesson-title {
    font-size: var(--text-display);
    font-weight: 300;
    margin-bottom: var(--space-sm);
  }

  .lesson-description {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: 1.6;
  }

  .lesson-content {
    margin-bottom: var(--space-2xl);
  }

  .placeholder-content {
    padding: var(--space-xl);
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
  }

  .placeholder-content h2 {
    font-size: var(--text-h2);
    margin-bottom: var(--space-md);
  }

  .placeholder-content h3 {
    font-size: var(--text-h3);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  .placeholder-content p {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    line-height: 1.6;
    margin-bottom: var(--space-md);
  }

  .praxis-callout {
    margin-top: var(--space-lg);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background: rgba(96, 165, 250, 0.05);
    border: 1px solid rgba(96, 165, 250, 0.2);
  }

  .praxis-callout h3 {
    color: var(--color-data-1);
    margin-top: 0;
  }

  .lesson-nav {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
    padding-top: var(--space-xl);
    border-top: 1px solid var(--color-border-default);
  }

  .nav-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .nav-button:hover {
    border-color: var(--color-border-emphasis);
  }

  .nav-button.center {
    justify-content: center;
  }

  .nav-spacer {
    /* Empty spacer for grid alignment */
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    color: var(--color-fg-muted);
  }

  .nav-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .nav-title {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .completion-section {
    display: flex;
    justify-content: center;
    padding: var(--space-lg) 0;
  }

  .btn-primary {
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-size: var(--text-body);
    font-weight: 500;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    font-weight: 500;
    transition: border-color var(--duration-micro) var(--ease-standard);
    margin-left: var(--space-md);
  }

  .btn-secondary:hover {
    border-color: var(--color-border-emphasis);
  }

  .completed-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-success);
    font-size: var(--text-body);
    margin-bottom: var(--space-md);
  }

  .text-right {
    text-align: right;
  }
</style>
