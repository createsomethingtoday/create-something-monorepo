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
  let completionError = $state('');

  // Get progress for this lesson - needs to be derived to react to lesson changes
  let lessonProgress = $derived(getLessonProgress(path.id, lesson.id));

  // Track lesson start when lesson changes
  $effect(() => {
    // Reset state for new lesson
    startTime = Date.now();
    isCompleting = false;
    completionError = '';

    // Public lessons remain readable without calling authenticated progress APIs.
    if (!data.user) return;

    // Mark lesson as started
    progress.startLesson(path.id, lesson.id).catch(() => {
      completionError =
        'Progress could not be saved. The lesson remains available; try again when the connection recovers.';
    });

    // Fetch full progress
    progress.fetch();
  });

  async function handleCompleteLesson() {
    if (isCompleting) return;

    isCompleting = true;
    completionError = '';
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
      completionError =
        'Progress could not be saved. The lesson remains available; try again or continue without saving.';
      isCompleting = false;
    }
  }
</script>

<svelte:head>
  <title>{lesson.title} — {path.title} — CREATE SOMETHING LMS</title>
</svelte:head>

<div class="lesson-shell">
  <section class="lesson-opening" aria-labelledby="lesson-title">
    <div class="breadcrumb">
      <a href="/paths" class="breadcrumb-link">Paths</a>
      <span class="breadcrumb-separator">/</span>
      <a href="/paths/{path.id}" class="breadcrumb-link">{path.title}</a>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">{lesson.title}</span>
    </div>

    <div class="progress-container" aria-label={`Lesson ${lessonNumber} of ${totalLessons}`}>
      <div class="progress-bar" style="width: {(lessonNumber / totalLessons) * 100}%"></div>
    </div>

    <header>
      <div class="flex items-center gap-3 mb-4">
        <div class="path-dot {path.color}"></div>
        <span class="lesson-meta">Lesson {lessonNumber} of {totalLessons}</span>
        <span class="lesson-meta">•</span>
        <span class="lesson-meta">{lesson.duration}</span>
      </div>

      <h1 id="lesson-title" class="lesson-title">{lesson.title}</h1>
      <p class="lesson-description">{lesson.description}</p>
    </header>
  </section>

  <!-- Lesson Content -->
  <article class="lesson-content">
    {#if content}
      <div class="prose">
        {@html content}
      </div>
    {:else}
      <div class="placeholder-content">
        <h2>Coming Soon</h2>
        <p>
          This lesson's content is being developed. For now, you can navigate through the lesson
          structure to understand the path architecture.
        </p>

        <h3>What you'll learn:</h3>
        <p>{lesson.description}</p>
      </div>
    {/if}
  </article>

  <section class="lesson-handoff" aria-labelledby="lesson-handoff-title">
    <header class="handoff-heading">
      <span>Next step</span>
      <h2 id="lesson-handoff-title">
        {nextLesson ? 'Continue to the next objective.' : 'Close the path with a receipt.'}
      </h2>
    </header>

    {#if completionError}
      <div class="completion-error" role="alert">
        <p>{completionError}</p>
        {#if data.user}
          <button type="button" onclick={handleCompleteLesson}>Try saving again</button>
        {/if}
      </div>
    {/if}

    <div class="handoff-primary">
      {#if data.user}
        {#if $lessonProgress?.status === 'completed'}
          <div class="completed-indicator">
            <CheckCircle size={20} />
            <span>Lesson completed</span>
          </div>
          {#if nextLesson}
            <a href="/paths/{path.id}/{nextLesson.id}" class="btn-primary">
              Continue to next lesson <ChevronRight size={18} />
            </a>
          {:else}
            <a href="/paths/{path.id}" class="btn-primary">View path overview</a>
          {/if}
        {:else}
          <button class="btn-primary" onclick={handleCompleteLesson} disabled={isCompleting}>
            {isCompleting
              ? 'Completing...'
              : nextLesson
                ? 'Complete & Continue'
                : 'Complete Lesson'}
          </button>
        {/if}
      {:else}
        {#if nextLesson}
          <a href="/paths/{path.id}/{nextLesson.id}" class="btn-primary">
            Continue to next lesson <ChevronRight size={18} />
          </a>
        {:else}
          <a href="/paths/{path.id}" class="btn-primary">View path overview</a>
        {/if}
        <a
          href={`/login?redirect=${encodeURIComponent(`/paths/${path.id}/${lesson.id}`)}`}
          class="btn-secondary">Sign in to save progress</a
        >
      {/if}
    </div>

    <nav class="handoff-secondary" aria-label="Lesson navigation">
      {#if previousLesson}
        <a href="/paths/{path.id}/{previousLesson.id}" class="nav-button">
          <ChevronLeft size={18} />
          <span><small>Previous lesson</small>{previousLesson.title}</span>
        </a>
      {/if}
      <a href="/paths/{path.id}" class="nav-button">
        <span><small>Path index</small>All lessons</span>
      </a>
    </nav>
  </section>
</div>

<style>
  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: var(--space-md);
    font-size: var(--text-body-sm);
  }

  .breadcrumb-link {
    color: var(--color-performance-muted, #5e6268);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .breadcrumb-link:hover {
    color: var(--color-performance-ink, #090909);
  }

  .breadcrumb-separator {
    color: var(--color-performance-muted, #5e6268);
  }

  .breadcrumb-current {
    color: var(--color-performance-ink, #090909);
  }

  .progress-container {
    height: 2px;
    background: var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-full);
    margin-bottom: var(--space-lg);
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--color-performance-ink, #090909);
    transition: width var(--duration-complex) var(--ease-standard);
  }

  .path-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .lesson-meta {
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-body-sm);
  }

  .lesson-title {
    color: var(--color-performance-ink, #090909);
    font-size: var(--text-display);
    font-weight: var(--font-medium);
    line-height: 0.98;
    letter-spacing: 0;
    margin-bottom: var(--space-sm);
  }

  .lesson-description {
    max-width: 48rem;
    font-size: var(--text-body-lg);
    color: var(--color-performance-muted, #5e6268);
    line-height: var(--leading-relaxed);
  }

  .lesson-shell {
    width: min(56rem, calc(100% - 2.5rem));
    margin-inline: auto;
    padding: clamp(3rem, 8vw, 5rem) 0 clamp(4rem, 8vw, 6rem);
    color: var(--color-performance-ink, #090909);
  }

  .lesson-content {
    margin-bottom: var(--space-2xl);
  }

  .placeholder-content {
    padding: var(--space-xl);
    border-radius: var(--radius-performance-md, 4px);
    background: var(--color-performance-panel, #ffffff);
    border: 1px solid var(--color-performance-line, #d7d7d2);
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
    color: var(--color-performance-muted, #5e6268);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-md);
  }

  /* Prose styles for rendered markdown */
  .prose {
    font-size: var(--text-body);
    line-height: var(--leading-relaxed);
    color: var(--color-performance-ink, #090909);
  }

  .prose :global(h1) {
    font-size: var(--text-h1);
    font-weight: var(--font-medium);
    color: var(--color-performance-ink, #090909);
    margin: var(--space-xl) 0 var(--space-md);
  }

  .prose :global(h1:first-child) {
    display: none;
  }

  .prose :global(h2) {
    font-size: var(--text-h2);
    font-weight: var(--font-medium);
    color: var(--color-performance-ink, #090909);
    margin: var(--space-lg) 0 var(--space-sm);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .prose :global(h2:first-child) {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .prose :global(h3) {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    color: var(--color-performance-ink, #090909);
    margin: var(--space-md) 0 var(--space-sm);
  }

  .prose :global(p) {
    margin-bottom: var(--space-md);
  }

  .prose :global(strong) {
    color: var(--color-performance-ink, #090909);
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
    border-left: 3px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-muted, #5e6268);
  }

  .prose :global(.learning-figure) {
    display: grid;
    gap: var(--space-sm);
    margin: var(--space-lg) 0;
    padding: var(--space-md);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-md, 4px);
    background: var(--color-performance-panel, #ffffff);
  }

  .prose :global(.learning-figure picture) {
    display: block;
    width: 100%;
  }

  .prose :global(.learning-figure img) {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .prose :global(.learning-figure figcaption) {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-body-sm);
    line-height: var(--leading-relaxed);
  }

  @media (max-width: 640px) {
    .prose :global(.learning-figure) {
      gap: var(--space-xs);
      padding: var(--space-sm);
    }
  }

  .prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    padding: 0.2em 0.4em;
    background: var(--color-performance-court, #e6e6e0);
    border-radius: var(--radius-performance-sm, 4px);
    color: var(--color-performance-ink, #090909);
    overflow-wrap: anywhere;
  }

  .prose :global(pre) {
    margin: var(--space-md) 0;
    padding: var(--space-md);
    background: var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-md, 4px);
    overflow-x: auto;
  }

  .prose :global(pre code) {
    padding: 0;
    background: none;
    color: #ffffff;
    overflow-wrap: normal;
  }

  .prose :global(table) {
    width: 100%;
    margin: var(--space-md) 0;
    border-collapse: collapse;
    table-layout: fixed;
    background: var(--color-performance-panel, #ffffff);
  }

  .prose :global(th),
  .prose :global(td) {
    padding: var(--space-sm);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    text-align: left;
    overflow-wrap: anywhere;
  }

  .prose :global(th) {
    background: var(--color-performance-court, #e6e6e0);
    font-weight: var(--font-semibold);
    color: var(--color-performance-ink, #090909);
  }

  .prose :global(hr) {
    margin: var(--space-lg) 0;
    border: none;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .prose :global(a) {
    color: var(--color-performance-signal, #0057b8);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .prose :global(a:hover) {
    color: var(--color-performance-ink, #090909);
  }

  .lesson-opening {
    display: grid;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
    padding: 0;
  }

  .lesson-opening header {
    display: grid;
    gap: var(--space-sm);
  }

  .lesson-handoff {
    display: grid;
    gap: var(--space-lg);
    margin-top: var(--space-xl);
    padding: clamp(1.25rem, 4vw, 2rem);
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
  }

  .handoff-heading {
    display: grid;
    gap: 0.55rem;
  }

  .handoff-heading > span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
  }

  .handoff-heading h2 {
    max-width: 24ch;
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: var(--text-h2);
    font-weight: var(--font-medium);
    line-height: var(--leading-tight);
  }

  .handoff-primary,
  .handoff-secondary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    align-items: center;
  }

  .handoff-secondary {
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .completion-error {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm);
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    color: var(--color-performance-ink, #090909);
  }

  .completion-error p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
  }

  .completion-error button {
    flex: 0 0 auto;
    font-weight: var(--font-semibold);
    text-decoration: underline;
  }

  .nav-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-width: min(100%, 14rem);
    padding: var(--space-sm);
    border-radius: var(--radius-performance-md, 4px);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
    transition:
      background var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard);
  }

  .nav-button:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-court, #e6e6e0);
  }

  .nav-button span {
    display: grid;
    gap: 0.2rem;
    color: var(--color-performance-ink, #090909);
    font-size: var(--text-body-sm);
  }

  .nav-button small {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    text-transform: uppercase;
  }

  .btn-primary {
    display: inline-flex;
    gap: var(--space-xs);
    align-items: center;
    justify-content: center;
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-performance-sm, 4px);
    border: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
    font-size: var(--text-body);
    font-weight: var(--font-medium);
    transition:
      background var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard);
  }

  .btn-primary:hover:not(:disabled) {
    background: #1a2030;
    border-color: #1a2030;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-ink, #090909);
    font-size: var(--text-body);
    font-weight: var(--font-medium);
    transition:
      background var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard);
  }

  .btn-secondary:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-court, #e6e6e0);
  }

  .completed-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-success);
    font-size: var(--text-body);
    margin-bottom: var(--space-md);
  }

  @media (max-width: 640px) {
    .handoff-primary,
    .handoff-secondary,
    .completion-error {
      align-items: stretch;
      flex-direction: column;
    }

    .btn-primary,
    .btn-secondary,
    .nav-button {
      width: 100%;
    }
  }
</style>
