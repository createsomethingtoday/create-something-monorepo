<script lang="ts">
  import { ArrowLeft, ArrowRight, Terminal, Eye } from 'lucide-svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  
  // Use $derived so values update when navigating between lessons
  const lesson = $derived(data.lesson);
  const content = $derived(data.content);
  const prev = $derived(data.prev);
  const next = $derived(data.next);
  const lessonIndex = $derived(data.lessonIndex);
  const totalLessons = $derived(data.totalLessons);
</script>

<svelte:head>
  <title>{lesson.title} | Seeing | CREATE SOMETHING</title>
  <meta name="description" content={lesson.description} />
</svelte:head>

<article class="max-w-3xl mx-auto px-6 py-12">
  <!-- Breadcrumb -->
  <nav class="breadcrumb">
    <a href="/seeing" class="breadcrumb-link">
      <Eye size={16} />
      Seeing
    </a>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-current">Lesson {lessonIndex + 1}</span>
  </nav>

  <!-- Header -->
  <header class="lesson-header">
    <div class="lesson-meta">
      <span class="lesson-number">Lesson {lessonIndex + 1} of {totalLessons}</span>
      <span class="lesson-duration">{lesson.duration}</span>
    </div>
    <h1 class="lesson-title">{lesson.title}</h1>
    <p class="lesson-description">{lesson.description}</p>
  </header>

  <!-- Content -->
  <div class="prose lesson-content">
    {@html content}
  </div>

  <!-- Practice CTA -->
  <aside class="practice-cta">
    <div class="practice-icon">
      <Terminal size={24} />
    </div>
    <div class="practice-content">
      <h3>Practice in Gemini CLI</h3>
      <p>Reading is the beginning. Practice develops perception.</p>
      <code>/lesson {lesson.id}</code>
    </div>
  </aside>

  <!-- Navigation -->
  <nav class="lesson-nav">
    {#if prev}
      <a href="/seeing/{prev.id}" class="nav-link nav-prev">
        <ArrowLeft size={16} />
        <div>
          <span class="nav-label">Previous</span>
          <span class="nav-title">{prev.title}</span>
        </div>
      </a>
    {:else}
      <div></div>
    {/if}

    {#if next}
      <a href="/seeing/{next.id}" class="nav-link nav-next">
        <div>
          <span class="nav-label">Next</span>
          <span class="nav-title">{next.title}</span>
        </div>
        <ArrowRight size={16} />
      </a>
    {:else}
      <a href="/seeing#install" class="nav-link nav-next graduation">
        <div>
          <span class="nav-label">Ready to practice?</span>
          <span class="nav-title">Install Seeing</span>
        </div>
        <ArrowRight size={16} />
      </a>
    {/if}
  </nav>
</article>

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: var(--space-lg);
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .breadcrumb-link {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-fg-secondary);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .breadcrumb-link:hover {
    color: var(--color-fg-primary);
  }

  .breadcrumb-separator {
    color: var(--color-fg-muted);
  }

  .lesson-header {
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border-default);
  }

  .lesson-meta {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .lesson-number {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lesson-duration {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
  }

  .lesson-title {
    font-size: var(--text-h1);
    margin-bottom: var(--space-sm);
  }

  .lesson-description {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }

  /* Prose styles for markdown content */
  .lesson-content :global(h2) {
    font-size: var(--text-h2);
    margin-top: var(--space-xl);
    margin-bottom: var(--space-md);
  }

  .lesson-content :global(h3) {
    font-size: var(--text-h3);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  .lesson-content :global(p) {
    margin-bottom: var(--space-md);
    line-height: var(--leading-relaxed);
  }

  .lesson-content :global(ul),
  .lesson-content :global(ol) {
    margin-bottom: var(--space-md);
    padding-left: var(--space-lg);
  }

  .lesson-content :global(li) {
    margin-bottom: var(--space-xs);
  }

  .lesson-content :global(blockquote) {
    margin: var(--space-lg) 0;
    padding: var(--space-md);
    padding-left: var(--space-lg);
    border-left: 3px solid var(--color-accent-emphasis);
    background: var(--color-bg-elevated);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    font-style: italic;
    color: var(--color-fg-secondary);
  }

  .lesson-content :global(code) {
    padding: 2px 6px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .lesson-content :global(pre) {
    margin: var(--space-md) 0;
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    overflow-x: auto;
  }

  .lesson-content :global(pre code) {
    padding: 0;
    background: none;
  }

  .lesson-content :global(strong) {
    font-weight: var(--font-semibold);
  }

  .lesson-content :global(hr) {
    margin: var(--space-xl) 0;
    border: none;
    border-top: 1px solid var(--color-border-default);
  }

  /* Practice CTA */
  .practice-cta {
    display: flex;
    gap: var(--space-md);
    margin: var(--space-xl) 0;
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .practice-icon {
    color: var(--color-fg-secondary);
  }

  .practice-content h3 {
    font-size: var(--text-body-lg);
    margin-bottom: var(--space-xs);
  }

  .practice-content p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin-bottom: var(--space-sm);
  }

  .practice-content code {
    display: inline-block;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
  }

  /* Navigation */
  .lesson-nav {
    display: flex;
    justify-content: space-between;
    gap: var(--space-md);
    margin-top: var(--space-xl);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border-default);
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: border-color var(--duration-micro) var(--ease-standard);
    max-width: 45%;
  }

  .nav-link:hover {
    border-color: var(--color-border-emphasis);
  }

  .nav-prev {
    text-align: left;
  }

  .nav-next {
    text-align: right;
    margin-left: auto;
  }

  .nav-label {
    display: block;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .nav-title {
    display: block;
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
  }

  .graduation {
    background: var(--color-accent-subtle);
    border-color: var(--color-accent-emphasis);
  }
</style>
