<script lang="ts">
  import type { PageData } from './$types';
  import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-svelte';
  import { progress, getLessonProgress } from '$lib/stores/progress';

  let { data }: { data: PageData } = $props();

  // Derived values for reactivity when navigating between lessons
  let path = $derived(data.path);
  let lesson = $derived(data.lesson);
  let lessonNumber = $derived(data.lessonNumber);
  let totalLessons = $derived(data.totalLessons);
  let previousLesson = $derived(data.previousLesson);
  let nextLesson = $derived(data.nextLesson);
  let content = $derived(data.content);

  // Track time spent on this lesson
  let startTime = $state(0);
  let isCompleting = $state(false);

  // Get progress for this lesson - needs to be derived to react to lesson changes
  let lessonProgress = $derived(getLessonProgress(path.id, lesson.id));

  // Track lesson start when lesson changes
  $effect(() => {
    // Reset state for new lesson
    startTime = Date.now();
    isCompleting = false;

    // Mark lesson as started
    progress.startLesson(path.id, lesson.id).catch((err) => {
      console.error('Failed to track lesson start:', err);
    });

    // Fetch full progress
    progress.fetch();
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
    {#if content}
      <div class="prose">
        {@html content}
      </div>

      {#if lesson.praxis}
        <div class="praxis-callout">
          <h3>Praxis Exercise</h3>
          <p>This lesson includes a hands-on exercise: <strong>{lesson.praxis}</strong></p>
          <a href="/praxis/{lesson.praxis}" class="praxis-link">Start Exercise →</a>
        </div>
      {/if}
    {:else}
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
    {/if}
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
    font-weight: var(--font-light);
    margin-bottom: var(--space-sm);
  }

  .lesson-description {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
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
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-md);
  }

  /* Prose styles for rendered markdown */
  .prose {
    font-size: var(--text-body);
    line-height: var(--leading-relaxed);
    color: var(--color-fg-secondary);
  }

  .prose :global(h1) {
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: var(--space-xl) 0 var(--space-md);
  }

  .prose :global(h2) {
    font-size: var(--text-h2);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: var(--space-lg) 0 var(--space-sm);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border-default);
  }

  .prose :global(h2:first-child) {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .prose :global(h3) {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: var(--space-md) 0 var(--space-sm);
  }

  .prose :global(p) {
    margin-bottom: var(--space-md);
  }

  .prose :global(strong) {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  .prose :global(ul),
  .prose :global(ol) {
    margin: var(--space-md) 0;
    padding-left: var(--space-lg);
  }

  .prose :global(li) {
    margin-bottom: var(--space-xs);
  }

  .prose :global(blockquote) {
    margin: var(--space-md) 0;
    padding: var(--space-md);
    border-left: 3px solid var(--color-border-emphasis);
    background: var(--color-bg-elevated);
    font-style: italic;
    color: var(--color-fg-tertiary);
  }

  .prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    padding: 0.2em 0.4em;
    background: var(--color-bg-surface);
    border-radius: var(--radius-sm);
  }

  .prose :global(pre) {
    margin: var(--space-md) 0;
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    overflow-x: auto;
  }

  .prose :global(pre code) {
    padding: 0;
    background: none;
  }

  .prose :global(table) {
    width: 100%;
    margin: var(--space-md) 0;
    border-collapse: collapse;
  }

  .prose :global(th),
  .prose :global(td) {
    padding: var(--space-sm);
    border: 1px solid var(--color-border-default);
    text-align: left;
  }

  .prose :global(th) {
    background: var(--color-bg-elevated);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
  }

  .prose :global(hr) {
    margin: var(--space-lg) 0;
    border: none;
    border-top: 1px solid var(--color-border-default);
  }

  .prose :global(a) {
    color: var(--color-data-1);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .prose :global(a:hover) {
    color: var(--color-fg-primary);
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
    font-size: var(--text-h3);
    margin-bottom: var(--space-sm);
  }

  .praxis-link {
    display: inline-block;
    margin-top: var(--space-sm);
    color: var(--color-data-1);
    font-weight: var(--font-medium);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .praxis-link:hover {
    color: var(--color-fg-primary);
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
    font-weight: var(--font-medium);
    transition: background var(--duration-micro) var(--ease-standard);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-fg-secondary);
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
    font-weight: var(--font-medium);
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
